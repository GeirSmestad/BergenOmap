from __future__ import annotations

import traceback

from flask import Blueprint, abort, jsonify, render_template_string, request

from bergenomap.api.common import is_local_request
from bergenomap.config import settings
from bergenomap.repositories.db import get_db
from bergenomap.repositories import maps_repo


bp = Blueprint("admin", __name__)


@bp.route("/api/dal/insert_map", methods=["POST"])
def insert_map():
    if not is_local_request():
        abort(404)

    map_data = request.json
    db = get_db()
    map_id = maps_repo.insert_map(db, map_data)
    return jsonify({"message": "Map added successfully", "map_id": map_id}), 201


@bp.route("/api/dal/export_database", methods=["POST"])
def export_database():
    _data = request.get_json()

    js_output_dir = settings.database_export_js_output_dir
    final_maps_output_dir = settings.database_export_final_maps_output_dir
    original_maps_output_dir = settings.database_export_original_maps_output_dir
    include_original = False
    overwrite = False

    if not (js_output_dir and final_maps_output_dir and (include_original is False or original_maps_output_dir)):
        return jsonify({"error": "Missing required parameters"}), 400

    try:
        db = get_db()
        db.output_map_data_to_disk(
            js_output_dir,
            final_maps_output_dir,
            original_maps_output_dir,
            include_original,
            overwrite,
        )
        return jsonify({"message": "Database exported successfully"}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# Database visualization
# To view, query http://127.0.0.1:5000/viewDatabase
@bp.route("/api/viewDatabase")
def visualize_database():
    if not is_local_request():
        abort(404)

    db = get_db()
    maps = maps_repo.list_maps(db)

    html = """
    <!DOCTYPE html>
    <html lang=\"en\">
    <head>
        <meta charset=\"UTF-8\">
        <title>Maps Database</title>
        <style>
            table {
                width: 100%;
                border-collapse: collapse;
            }
            th, td {
                border: 1px solid black;
                padding: 8px;
                text-align: left;
            }
            th {
                background-color: #f2f2f2;
            }
            img {
                width: 100px;
                height: auto;
            }
        </style>
    </head>
    <body>
        <h1>Maps Database</h1>
        <table>
            <tr>
                <th>Map Name</th>
                <th>NW Coords (Lat, Lon)</th>
                <th>SE Coords (Lat, Lon)</th>
                <th>Optimal Rotation Angle</th>
                <th>Overlay Dimensions (WxH)</th>
                <th>Selected Pixel Coords</th>
                <th>Selected Realworld Coords</th>
                <th>Original Map</th>
                <th>Final Map</th>
            </tr>
            {% for map in maps %}
            <tr>
                <td>{{ map.map_name }}</td>
                <td>{{ map.nw_coords[0] }}, {{ map.nw_coords[1] }}</td>
                <td>{{ map.se_coords[0] }}, {{ map.se_coords[1] }}</td>
                <td>{{ map.optimal_rotation_angle }}</td>
                <td>{{ map.overlay_width }} x {{ map.overlay_height }}</td>
                <td>{{ map.selected_pixel_coords }}</td>
                <td>{{ map.selected_realworld_coords }}</td>
                <td><img src=\"dal/mapfile/original/{{ map.map_name }}\" alt=\"Original Map\"></td>
                <td><img src=\"dal/mapfile/final/{{ map.map_name }}\" alt=\"Final Map\"></td>
            </tr>
            {% endfor %}
        </table>
    </body>
    </html>
    """
    return render_template_string(html, maps=maps)


