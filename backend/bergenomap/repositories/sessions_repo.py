from __future__ import annotations

from datetime import datetime

from Database import Database


def create_session(db: Database, username: str, session_key: str, expires_at: datetime) -> None:
    insert_sql = """
    INSERT INTO sessions (session_key, username, expires_at)
    VALUES (?, ?, ?)
    """
    db.cursor.execute(insert_sql, (session_key, username, expires_at))
    db.connection.commit()


def validate_session(db: Database, session_key: str) -> dict | None:
    select_sql = """
    SELECT username, expires_at, is_active
    FROM sessions
    WHERE session_key = ?
    """
    db.cursor.execute(select_sql, (session_key,))
    result = db.cursor.fetchone()

    if not result:
        return None

    username, expires_at, is_active = result
    if not is_active:
        return None

    return {"username": username, "expires_at": expires_at, "is_active": is_active}


def deactivate_session(db: Database, session_key: str) -> None:
    update_sql = """
    UPDATE sessions
    SET is_active = 0
    WHERE session_key = ?
    """
    db.cursor.execute(update_sql, (session_key,))
    db.connection.commit()

