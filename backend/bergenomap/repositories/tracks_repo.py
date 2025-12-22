from __future__ import annotations

from Database import Database

from bergenomap.repositories import users_repo


def insert_gps_track(
    db: Database,
    username: str,
    gpx_data: bytes,
    description: str,
    *,
    min_lat: float,
    min_lon: float,
    max_lat: float,
    max_lon: float,
) -> int:
    if not users_repo.get_user_by_username(db, username):
        raise ValueError(f"User '{username}' does not exist. Create the user before inserting tracks.")

    if min_lat is None or min_lon is None or max_lat is None or max_lon is None:
        raise ValueError("Track bounds (min_lat/min_lon/max_lat/max_lon) are required.")

    insert_sql = """
    INSERT INTO gps_tracks (username, gpx_data, description, min_lat, min_lon, max_lat, max_lon)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """
    db.cursor.execute(insert_sql, (username, gpx_data, description, min_lat, min_lon, max_lat, max_lon))
    db.connection.commit()
    return db.cursor.lastrowid


def list_gps_tracks(db: Database, username: str) -> list[dict]:
    select_sql = """
    SELECT track_id, username, description, min_lat, min_lon, max_lat, max_lon
    FROM gps_tracks
    WHERE username = ?
    ORDER BY track_id ASC
    """
    db.cursor.execute(select_sql, (username,))
    rows = db.cursor.fetchall()
    return [
        {
            "track_id": track_id,
            "username": user,
            "description": description,
            "min_lat": min_lat,
            "min_lon": min_lon,
            "max_lat": max_lat,
            "max_lon": max_lon,
        }
        for track_id, user, description, min_lat, min_lon, max_lat, max_lon in rows
    ]


def get_gps_track_by_id(db: Database, username: str, track_id: int) -> dict | None:
    select_sql = """
    SELECT track_id, username, gpx_data, description, min_lat, min_lon, max_lat, max_lon
    FROM gps_tracks
    WHERE username = ? AND track_id = ?
    LIMIT 1
    """
    db.cursor.execute(select_sql, (username, track_id))
    result = db.cursor.fetchone()
    if not result:
        return None

    tid, user, gpx_blob, description, min_lat, min_lon, max_lat, max_lon = result
    return {
        "track_id": tid,
        "username": user,
        "gpx_data": gpx_blob,
        "description": description,
        "min_lat": min_lat,
        "min_lon": min_lon,
        "max_lat": max_lat,
        "max_lon": max_lon,
    }


