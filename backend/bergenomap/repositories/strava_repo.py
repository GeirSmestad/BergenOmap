from __future__ import annotations

from Database import Database


def kv_get(db: Database, key: str) -> str | None:
    return db.kv_get(key)


def kv_set(db: Database, key: str, value: str) -> None:
    db.kv_set(key, value)


def get_connection(db: Database, username: str) -> dict | None:
    return db.get_strava_connection(username)


def upsert_connection(
    db: Database,
    username: str,
    *,
    athlete_id: int | None,
    access_token: str | None,
    refresh_token: str | None,
    expires_at: int | None,
    scope: str | None,
) -> None:
    db.upsert_strava_connection(
        username,
        athlete_id=athlete_id,
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=expires_at,
        scope=scope,
    )


def disconnect(db: Database, username: str) -> None:
    db.disconnect_strava(username)


def upsert_activity(
    db: Database,
    username: str,
    *,
    activity_id: int,
    name: str | None,
    activity_type: str | None,
    start_date: str | None,
    start_lat: float | None,
    start_lon: float | None,
    distance: float | None,
    elapsed_time: int | None,
    updated_at: str | None,
    gpx_data: bytes,
    workout_type: str | None = None,
    description: str | None = None,
) -> None:
    db.upsert_strava_activity(
        username,
        activity_id=activity_id,
        name=name,
        activity_type=activity_type,
        start_date=start_date,
        start_lat=start_lat,
        start_lon=start_lon,
        distance=distance,
        elapsed_time=elapsed_time,
        updated_at=updated_at,
        gpx_data=gpx_data,
        workout_type=workout_type,
        description=description,
    )


def list_activities(db: Database, username: str) -> list[dict]:
    return db.list_strava_activities(username)


def get_activity_gpx(db: Database, username: str, activity_id: int) -> bytes | None:
    return db.get_strava_activity_gpx(username, activity_id)


def set_activity_gpx(db: Database, username: str, activity_id: int, gpx_data: bytes) -> None:
    db.set_strava_activity_gpx(username, activity_id, gpx_data)


def clear_activity_gpx(db: Database, username: str, activity_id: int) -> None:
    db.clear_strava_activity_gpx(username, activity_id)


def upsert_import(
    db: Database,
    username: str,
    *,
    activity_id: int,
    min_lat: float | None,
    min_lon: float | None,
    max_lat: float | None,
    max_lon: float | None,
) -> None:
    db.upsert_strava_import(
        username,
        activity_id=activity_id,
        min_lat=min_lat,
        min_lon=min_lon,
        max_lat=max_lat,
        max_lon=max_lon,
    )


def list_imports(db: Database, username: str) -> list[dict]:
    return db.list_strava_imports(username)


def list_imports_with_details(db: Database, username: str) -> list[dict]:
    return db.list_strava_imports_with_details(username)


def delete_import(db: Database, username: str, activity_id: int) -> None:
    db.delete_strava_import(username, activity_id)


