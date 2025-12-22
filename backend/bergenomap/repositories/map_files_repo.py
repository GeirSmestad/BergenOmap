from __future__ import annotations

from Database import Database

from bergenomap.repositories import maps_repo


def insert_original(db: Database, map_id: int, mapfile_original: bytes) -> None:
    insert_sql = """
    INSERT INTO map_files (map_id, mapfile_original)
    VALUES (?, ?)
    ON CONFLICT(map_id) DO UPDATE SET mapfile_original = excluded.mapfile_original
    """
    db.cursor.execute(insert_sql, (map_id, mapfile_original))
    db.connection.commit()


def insert_final(db: Database, map_id: int, mapfile_final: bytes) -> None:
    insert_sql = """
    INSERT INTO map_files (map_id, mapfile_final)
    VALUES (?, ?)
    ON CONFLICT(map_id) DO UPDATE SET mapfile_final = excluded.mapfile_final
    """
    db.cursor.execute(insert_sql, (map_id, mapfile_final))
    db.connection.commit()


def get_original_by_name(db: Database, map_name: str) -> bytes | None:
    map_id = maps_repo.get_map_id_by_name(db, map_name)
    if map_id is None:
        return None
    return get_original_by_id(db, map_id)


def get_final_by_name(db: Database, map_name: str) -> bytes | None:
    map_id = maps_repo.get_map_id_by_name(db, map_name)
    if map_id is None:
        return None
    return get_final_by_id(db, map_id)


def get_original_by_id(db: Database, map_id: int) -> bytes | None:
    select_sql = """
    SELECT mapfile_original
    FROM map_files
    WHERE map_id = ?
    """
    db.cursor.execute(select_sql, (map_id,))
    result = db.cursor.fetchone()
    return result[0] if result else None


def get_final_by_id(db: Database, map_id: int) -> bytes | None:
    select_sql = """
    SELECT mapfile_final
    FROM map_files
    WHERE map_id = ?
    """
    db.cursor.execute(select_sql, (map_id,))
    result = db.cursor.fetchone()
    return result[0] if result else None


