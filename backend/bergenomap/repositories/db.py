from __future__ import annotations

from flask import g

from Database import Database


def get_db() -> Database:
    if "db" not in g:
        g.db = Database()
    return g.db


def close_db(exception: Exception | None = None) -> None:
    db = g.pop("db", None)
    if db is not None:
        db.close()


