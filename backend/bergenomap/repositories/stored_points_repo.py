from __future__ import annotations

from Database import Database

from bergenomap.repositories import users_repo


def _round_coord(value: float) -> float:
    # GPS lat/lon in this app uses 6 decimals precision.
    return round(float(value), 6)


def list_points(db: Database, username: str) -> list[dict]:
    select_sql = """
    SELECT id, lat, lon, precision_meters, description, username
    FROM stored_points
    WHERE username = ?
    ORDER BY id ASC
    """
    db.cursor.execute(select_sql, (username,))
    rows = db.cursor.fetchall()
    return [
        {
            "id": point_id,
            "lat": lat,
            "lon": lon,
            "precision_meters": precision_meters,
            "description": description,
            "username": user,
        }
        for point_id, lat, lon, precision_meters, description, user in rows
    ]


def insert_point(
    db: Database,
    username: str,
    *,
    lat: float,
    lon: float,
    precision_meters: int | None,
    description: str,
) -> dict:
    if not users_repo.get_user_by_username(db, username):
        raise ValueError(f"User '{username}' does not exist.")

    lat_rounded = _round_coord(lat)
    lon_rounded = _round_coord(lon)

    if not (-90 <= lat_rounded <= 90):
        raise ValueError("lat must be between -90 and 90")
    if not (-180 <= lon_rounded <= 180):
        raise ValueError("lon must be between -180 and 180")

    desc = (description or "").strip()
    precision = None if precision_meters is None else int(precision_meters)

    insert_sql = """
    INSERT INTO stored_points (lat, lon, precision_meters, description, username)
    VALUES (?, ?, ?, ?, ?)
    """
    db.cursor.execute(insert_sql, (lat_rounded, lon_rounded, precision, desc, username))
    db.connection.commit()

    point_id = int(db.cursor.lastrowid)
    return {
        "id": point_id,
        "lat": lat_rounded,
        "lon": lon_rounded,
        "precision_meters": precision,
        "description": desc,
        "username": username,
    }


def update_point_description(db: Database, username: str, point_id: int, description: str) -> dict | None:
    desc = (description or "").strip()
    update_sql = """
    UPDATE stored_points
    SET description = ?
    WHERE username = ? AND id = ?
    """
    db.cursor.execute(update_sql, (desc, username, point_id))
    db.connection.commit()

    if db.cursor.rowcount == 0:
        return None

    select_sql = """
    SELECT id, lat, lon, precision_meters, description, username
    FROM stored_points
    WHERE username = ? AND id = ?
    LIMIT 1
    """
    db.cursor.execute(select_sql, (username, point_id))
    row = db.cursor.fetchone()
    if not row:
        return None
    pid, lat, lon, precision_meters, description, user = row
    return {
        "id": pid,
        "lat": lat,
        "lon": lon,
        "precision_meters": precision_meters,
        "description": description,
        "username": user,
    }


def delete_point(db: Database, username: str, point_id: int) -> bool:
    delete_sql = """
    DELETE FROM stored_points
    WHERE username = ? AND id = ?
    """
    db.cursor.execute(delete_sql, (username, point_id))
    db.connection.commit()
    return db.cursor.rowcount > 0

