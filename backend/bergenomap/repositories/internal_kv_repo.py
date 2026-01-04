from __future__ import annotations

from Database import Database

OPENAI_API_KEY_KEY = "OPENAI_API_KEY"


def kv_get(db: Database, key: str) -> str | None:
    select_sql = """
    SELECT value
    FROM internal_kv
    WHERE key = ?
    LIMIT 1
    """
    db.cursor.execute(select_sql, (key,))
    row = db.cursor.fetchone()
    return row[0] if row else None


def kv_set(db: Database, key: str, value: str) -> None:
    insert_sql = """
    INSERT INTO internal_kv (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
    """
    db.cursor.execute(insert_sql, (key, value))
    db.connection.commit()


