from __future__ import annotations

from Database import Database

from bergenomap.repositories import internal_kv_repo
from bergenomap.repositories import users_repo


def kv_get(db: Database, key: str) -> str | None:
    return internal_kv_repo.kv_get(db, key)


def kv_set(db: Database, key: str, value: str) -> None:
    internal_kv_repo.kv_set(db, key, value)


def get_connection(db: Database, username: str) -> dict | None:
    select_sql = """
    SELECT username, athlete_id, access_token, refresh_token, expires_at, scope, connected_at, updated_at, revoked_at
    FROM strava_connections
    WHERE username = ?
    LIMIT 1
    """
    db.cursor.execute(select_sql, (username,))
    row = db.cursor.fetchone()
    if not row:
        return None
    (
        username,
        athlete_id,
        access_token,
        refresh_token,
        expires_at,
        scope,
        connected_at,
        updated_at,
        revoked_at,
    ) = row
    return {
        "username": username,
        "athlete_id": athlete_id,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_at": expires_at,
        "scope": scope,
        "connected_at": connected_at,
        "updated_at": updated_at,
        "revoked_at": revoked_at,
    }


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
    if not users_repo.get_user_by_username(db, username):
        raise ValueError(
            f"User '{username}' does not exist. Create the user before inserting Strava connections."
        )

    insert_sql = """
    INSERT INTO strava_connections (
        username, athlete_id, access_token, refresh_token, expires_at, scope, connected_at, updated_at, revoked_at
    )
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL)
    ON CONFLICT(username) DO UPDATE SET
        athlete_id = excluded.athlete_id,
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        expires_at = excluded.expires_at,
        scope = excluded.scope,
        updated_at = CURRENT_TIMESTAMP,
        revoked_at = NULL
    """
    db.cursor.execute(
        insert_sql,
        (username, athlete_id, access_token, refresh_token, expires_at, scope),
    )
    db.connection.commit()


def disconnect(db: Database, username: str) -> None:
    update_sql = """
    UPDATE strava_connections
    SET
        access_token = NULL,
        refresh_token = NULL,
        expires_at = NULL,
        updated_at = CURRENT_TIMESTAMP,
        revoked_at = CURRENT_TIMESTAMP
    WHERE username = ?
    """
    db.cursor.execute(update_sql, (username,))
    db.connection.commit()


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
    if not users_repo.get_user_by_username(db, username):
        raise ValueError(
            f"User '{username}' does not exist. Create the user before inserting Strava activities."
        )

    insert_sql = """
    INSERT INTO strava_activities (
        username, activity_id, name, type, start_date, start_lat, start_lon,
        distance, elapsed_time, updated_at, last_fetched_at, gpx_data, on_map_cached,
        workout_type, description
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, NULL, ?, ?)
    ON CONFLICT(username, activity_id) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        start_date = excluded.start_date,
        start_lat = excluded.start_lat,
        start_lon = excluded.start_lon,
        distance = excluded.distance,
        elapsed_time = excluded.elapsed_time,
        updated_at = excluded.updated_at,
        last_fetched_at = CURRENT_TIMESTAMP,
        workout_type = excluded.workout_type,
        description = excluded.description
    """
    db.cursor.execute(
        insert_sql,
        (
            username,
            activity_id,
            name,
            activity_type,
            start_date,
            start_lat,
            start_lon,
            distance,
            elapsed_time,
            updated_at,
            gpx_data,
            workout_type,
            description,
        ),
    )
    db.connection.commit()


def list_activities(db: Database, username: str) -> list[dict]:
    select_sql = """
    SELECT
        a.activity_id,
        a.name,
        a.type,
        a.start_date,
        a.start_lat,
        a.start_lon,
        a.distance,
        a.elapsed_time,
        a.updated_at,
        a.last_fetched_at,
        length(a.gpx_data) as gpx_len,
        a.workout_type,
        a.description
    FROM strava_activities a
    WHERE a.username = ?
    ORDER BY a.start_date DESC
    """
    db.cursor.execute(select_sql, (username,))
    rows = db.cursor.fetchall()
    results: list[dict] = []
    for row in rows:
        (
            activity_id,
            name,
            activity_type,
            start_date,
            start_lat,
            start_lon,
            distance,
            elapsed_time,
            updated_at,
            last_fetched_at,
            gpx_len,
            workout_type,
            description,
        ) = row
        results.append(
            {
                "activity_id": activity_id,
                "name": name,
                "type": activity_type,
                "start_date": start_date,
                "start_lat": start_lat,
                "start_lon": start_lon,
                "distance": distance,
                "elapsed_time": elapsed_time,
                "updated_at": updated_at,
                "last_fetched_at": last_fetched_at,
                "has_gpx": bool(gpx_len and gpx_len > 0),
                "workout_type": workout_type,
                "description": description,
            }
        )
    return results


