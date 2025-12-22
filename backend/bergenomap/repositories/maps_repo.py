from __future__ import annotations

import json
from typing import Any, Dict, List

from Database import Database


def insert_map(db: Database, map_data: Dict[str, Any]) -> int:
    nw_lat = round(map_data["nw_coords"][0], 6)
    nw_lon = round(map_data["nw_coords"][1], 6)
    se_lat = round(map_data["se_coords"][0], 6)
    se_lon = round(map_data["se_coords"][1], 6)
    angle = round(map_data["optimal_rotation_angle"], 2)

    common_values = (
        map_data["map_name"],
        nw_lat,
        nw_lon,
        se_lat,
        se_lon,
        angle,
        map_data["overlay_width"],
        map_data["overlay_height"],
        map_data["attribution"],
        json.dumps([[int(x), int(y)] for (x, y) in map_data["selected_pixel_coords"]]),
        json.dumps([[round(lat, 6), round(lon, 6)] for (lat, lon) in map_data["selected_realworld_coords"]]),
        map_data["map_filename"],
        map_data.get("map_area", ""),
        map_data.get("map_event", ""),
        map_data.get("map_date", ""),
        map_data.get("map_course", ""),
        map_data.get("map_club", ""),
        map_data.get("map_course_planner", ""),
        map_data.get("map_attribution", ""),
    )

    map_id = map_data.get("map_id")
    if map_id is None:
        insert_sql = """
            INSERT INTO maps (
                map_name,
                nw_coords_lat, nw_coords_lon,
                se_coords_lat, se_coords_lon,
                optimal_rotation_angle,
                overlay_width, overlay_height,
                attribution,
                selected_pixel_coords, selected_realworld_coords,
                map_filename,
                map_area,
                map_event,
                map_date,
                map_course,
                map_club,
                map_course_planner,
                map_attribution
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(map_name) DO UPDATE SET
                nw_coords_lat = excluded.nw_coords_lat,
                nw_coords_lon = excluded.nw_coords_lon,
                se_coords_lat = excluded.se_coords_lat,
                se_coords_lon = excluded.se_coords_lon,
                optimal_rotation_angle = excluded.optimal_rotation_angle,
                overlay_width = excluded.overlay_width,
                overlay_height = excluded.overlay_height,
                attribution = excluded.attribution,
                selected_pixel_coords = excluded.selected_pixel_coords,
                selected_realworld_coords = excluded.selected_realworld_coords,
                map_filename = excluded.map_filename,
                map_area = excluded.map_area,
                map_event = excluded.map_event,
                map_date = excluded.map_date,
                map_course = excluded.map_course,
                map_club = excluded.map_club,
                map_course_planner = excluded.map_course_planner,
                map_attribution = excluded.map_attribution
        """
        db.cursor.execute(insert_sql, common_values)
        map_id = get_map_id_by_name(db, map_data["map_name"])
    else:
        update_sql = """
            UPDATE maps
            SET
                map_name = ?,
                nw_coords_lat = ?,
                nw_coords_lon = ?,
                se_coords_lat = ?,
                se_coords_lon = ?,
                optimal_rotation_angle = ?,
                overlay_width = ?,
                overlay_height = ?,
                attribution = ?,
                selected_pixel_coords = ?,
                selected_realworld_coords = ?,
                map_filename = ?,
                map_area = ?,
                map_event = ?,
                map_date = ?,
                map_course = ?,
                map_club = ?,
                map_course_planner = ?,
                map_attribution = ?
            WHERE map_id = ?
        """
        db.cursor.execute(update_sql, common_values + (map_id,))

    db.connection.commit()
    if map_id is None:
        raise RuntimeError("insert_map failed to resolve map_id")
    return int(map_id)


def list_maps(db: Database) -> List[Dict[str, Any]]:
    db.cursor.execute(
        """
        SELECT
            map_id,
            map_name,
            nw_coords_lat, nw_coords_lon,
            se_coords_lat, se_coords_lon,
            optimal_rotation_angle,
            overlay_width, overlay_height,
            attribution,
            selected_pixel_coords, selected_realworld_coords,
            map_filename,
            map_area, map_event, map_date, map_course,
            map_club, map_course_planner, map_attribution
        FROM maps
        """
    )
    rows = db.cursor.fetchall()
    maps: list[dict] = []
    for row in rows:
        (
            map_id,
            map_name,
            nw_lat,
            nw_lon,
            se_lat,
            se_lon,
            angle,
            overlay_width,
            overlay_height,
            attribution,
            selected_pixel_coords,
            selected_realworld_coords,
            filename,
            map_area,
            map_event,
            map_date,
            map_course,
            map_club,
            map_course_planner,
            map_attribution,
        ) = row
        maps.append(
            {
                "map_id": map_id,
                "map_name": map_name,
                "nw_coords": [nw_lat, nw_lon],
                "se_coords": [se_lat, se_lon],
                "optimal_rotation_angle": angle,
                "overlay_width": overlay_width,
                "overlay_height": overlay_height,
                "attribution": attribution,
                "selected_pixel_coords": json.loads(selected_pixel_coords),
                "selected_realworld_coords": json.loads(selected_realworld_coords),
                "map_filename": filename,
                "map_area": map_area,
                "map_event": map_event,
                "map_date": map_date,
                "map_course": map_course,
                "map_club": map_club,
                "map_course_planner": map_course_planner,
                "map_attribution": map_attribution,
            }
        )
    return maps


def get_map_id_by_name(db: Database, map_name: str) -> int | None:
    select_sql = """
    SELECT map_id
    FROM maps
    WHERE map_name = ?
    LIMIT 1
    """
    db.cursor.execute(select_sql, (map_name,))
    result = db.cursor.fetchone()
    return int(result[0]) if result else None


