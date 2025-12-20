from __future__ import annotations

import xml.etree.ElementTree as ET

from flask import Blueprint, jsonify, request

from bergenomap.repositories.db import get_db
from bergenomap.repositories import tracks_repo, users_repo
from bergenomap.services.track_service import compute_gpx_bounds
from gpx_parser import parse_strava_gpx


bp = Blueprint("tracks", __name__)


@bp.route("/api/gps-tracks/<username>", methods=["GET"])
def list_gps_tracks(username: str):
    db = get_db()
    user = users_repo.get_user_by_username(db, username)
    if not user:
        return jsonify({"error": f"User '{username}' not found"}), 404

    tracks = tracks_repo.list_gps_tracks(db, username)
    return jsonify(tracks)


@bp.route("/api/gps-tracks/<username>/<int:track_id>", methods=["GET"])
def get_gps_track(username: str, track_id: int):
    db = get_db()
    track = tracks_repo.get_gps_track_by_id(db, username, track_id)
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
        "gpx": parsed_gpx,
    }
    return jsonify(response)


@bp.route("/api/gps-tracks", methods=["POST"])
def insert_gps_track():
    uploaded_file = request.files.get("file")
    username = request.form.get("username")
    description = request.form.get("description", "")

    if not uploaded_file or uploaded_file.filename == "":
        return jsonify({"error": "A GPX file is required"}), 400
    if not username:
        return jsonify({"error": "username is required"}), 400

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
                "preview": {
                    "metadata": parsed_preview.get("metadata", {}),
                    "track_count": preview_track_count,
                    "point_count": preview_point_count,
                },
            }
        ),
        201,
    )


