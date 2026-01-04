from __future__ import annotations

import json
from typing import Any, Dict, List

from Database import Database


def _get_map_owner_by_name(db: Database, map_name: str) -> dict | None:
    select_sql = """
    SELECT map_id, username
    FROM maps
    WHERE map_name = ?
    LIMIT 1
    """
    db.cursor.execute(select_sql, (map_name,))
    row = db.cursor.fetchone()
    if not row:
        return None
    map_id, username = row
    return {"map_id": int(map_id), "username": username}


def _get_map_owner_by_id(db: Database, map_id: int) -> str | None:
    select_sql = """
    SELECT username
    FROM maps
    WHERE map_id = ?
    LIMIT 1
    """
    db.cursor.execute(select_sql, (map_id,))
    row = db.cursor.fetchone()
    return row[0] if row else None


def insert_map(db: Database, username: str, map_data: Dict[str, Any]) -> int:
    nw_lat = round(map_data["nw_coords"][0], 6)
    nw_lon = round(map_data["nw_coords"][1], 6)
    se_lat = round(map_data["se_coords"][0], 6)
    se_lon = round(map_data["se_coords"][1], 6)
    angle = round(map_data["optimal_rotation_angle"], 2)

    common_values = (
        username,
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
        map_data.get("map_scale", ""),
        map_data.get("map_course", ""),
        map_data.get("map_club", ""),
        map_data.get("map_course_planner", ""),
        map_data.get("map_attribution", ""),
    )

    map_id = map_data.get("map_id")
    if map_id is None:
        # Enforce global uniqueness on map_name, but prevent cross-user overwrite.
        existing = _get_map_owner_by_name(db, map_data["map_name"])
        if existing:
            if existing.get("username") != username:
                raise PermissionError("Map name already exists for a different user")
            map_id = existing.get("map_id")

    if map_id is None:
        insert_sql = """
            INSERT INTO maps (
                username,
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
                map_scale,
                map_course,
                map_club,
                map_course_planner,
                map_attribution
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        db.cursor.execute(insert_sql, common_values)
        map_id = get_map_id_by_name(db, map_data["map_name"], username=username)
    else:
        owner = _get_map_owner_by_id(db, int(map_id))
        if owner != username:
            raise PermissionError("Cannot update a map owned by a different user")

        update_sql = """
            UPDATE maps
            SET
                username = ?,
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
                map_scale = ?,
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


def list_maps(db: Database, username: str | None = None) -> List[Dict[str, Any]]:
    if username is None:
        db.cursor.execute(
            """
            SELECT
                map_id,
                username,
                map_name,
                nw_coords_lat, nw_coords_lon,
                se_coords_lat, se_coords_lon,
                optimal_rotation_angle,
                overlay_width, overlay_height,
                attribution,
                selected_pixel_coords, selected_realworld_coords,
                map_filename,
                map_area, map_event, map_date, map_scale, map_course,
                map_club, map_course_planner, map_attribution
            FROM maps
            """
        )
    else:
        db.cursor.execute(
            """
            SELECT
                map_id,
                username,
                map_name,
                nw_coords_lat, nw_coords_lon,
                se_coords_lat, se_coords_lon,
                optimal_rotation_angle,
                overlay_width, overlay_height,
                attribution,
                selected_pixel_coords, selected_realworld_coords,
                map_filename,
                map_area, map_event, map_date, map_scale, map_course,
                map_club, map_course_planner, map_attribution
            FROM maps
            WHERE username = ?
            """,
            (username,),
        )
    rows = db.cursor.fetchall()
    maps: list[dict] = []
    for row in rows:
        (
            map_id,
            username_row,
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
            map_scale,
            map_course,
            map_club,
            map_course_planner,
            map_attribution,
        ) = row
        maps.append(
            {
                "map_id": map_id,
                "username": username_row,
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
                "map_scale": map_scale,
                "map_course": map_course,
                "map_club": map_club,
                "map_course_planner": map_course_planner,
                "map_attribution": map_attribution,
            }
        )
    return maps


def get_map_id_by_name(db: Database, map_name: str, *, username: str | None = None) -> int | None:
    if username is None:
        select_sql = """
        SELECT map_id
        FROM maps
        WHERE map_name = ?
        LIMIT 1
        """
        db.cursor.execute(select_sql, (map_name,))
    else:
        select_sql = """
        SELECT map_id
        FROM maps
        WHERE map_name = ? AND username = ?
        LIMIT 1
        """
        db.cursor.execute(select_sql, (map_name, username))
    result = db.cursor.fetchone()
    return int(result[0]) if result else None


def get_map_metadata(db: Database, *, map_id: int) -> dict | None:
    select_sql = """
    SELECT
        map_area,
        map_event,
        map_date,
        map_scale,
        map_course,
        map_attribution
    FROM maps
    WHERE map_id = ?
    LIMIT 1
    """
    db.cursor.execute(select_sql, (int(map_id),))

    row = db.cursor.fetchone()
    if not row:
        return None
    map_area, map_event, map_date, map_scale, map_course, map_attribution = row
    return {
        "map_area": map_area or "",
        "map_event": map_event or "",
        "map_date": map_date or "",
        "map_scale": map_scale or "",
        "map_course": map_course or "",
        "map_attribution": map_attribution or "",
    }


def update_map_metadata_if_default(
    db: Database,
    *,
    username: str,
    map_id: int,
    metadata: Dict[str, Any],
) -> bool:
    """
    Update map metadata fields, but only when the current DB value is empty/whitespace.

    Returns True if any field was updated.
    """

    current = get_map_metadata(db, map_id=int(map_id))
    if current is None:
        return False

    def normalize_value(value: Any) -> str:
        if value is None:
            return ""
        if isinstance(value, (int, float)):
            return str(value)
        if isinstance(value, str):
            return value.strip()
        return ""

    def is_default(value: Any) -> bool:
        if value is None:
            return True
        if isinstance(value, str):
            return value.strip() == ""
        return False

    desired = {
        "map_area": normalize_value(metadata.get("map_area")),
        "map_event": normalize_value(metadata.get("map_event")),
        "map_date": normalize_value(metadata.get("map_date")),
        "map_scale": normalize_value(metadata.get("map_scale")),
        "map_course": normalize_value(metadata.get("map_course")),
        "map_attribution": normalize_value(metadata.get("map_attribution")),
    }

    updates: dict[str, str] = {}
    for key, new_value in desired.items():
        if not new_value:
            continue
        if is_default(current.get(key)):
            updates[key] = new_value

    if not updates:
        return False

    # Ensure ownership, consistent with insert/update logic elsewhere.
    owner = _get_map_owner_by_id(db, int(map_id))
    if owner != username:
        raise PermissionError("Cannot update a map owned by a different user")

    set_parts = ", ".join([f"{k} = ?" for k in updates.keys()])
    params = list(updates.values()) + [int(map_id)]

    db.cursor.execute(f"UPDATE maps SET {set_parts} WHERE map_id = ?", params)
    db.connection.commit()
    return True


