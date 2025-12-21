from __future__ import annotations

import base64
import json
from datetime import datetime, timezone
from urllib.parse import urlparse

from flask import Blueprint, current_app, jsonify, redirect, request

from bergenomap.api.common import is_local_request
from bergenomap.integrations.strava_client import StravaApiError, StravaClient
from bergenomap.repositories import maps_repo, sessions_repo, strava_repo
from bergenomap.repositories.db import get_db
from bergenomap.services import strava_sync_service


bp = Blueprint("strava", __name__)


def _current_username() -> str:
    """
    Resolve the logged-in user from session cookie.

    Note: auth middleware already enforces this for /api routes in production,
    but local debug can bypass it, so we keep a safe fallback.
    """
    session_key = request.cookies.get("session_key")
    if not session_key:
        if is_local_request() and current_app.debug:
            return "geir.smestad"
        raise ValueError("Missing session_key cookie")

    db = get_db()
    session = sessions_repo.validate_session(db, session_key)
    if not session:
        raise ValueError("Invalid session")
    return session["username"]


def _encode_state(state_obj: dict) -> str:
    raw = json.dumps(state_obj, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _decode_state(state: str) -> dict:
    if not state:
        return {}
    padded = state + "=" * (-len(state) % 4)
    raw = base64.urlsafe_b64decode(padded.encode("ascii"))
    return json.loads(raw.decode("utf-8"))


def _safe_return_to(return_to: str | None) -> str | None:
    if not return_to:
        return None
    try:
        parsed = urlparse(return_to)
        if parsed.scheme not in ("http", "https"):
            return None
        # Prevent open redirects to a different host.
        if parsed.hostname and parsed.hostname != request.host.split(":")[0]:
            return None
        return return_to
    except Exception:
        return None


@bp.route("/api/strava/status", methods=["GET"])
def status():
    username = _current_username()
    db = get_db()
    conn = strava_repo.get_connection(db, username)
    connected = bool(conn and not conn.get("revoked_at") and conn.get("refresh_token"))
    return jsonify(
        {
            "connected": connected,
            "username": username,
            "athlete_id": conn.get("athlete_id") if conn else None,
            "scope": conn.get("scope") if conn else None,
            "expires_at": conn.get("expires_at") if conn else None,
            "connected_at": conn.get("connected_at") if conn else None,
            "updated_at": conn.get("updated_at") if conn else None,
            "revoked_at": conn.get("revoked_at") if conn else None,
        }
    )


@bp.route("/api/strava/authorize", methods=["GET"])
def authorize():
    _ = _current_username()
    db = get_db()

    client_id = strava_repo.kv_get(db, strava_sync_service.STRAVA_CLIENT_ID_KEY)
    if not client_id:
        return jsonify({"error": "Missing STRAVA_CLIENT_ID in internal_kv"}), 500

    # Use current host for callback.
    redirect_uri = request.host_url.rstrip("/") + "/api/strava/callback"

    return_to = _safe_return_to(request.args.get("return_to"))
    state = _encode_state({"return_to": return_to, "ts": int(datetime.now(timezone.utc).timestamp())})

    client = StravaClient()
    auth_url = client.build_authorize_url(
        client_id=client_id,
        redirect_uri=redirect_uri,
        scope="activity:read_all",
        state=state,
        approval_prompt="force",
    )
    return redirect(auth_url)


@bp.route("/api/strava/callback", methods=["GET"])
def callback():
    username = _current_username()
    code = request.args.get("code")
    if not code:
        return jsonify({"error": "Missing code from Strava"}), 400

    db = get_db()
    client_id = strava_repo.kv_get(db, strava_sync_service.STRAVA_CLIENT_ID_KEY)
    client_secret = strava_repo.kv_get(db, strava_sync_service.STRAVA_CLIENT_SECRET_KEY)
    if not client_id or not client_secret:
        return jsonify({"error": "Missing STRAVA_CLIENT_ID/STRAVA_CLIENT_SECRET in internal_kv"}), 500

    client = StravaClient()
    try:
        tokens = client.exchange_code_for_token(client_id=client_id, client_secret=client_secret, code=code)
    except StravaApiError as exc:
        return jsonify({"error": str(exc)}), 502

    strava_repo.upsert_connection(
        db,
        username,
        athlete_id=tokens.athlete_id,
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        expires_at=tokens.expires_at,
        scope=tokens.scope,
    )

    # Redirect back to UI, when possible.
    state = request.args.get("state")
    try:
        state_obj = _decode_state(state) if state else {}
    except Exception:
        state_obj = {}

    return_to = _safe_return_to(state_obj.get("return_to")) if isinstance(state_obj, dict) else None
    if return_to:
        return redirect(return_to)
    return redirect("/stravaConnection.html")


@bp.route("/api/strava/disconnect", methods=["POST"])
def disconnect():
    username = _current_username()
    db = get_db()
    strava_repo.disconnect(db, username)
    return jsonify({"message": "Disconnected"}), 200


@bp.route("/api/strava/sync_activities", methods=["POST"])
def sync_activities():
    username = _current_username()
    db = get_db()
    client = StravaClient()

    payload = request.get_json(silent=True) or {}
    after = payload.get("after")
    before = payload.get("before")
    try:
        after_i = int(after) if after is not None else None
        before_i = int(before) if before is not None else None
    except (TypeError, ValueError):
        return jsonify({"error": "after/before must be unix timestamps (ints)"}), 400

    try:
        result = strava_sync_service.sync_activity_summaries(
            db, username, client=client, after=after_i, before=before_i
        )
    except (ValueError, StravaApiError) as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify(result), 200


@bp.route("/api/strava/activities", methods=["GET"])
def list_activities():
    username = _current_username()
    db = get_db()

    filter_mode = request.args.get("filter", "all")
    text = (request.args.get("text") or "").strip().lower()

    activities = strava_repo.list_activities(db, username)

    if text:
        activities = [
            a
            for a in activities
            if (a.get("name") or "").lower().find(text) != -1 or str(a.get("activity_id")).find(text) != -1
        ]

    if filter_mode == "imported":
        activities = [a for a in activities if a.get("has_gpx")]
    elif filter_mode == "notImported":
        activities = [a for a in activities if not a.get("has_gpx")]
    elif filter_mode == "startsOnMyMaps":
        map_bounds = _load_map_bounds(db)
        filtered = []
        for a in activities:
            lat = a.get("start_lat")
            lon = a.get("start_lon")
            if lat is None or lon is None:
                continue
            try:
                lat_f = float(lat)
                lon_f = float(lon)
            except (TypeError, ValueError):
                continue
            if _point_in_any_bounds(lat_f, lon_f, map_bounds):
                filtered.append(a)
        activities = filtered

    imports = {imp["activity_id"]: imp for imp in strava_repo.list_imports(db, username)}
    for a in activities:
        imp = imports.get(a["activity_id"])
        if imp:
            a["imported_at"] = imp.get("imported_at")
            a["last_imported_at"] = imp.get("last_imported_at")
            a["bounds"] = {
                "min_lat": imp.get("min_lat"),
                "min_lon": imp.get("min_lon"),
                "max_lat": imp.get("max_lat"),
                "max_lon": imp.get("max_lon"),
            }

    return jsonify(activities), 200


def _load_map_bounds(db) -> list[tuple[float, float, float, float]]:
    """
    Returns a list of (min_lat, min_lon, max_lat, max_lon) for all maps.
    """
    maps = maps_repo.list_maps(db)
    bounds: list[tuple[float, float, float, float]] = []
    for m in maps:
        nw = m.get("nw_coords") if isinstance(m, dict) else None
        se = m.get("se_coords") if isinstance(m, dict) else None
        if not isinstance(nw, list) or not isinstance(se, list) or len(nw) != 2 or len(se) != 2:
            continue
        try:
            nw_lat, nw_lon = float(nw[0]), float(nw[1])
            se_lat, se_lon = float(se[0]), float(se[1])
        except (TypeError, ValueError):
            continue
        min_lat = min(nw_lat, se_lat)
        max_lat = max(nw_lat, se_lat)
        min_lon = min(nw_lon, se_lon)
        max_lon = max(nw_lon, se_lon)
        bounds.append((min_lat, min_lon, max_lat, max_lon))
    return bounds


def _point_in_any_bounds(lat: float, lon: float, bounds: list[tuple[float, float, float, float]]) -> bool:
    for (min_lat, min_lon, max_lat, max_lon) in bounds:
        if min_lat <= lat <= max_lat and min_lon <= lon <= max_lon:
            return True
    return False


@bp.route("/api/strava/import", methods=["POST"])
def import_selected():
    username = _current_username()
    db = get_db()
    client = StravaClient()

    payload = request.get_json(silent=True) or {}
    activity_ids = payload.get("activity_ids") or payload.get("activityIds")
    overwrite = bool(payload.get("overwrite", False))

    if not isinstance(activity_ids, list) or not activity_ids:
        return jsonify({"error": "activity_ids must be a non-empty list"}), 400

    try:
        ids = [int(x) for x in activity_ids]
    except (TypeError, ValueError):
        return jsonify({"error": "activity_ids must be integers"}), 400

    result = strava_sync_service.import_activities(db, username, client=client, activity_ids=ids, overwrite=overwrite)
    return jsonify({"imported": result.imported, "failed": result.failed, "skipped": result.skipped}), 200


@bp.route("/api/strava/import/<int:activity_id>", methods=["DELETE"])
def delete_import(activity_id: int):
    username = _current_username()
    db = get_db()
    strava_sync_service.delete_import(db, username, activity_id=activity_id)
    return jsonify({"message": "Deleted"}), 200


@bp.route("/api/strava/gpx/<int:activity_id>", methods=["GET"])
def download_gpx(activity_id: int):
    """
    Convenience endpoint for UI: returns stored GPX as bytes.
    """
    username = _current_username()
    db = get_db()
    gpx = strava_repo.get_activity_gpx(db, username, activity_id)
    if not gpx:
        return jsonify({"error": "No GPX stored for this activity"}), 404
    response = current_app.response_class(gpx, mimetype="application/gpx+xml")
    response.headers["Content-Disposition"] = f"attachment; filename=strava_{activity_id}.gpx"
    return response


