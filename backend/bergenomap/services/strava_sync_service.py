from __future__ import annotations

"""
Strava synchronization service.

This module orchestrates:
- token refresh
- cached activity listing
- importing selected activities as GPX bytes stored in our DB

This module must stay independent of Flask request globals.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import xml.etree.ElementTree as ET
from typing import Any, Dict, Iterable

from Database import Database
from bergenomap.integrations.strava_client import StravaClient, StravaApiError
from bergenomap.repositories import strava_repo
from bergenomap.services.track_service import compute_gpx_bounds
from gpx_parser import parse_strava_gpx


STRAVA_CLIENT_ID_KEY = "STRAVA_CLIENT_ID"
STRAVA_CLIENT_SECRET_KEY = "STRAVA_CLIENT_SECRET"

# Mapping of Strava workout_type integer to human-readable text
# Only these values are stored; others are left as NULL
WORKOUT_TYPE_MAP = {
    0: "Default run",
    1: "Race",
    2: "Long run",
    3: "Workout",
    10: "Default ride",
    11: "Race ride",
    12: "Workout ride",
}


def map_workout_type(workout_type_raw: int | None) -> str | None:
    """
    Map Strava's numeric workout_type to a human-readable string.
    Returns None if the value is not in our known mapping.
    """
    if workout_type_raw is None:
        return None
    return WORKOUT_TYPE_MAP.get(workout_type_raw)


@dataclass(frozen=True)
class ImportResult:
    imported: list[dict]
    failed: list[dict]
    skipped: list[dict]


def ensure_valid_access_token(db: Database, username: str, *, client: StravaClient) -> str:
    conn = strava_repo.get_connection(db, username)
    if not conn or conn.get("revoked_at"):
        raise ValueError("Strava is not connected for this user.")

    access_token = conn.get("access_token")
    refresh_token = conn.get("refresh_token")
    expires_at = conn.get("expires_at")

    if not refresh_token:
        raise ValueError("Strava connection is missing refresh token. Please reconnect.")

    now_ts = int(datetime.now(timezone.utc).timestamp())
    if access_token and expires_at and now_ts < int(expires_at) - 60:
        return access_token

    client_id = strava_repo.kv_get(db, STRAVA_CLIENT_ID_KEY)
    client_secret = strava_repo.kv_get(db, STRAVA_CLIENT_SECRET_KEY)
    if not client_id or not client_secret:
        raise ValueError("Missing STRAVA_CLIENT_ID/STRAVA_CLIENT_SECRET in internal_kv.")

    tokens = client.refresh_access_token(
        client_id=client_id,
        client_secret=client_secret,
        refresh_token=refresh_token,
    )
    strava_repo.upsert_connection(
        db,
        username,
        athlete_id=tokens.athlete_id,
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        expires_at=tokens.expires_at,
        scope=tokens.scope,
    )
    return tokens.access_token


def sync_activity_summaries(
    db: Database,
    username: str,
    *,
    client: StravaClient,
    after: int | None = None,
    before: int | None = None,
    per_page: int = 200,
    max_pages: int = 50,
) -> dict:
    """
    Fetch activity summaries from Strava and upsert into our cache table.
    Returns a small summary dict for UI use.
    """
    access_token = ensure_valid_access_token(db, username, client=client)

    total = 0
    pages = 0
    for page in range(1, max_pages + 1):
        pages += 1
        activities = client.list_activities(
            access_token=access_token,
            page=page,
            per_page=per_page,
            after=after,
            before=before,
        )
        if not activities:
            break

        for activity in activities:
            if not isinstance(activity, dict):
                continue
            activity_id = activity.get("id")
            if activity_id is None:
                continue
            try:
                activity_id_int = int(activity_id)
            except (TypeError, ValueError):
                continue

            start_lat, start_lon = _extract_start_latlon(activity)
            workout_type = map_workout_type(_maybe_int(activity.get("workout_type")))
            strava_repo.upsert_activity(
                db,
                username,
                activity_id=activity_id_int,
                name=activity.get("name"),
                activity_type=activity.get("type"),
                start_date=activity.get("start_date"),
                start_lat=start_lat,
                start_lon=start_lon,
                distance=_maybe_float(activity.get("distance")),
                elapsed_time=_maybe_int(activity.get("elapsed_time")),
                updated_at=activity.get("updated_at"),
                gpx_data=b"",
                workout_type=workout_type,
            )
            total += 1

    return {"synced_count": total, "pages": pages}


def import_activities(
    db: Database,
    username: str,
    *,
    client: StravaClient,
    activity_ids: Iterable[int],
    overwrite: bool = False,
) -> ImportResult:
    access_token = ensure_valid_access_token(db, username, client=client)
    cached = {a["activity_id"]: a for a in strava_repo.list_activities(db, username)}

    imported: list[dict] = []
    failed: list[dict] = []
    skipped: list[dict] = []

    for activity_id in activity_ids:
        try:
            activity_id_int = int(activity_id)
        except (TypeError, ValueError):
            failed.append({"activity_id": activity_id, "error": "Invalid activity_id"})
            continue

        meta = cached.get(activity_id_int)
        if meta and meta.get("has_gpx") and not overwrite:
            skipped.append({"activity_id": activity_id_int, "reason": "already_imported"})
            continue

        start_date = meta.get("start_date") if meta else None

        try:
            # Fetch detailed activity info for description and workout_type
            activity_detail = client.get_activity(access_token=access_token, activity_id=activity_id_int)
            description = activity_detail.get("description") if isinstance(activity_detail, dict) else None
            workout_type = map_workout_type(_maybe_int(activity_detail.get("workout_type"))) if isinstance(activity_detail, dict) else None

            streams = client.get_activity_streams(access_token=access_token, activity_id=activity_id_int)
            gpx_bytes = _streams_to_gpx_bytes(activity_id=activity_id_int, start_date=start_date, streams=streams)
            parsed_preview = parse_strava_gpx(gpx_bytes)
            bounds = compute_gpx_bounds(parsed_preview)
            if bounds is None:
                raise ValueError("No valid coordinates found in streams.")
            min_lat, min_lon, max_lat, max_lon = bounds

            # Ensure we have a row in strava_activities even if the user didn't sync first.
            if not meta:
                strava_repo.upsert_activity(
                    db,
                    username,
                    activity_id=activity_id_int,
                    name=activity_detail.get("name") if isinstance(activity_detail, dict) else None,
                    activity_type=activity_detail.get("type") if isinstance(activity_detail, dict) else None,
                    start_date=start_date,
                    start_lat=None,
                    start_lon=None,
                    distance=None,
                    elapsed_time=None,
                    updated_at=None,
                    gpx_data=b"",
                    workout_type=workout_type,
                    description=description,
                )
            else:
                # Update existing activity with description and workout_type from detail
                strava_repo.upsert_activity(
                    db,
                    username,
                    activity_id=activity_id_int,
                    name=meta.get("name"),
                    activity_type=meta.get("type"),
                    start_date=meta.get("start_date"),
                    start_lat=meta.get("start_lat"),
                    start_lon=meta.get("start_lon"),
                    distance=meta.get("distance"),
                    elapsed_time=meta.get("elapsed_time"),
                    updated_at=meta.get("updated_at"),
                    gpx_data=b"",
                    workout_type=workout_type,
                    description=description,
                )
            strava_repo.set_activity_gpx(db, username, activity_id_int, gpx_bytes)
            strava_repo.upsert_import(
                db,
                username,
                activity_id=activity_id_int,
                min_lat=min_lat,
                min_lon=min_lon,
                max_lat=max_lat,
                max_lon=max_lon,
            )
            imported.append(
                {
                    "activity_id": activity_id_int,
                    "min_lat": min_lat,
                    "min_lon": min_lon,
                    "max_lat": max_lat,
                    "max_lon": max_lon,
                }
            )
        except (StravaApiError, ValueError) as exc:
            failed.append({"activity_id": activity_id_int, "error": str(exc)})
        except Exception as exc:
            failed.append({"activity_id": activity_id_int, "error": f"Unexpected error: {exc}"})

    return ImportResult(imported=imported, failed=failed, skipped=skipped)


def delete_import(db: Database, username: str, *, activity_id: int) -> None:
    activity_id_int = int(activity_id)
    strava_repo.delete_import(db, username, activity_id_int)
    strava_repo.clear_activity_gpx(db, username, activity_id_int)


def _extract_start_latlon(activity: dict) -> tuple[float | None, float | None]:
    start_latlng = activity.get("start_latlng")
    if isinstance(start_latlng, (list, tuple)) and len(start_latlng) == 2:
        try:
            return float(start_latlng[0]), float(start_latlng[1])
        except (TypeError, ValueError):
            return None, None

    lat = activity.get("start_latitude")
    lon = activity.get("start_longitude")
    try:
        lat_f = float(lat) if lat is not None else None
        lon_f = float(lon) if lon is not None else None
        return lat_f, lon_f
    except (TypeError, ValueError):
        return None, None


def _maybe_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _maybe_int(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _parse_start_date(start_date: str | None) -> datetime | None:
    if not start_date:
        return None
    try:
        # Strava typically returns ISO strings like 2025-01-02T12:34:56Z
        if start_date.endswith("Z"):
            start_date = start_date.replace("Z", "+00:00")
        dt = datetime.fromisoformat(start_date)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def _streams_to_gpx_bytes(*, activity_id: int, start_date: str | None, streams: Any) -> bytes:
    latlng, time_s, altitude = _normalize_streams(streams)

    if not latlng:
        raise ValueError("Strava streams missing latlng data.")

    start_dt = _parse_start_date(start_date)

    gpx = ET.Element(
        "gpx",
        attrib={
            "creator": "BergenOmap",
            "version": "1.1",
            "xmlns": "http://www.topografix.com/GPX/1/1",
        },
    )

    metadata = ET.SubElement(gpx, "metadata")
    if start_dt is not None:
        ET.SubElement(metadata, "time").text = start_dt.isoformat().replace("+00:00", "Z")

    trk = ET.SubElement(gpx, "trk")
    ET.SubElement(trk, "name").text = f"Strava activity {activity_id}"
    seg = ET.SubElement(trk, "trkseg")

    for idx, pair in enumerate(latlng):
        if not isinstance(pair, (list, tuple)) or len(pair) != 2:
            continue
        try:
            lat = float(pair[0])
            lon = float(pair[1])
        except (TypeError, ValueError):
            continue

        trkpt = ET.SubElement(seg, "trkpt", attrib={"lat": str(lat), "lon": str(lon)})

        if altitude and idx < len(altitude):
            ele_val = altitude[idx]
            if ele_val is not None:
                ET.SubElement(trkpt, "ele").text = str(ele_val)

        if start_dt is not None and time_s and idx < len(time_s):
            offset = time_s[idx]
            if offset is not None:
                point_dt = start_dt + timedelta(seconds=int(offset))
                ET.SubElement(trkpt, "time").text = point_dt.isoformat().replace("+00:00", "Z")

    xml_bytes = ET.tostring(gpx, encoding="utf-8", xml_declaration=True)
    return xml_bytes


def _normalize_streams(streams: Any) -> tuple[list[list[float]], list[int] | None, list[float] | None]:
    """
    Supports both key_by_type=true (dict) and legacy list responses.
    Returns: (latlng, time_seconds, altitude)
    """
    if isinstance(streams, dict):
        latlng = _extract_stream_data(streams, "latlng")
        time_s = _extract_stream_data(streams, "time")
        altitude = _extract_stream_data(streams, "altitude")
        return (
            _coerce_latlng(latlng),
            _coerce_int_list(time_s),
            _coerce_float_list(altitude),
        )

    if isinstance(streams, list):
        by_type: Dict[str, Any] = {}
        for entry in streams:
            if not isinstance(entry, dict):
                continue
            t = entry.get("type")
            if isinstance(t, str):
                by_type[t] = entry
        latlng = _extract_stream_data(by_type, "latlng")
        time_s = _extract_stream_data(by_type, "time")
        altitude = _extract_stream_data(by_type, "altitude")
        return (
            _coerce_latlng(latlng),
            _coerce_int_list(time_s),
            _coerce_float_list(altitude),
        )

    return ([], None, None)


def _extract_stream_data(streams_by_type: dict, key: str) -> Any:
    entry = streams_by_type.get(key)
    if isinstance(entry, dict):
        return entry.get("data")
    return None


def _coerce_latlng(value: Any) -> list[list[float]]:
    if not isinstance(value, list):
        return []
    out: list[list[float]] = []
    for pair in value:
        if not isinstance(pair, (list, tuple)) or len(pair) != 2:
            continue
        try:
            out.append([float(pair[0]), float(pair[1])])
        except (TypeError, ValueError):
            continue
    return out


def _coerce_int_list(value: Any) -> list[int] | None:
    if not isinstance(value, list):
        return None
    out: list[int] = []
    for item in value:
        try:
            out.append(int(item))
        except (TypeError, ValueError):
            out.append(0)
    return out


def _coerce_float_list(value: Any) -> list[float] | None:
    if not isinstance(value, list):
        return None
    out: list[float] = []
    for item in value:
        try:
            out.append(float(item))
        except (TypeError, ValueError):
            out.append(0.0)
    return out