def get_activity_gpx(db: Database, username: str, activity_id: int) -> bytes | None:
    select_sql = """
    SELECT gpx_data
    FROM strava_activities
    WHERE username = ? AND activity_id = ?
    LIMIT 1
    """
    db.cursor.execute(select_sql, (username, activity_id))
    row = db.cursor.fetchone()
    return row[0] if row else None


def set_activity_gpx(db: Database, username: str, activity_id: int, gpx_data: bytes) -> None:
    update_sql = """
    UPDATE strava_activities
    SET gpx_data = ?, last_fetched_at = CURRENT_TIMESTAMP
    WHERE username = ? AND activity_id = ?
    """
    db.cursor.execute(update_sql, (gpx_data, username, activity_id))
    db.connection.commit()


def clear_activity_gpx(db: Database, username: str, activity_id: int) -> None:
    update_sql = """
    UPDATE strava_activities
    SET gpx_data = ?
    WHERE username = ? AND activity_id = ?
    """
    db.cursor.execute(update_sql, (b"", username, activity_id))
    db.connection.commit()


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
    insert_sql = """
    INSERT INTO strava_imports (
        username, activity_id, imported_at, last_imported_at, min_lat, min_lon, max_lat, max_lon
    )
    VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ?, ?)
    ON CONFLICT(username, activity_id) DO UPDATE SET
        last_imported_at = CURRENT_TIMESTAMP,
        min_lat = excluded.min_lat,
        min_lon = excluded.min_lon,
        max_lat = excluded.max_lat,
        max_lon = excluded.max_lon
    """
    db.cursor.execute(insert_sql, (username, activity_id, min_lat, min_lon, max_lat, max_lon))
    db.connection.commit()


def list_imports(db: Database, username: str) -> list[dict]:
    select_sql = """
    SELECT activity_id, imported_at, last_imported_at, min_lat, min_lon, max_lat, max_lon
    FROM strava_imports
    WHERE username = ?
    ORDER BY last_imported_at DESC
    """
    db.cursor.execute(select_sql, (username,))
    rows = db.cursor.fetchall()
    return [
        {
            "activity_id": activity_id,
            "imported_at": imported_at,
            "last_imported_at": last_imported_at,
            "min_lat": min_lat,
            "min_lon": min_lon,
            "max_lat": max_lat,
            "max_lon": max_lon,
        }
        for (activity_id, imported_at, last_imported_at, min_lat, min_lon, max_lat, max_lon) in rows
    ]


def list_imports_with_details(db: Database, username: str) -> list[dict]:
    # Canonical implementation (Database.py had two duplicates; keep the last_imported_at ordering)
    select_sql = """
    SELECT
        i.activity_id,
        a.name,
        a.type,
        a.start_date,
        i.min_lat,
        i.min_lon,
        i.max_lat,
        i.max_lon
    FROM strava_imports i
    JOIN strava_activities a ON i.username = a.username AND i.activity_id = a.activity_id
    WHERE i.username = ?
    ORDER BY i.last_imported_at DESC
    """
    db.cursor.execute(select_sql, (username,))
    rows = db.cursor.fetchall()
    return [
        {
            "activity_id": activity_id,
            "name": name,
            "type": activity_type,
            "start_date": start_date,
            "min_lat": min_lat,
            "min_lon": min_lon,
            "max_lat": max_lat,
            "max_lon": max_lon,
        }
        for (activity_id, name, activity_type, start_date, min_lat, min_lon, max_lat, max_lon) in rows
    ]


def delete_import(db: Database, username: str, activity_id: int) -> None:
    delete_sql = """
    DELETE FROM strava_imports
    WHERE username = ? AND activity_id = ?
    """
    db.cursor.execute(delete_sql, (username, activity_id))
    db.connection.commit()


