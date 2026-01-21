from __future__ import annotations

from flask import Blueprint, g, jsonify, request

from bergenomap.repositories.db import get_db
from bergenomap.repositories import stored_points_repo


bp = Blueprint("stored_points", __name__)


@bp.route("/api/stored-points", methods=["GET"])
def list_stored_points():
    db = get_db()
    points = stored_points_repo.list_points(db, g.username)
    return jsonify(points), 200


@bp.route("/api/stored-points", methods=["POST"])
def create_stored_point():
    data = request.get_json(silent=True) or {}

    try:
        lat = float(data.get("lat"))
        lon = float(data.get("lon"))
    except (TypeError, ValueError):
        return jsonify({"error": "lat and lon are required numbers"}), 400

    precision = data.get("precision_meters")
    if precision is not None:
        try:
            precision = int(precision)
        except (TypeError, ValueError):
            return jsonify({"error": "precision_meters must be an integer or null"}), 400

    description = data.get("description") or ""

    db = get_db()
    try:
        point = stored_points_repo.insert_point(
            db,
            g.username,
            lat=lat,
            lon=lon,
            precision_meters=precision,
            description=description,
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(point), 201


@bp.route("/api/stored-points/<int:point_id>", methods=["PUT"])
def update_stored_point(point_id: int):
    data = request.get_json(silent=True) or {}
    if "description" not in data:
        return jsonify({"error": "description is required"}), 400

    db = get_db()
    updated = stored_points_repo.update_point_description(db, g.username, point_id, data.get("description") or "")
    if not updated:
        return jsonify({"error": "Not found"}), 404

    return jsonify(updated), 200


@bp.route("/api/stored-points/<int:point_id>", methods=["DELETE"])
def delete_stored_point(point_id: int):
    db = get_db()
    deleted = stored_points_repo.delete_point(db, g.username, point_id)
    if not deleted:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"deleted": True}), 200

