from __future__ import annotations

from Database import Database


def insert_original(db: Database, map_id: int, mapfile_original: bytes) -> None:
    db.insert_mapfile_original(map_id, mapfile_original)


def insert_final(db: Database, map_id: int, mapfile_final: bytes) -> None:
    db.insert_mapfile_final(map_id, mapfile_final)


def get_original_by_name(db: Database, map_name: str) -> bytes | None:
    return db.get_mapfile_original(map_name)


def get_final_by_name(db: Database, map_name: str) -> bytes | None:
    return db.get_mapfile_final(map_name)


