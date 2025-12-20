from __future__ import annotations

from Database import Database


def ensure_user_exists(db: Database, username: str) -> None:
    db.ensure_user_exists(username)


def get_user_by_username(db: Database, username: str) -> dict | None:
    return db.get_user_by_username(username)


