from __future__ import annotations

from datetime import datetime

from Database import Database


def create_session(db: Database, username: str, session_key: str, expires_at: datetime) -> None:
    db.create_session(username, session_key, expires_at)


def validate_session(db: Database, session_key: str) -> dict | None:
    return db.validate_session(session_key)


