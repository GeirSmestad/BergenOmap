from __future__ import annotations

from Database import Database


def ensure_user_exists(db: Database, username: str) -> None:
    insert_sql = """
    INSERT OR IGNORE INTO users (username)
    VALUES (?)
    """
    db.cursor.execute(insert_sql, (username,))
    db.connection.commit()


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


