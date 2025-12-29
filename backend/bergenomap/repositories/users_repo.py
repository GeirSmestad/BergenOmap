from __future__ import annotations

import sqlite3

from Database import Database


def ensure_user_exists(db: Database, username: str) -> None:
    insert_sql = """
    INSERT OR IGNORE INTO users (username)
    VALUES (?)
    """
    db.cursor.execute(insert_sql, (username,))
    db.connection.commit()


def create_user(db: Database, username: str, pw_hash: str) -> None:
    """
    Create a user.

    Note: `pw_hash` is plaintext for now (we'll switch to proper hashing later).
    """
    insert_sql = """
    INSERT INTO users (username, pw_hash)
    VALUES (?, ?)
    """
    try:
        db.cursor.execute(insert_sql, (username, pw_hash))
        db.connection.commit()
    except sqlite3.IntegrityError as exc:
        raise ValueError("User already exists") from exc


def get_user_by_username(db: Database, username: str) -> dict | None:
    select_sql = """
    SELECT username
    FROM users
    WHERE username = ?
    LIMIT 1
    """
    db.cursor.execute(select_sql, (username,))
    result = db.cursor.fetchone()
    return {"username": result[0]} if result else None


def get_user_with_pw_hash(db: Database, username: str) -> dict | None:
    select_sql = """
    SELECT username, pw_hash
    FROM users
    WHERE username = ?
    LIMIT 1
    """
    db.cursor.execute(select_sql, (username,))
    result = db.cursor.fetchone()
    if not result:
        return None
    uname, pw_hash = result
    return {"username": uname, "pw_hash": pw_hash}


