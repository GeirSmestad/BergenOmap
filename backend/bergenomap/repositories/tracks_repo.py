from __future__ import annotations

from Database import Database


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
    return db.insert_gps_track(
        username,
        gpx_data,
        description,
        min_lat=min_lat,
        min_lon=min_lon,
        max_lat=max_lat,
        max_lon=max_lon,
    )


def list_gps_tracks(db: Database, username: str) -> list[dict]:
    return db.list_gps_tracks(username)


def get_gps_track_by_id(db: Database, username: str, track_id: int) -> dict | None:
    return db.get_gps_track_by_id(username, track_id)


