from __future__ import annotations

from typing import Any, Dict, List

from Database import Database


def insert_map(db: Database, map_data: Dict[str, Any]) -> int:
    return db.insert_map(map_data)


def list_maps(db: Database) -> List[Dict[str, Any]]:
    return db.list_maps()


