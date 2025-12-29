from __future__ import annotations

import xml.etree.ElementTree as ET
import re

from flask import Blueprint, g, jsonify, request

from bergenomap.repositories.db import get_db
from bergenomap.repositories import strava_repo, tracks_repo, users_repo
from bergenomap.services.track_service import compute_gpx_bounds
from gpx_parser import parse_strava_gpx


bp = Blueprint("tracks", __name__)


_ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}")


def _format_strava_track_description(*, start_date: str | None, name: str, workout_type: str | None) -> str:
    date_part = "unknown-date"
    if isinstance(start_date, str):
        m = _ISO_DATE_RE.match(start_date)
        if m:
            date_part = m.group(0)


    return f"strava-{date_part}-{name}"


@bp.route("/api/gps-tracks/<username>", methods=["GET"])
def list_gps_tracks(username: str):
    if username != g.username:
        return jsonify({"error": "Forbidden"}), 403
    db = get_db()
    user = users_repo.get_user_by_username(db, username)
    if not user:
        return jsonify({"error": f"User '{username}' not found"}), 404

    tracks = tracks_repo.list_gps_tracks(db, username)
    for t in tracks:
        if isinstance(t, dict):
            t["source"] = "local"

    # Add Strava imports as "virtual tracks" with negative track_id values.
    # This keeps the GPX browser's numeric trackId assumptions intact.
    strava_imports = strava_repo.list_imports(db, username)
    strava_activities = strava_repo.list_activities(db, username)
    strava_activity_by_id = {
        a.get("activity_id"): a for a in strava_activities if isinstance(a, dict) and a.get("activity_id") is not None
    }

    strava_tracks = []
    for imp in strava_imports:
        if not isinstance(imp, dict):
            continue
        activity_id = imp.get("activity_id")
        if activity_id is None:
            continue
        try:
            activity_id_int = int(activity_id)
        except (TypeError, ValueError):
            continue

        activity = strava_activity_by_id.get(activity_id_int) or {}
        name = activity.get("name") if isinstance(activity, dict) else None
        if not name:
            name = str(activity_id_int)

        start_date = activity.get("start_date") if isinstance(activity, dict) else None
        workout_type = activity.get("workout_type") if isinstance(activity, dict) else None

        strava_tracks.append(
            {
                "track_id": -activity_id_int,
                "username": username,
                "description": _format_strava_track_description(
                    start_date=start_date,
                    name=str(name),
                    workout_type=workout_type,
                ),
                "min_lat": imp.get("min_lat"),
                "min_lon": imp.get("min_lon"),
                "max_lat": imp.get("max_lat"),
                "max_lon": imp.get("max_lon"),
                "source": "strava",
                "strava_activity_id": activity_id_int,
            }
        )

    merged = tracks + strava_tracks
    return jsonify(merged)


@bp.route("/api/gps-tracks/<username>/<track_id>", methods=["GET"])
def get_gps_track(username: str, track_id: str):
    if username != g.username:
        return jsonify({"error": "Forbidden"}), 403
    db = get_db()
    try:
        track_id_int = int(track_id)
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid track_id"}), 400

    if track_id_int < 0: # Negative-numbered tracks are virtual, from Strava integration
        activity_id = -track_id_int
        gpx_bytes = strava_repo.get_activity_gpx(db, username, activity_id)
        if not gpx_bytes:
            return jsonify({"error": "Track not found"}), 404

        try:
            parsed_gpx = parse_strava_gpx(gpx_bytes)
        except ET.ParseError as exc:
            return jsonify({"error": f"Unable to parse GPX payload: {exc}"}), 500

        bounds = compute_gpx_bounds(parsed_gpx) or (None, None, None, None)
        min_lat, min_lon, max_lat, max_lon = bounds
        # Best-effort description from cached Strava activities table.
        activity: dict = {}
        for a in strava_repo.list_activities(db, username):
            if isinstance(a, dict) and a.get("activity_id") == activity_id:
                activity = a
                break

        name = activity.get("name") if isinstance(activity, dict) else None
        if not name:
            name = str(activity_id)
        start_date = activity.get("start_date") if isinstance(activity, dict) else None
        workout_type = activity.get("workout_type") if isinstance(activity, dict) else None

        response = {
            "track_id": track_id_int,
            "username": username,
            "description": _format_strava_track_description(
                start_date=start_date,
                name=str(name),
                workout_type=workout_type,
            ),
            "min_lat": min_lat,
            "min_lon": min_lon,
            "max_lat": max_lat,
            "max_lon": max_lon,
            "source": "strava",
            "strava_activity_id": activity_id,
            "gpx": parsed_gpx,
        }
        return jsonify(response)

    # Positive-numbered tracks are from GPX tracks uploaded by the user
    track = tracks_repo.get_gps_track_by_id(db, username, track_id_int)
    if not track:
        return jsonify({"error": "Track not found"}), 404

    try:
        parsed_gpx = parse_strava_gpx(track["gpx_data"])
    except ET.ParseError as exc:
        return jsonify({"error": f"Unable to parse GPX payload: {exc}"}), 500

    response = {
        "track_id": track["track_id"],
        "username": track["username"],
        "description": track["description"],
        "min_lat": track.get("min_lat"),
        "min_lon": track.get("min_lon"),
        "max_lat": track.get("max_lat"),
        "max_lon": track.get("max_lon"),
        "source": "local",
        "gpx": parsed_gpx,
    }
    return jsonify(response)


@bp.route("/api/gps-tracks", methods=["POST"])
def insert_gps_track():
    uploaded_file = request.files.get("file")
    username_from_client = request.form.get("username")
    username = g.username
    description = request.form.get("description", "")

    if not uploaded_file or uploaded_file.filename == "":
        return jsonify({"error": "A GPX file is required"}), 400
    if username_from_client and username_from_client != username:
        return jsonify({"error": "Forbidden"}), 403

    gpx_bytes = uploaded_file.read()
    if not gpx_bytes:
        return jsonify({"error": "Uploaded GPX file is empty"}), 400

    try:
        parsed_preview = parse_strava_gpx(gpx_bytes)
    except ET.ParseError as exc:
        return jsonify({"error": f"Invalid GPX file: {exc}"}), 400

    bounds = compute_gpx_bounds(parsed_preview)
    if bounds is None:
        return jsonify({"error": "No valid coordinates found in GPX file"}), 400
    min_lat, min_lon, max_lat, max_lon = bounds

    db = get_db()
    try:
        track_id = tracks_repo.insert_gps_track(
            db,
            username,
            gpx_bytes,
            description,
            min_lat=min_lat,
            min_lon=min_lon,
            max_lat=max_lat,
            max_lon=max_lon,
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    preview_point_count = sum(len(track["points"]) for track in parsed_preview.get("tracks", []))
    preview_track_count = len(parsed_preview.get("tracks", []))

    return (
        jsonify(
            {
                "message": "Track stored successfully",
                "track_id": track_id,
                "username": username,
                "description": description,
                "min_lat": min_lat,
                "min_lon": min_lon,
                "max_lat": max_lat,
                "max_lon": max_lon,
                "source": "local",
                "preview": {
                    "metadata": parsed_preview.get("metadata", {}),
                    "track_count": preview_track_count,
                    "point_count": preview_point_count,
                },
            }
        ),
        201,
    )


