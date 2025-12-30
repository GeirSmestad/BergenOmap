"""
One-off utility to run two SQL scripts against the local SQLite database, one at a time,
with a confirmation prompt in between.

Default DB:      data/database.db
Scripts:         backend/db_migrations/010_add_maps_username_owner.sql
                 backend/db_migrations/011_backfill_maps_username_geir_smestad.sql

Usage:
  python scripts/run_oneoff_sql_010_011.py
  python scripts/run_oneoff_sql_010_011.py --db path/to/database.db
"""

from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path


def _prompt_yes_no(message: str) -> bool:
    answer = input(f"{message} [y/N]: ").strip().lower()
    return answer in ("y", "yes")


def _read_text_file(path: Path) -> str:
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        text = path.read_text(encoding="utf-8-sig")
    return text


def _run_sql_file(conn: sqlite3.Connection, sql_path: Path) -> None:
    sql = _read_text_file(sql_path)
    if not sql.strip():
        raise RuntimeError(f"SQL file is empty: {sql_path}")

    # Let the SQL file control transactions (BEGIN/COMMIT), if any.
    try:
        conn.executescript(sql)
    except Exception:
        # Best-effort rollback in case the script started a transaction.
        try:
            conn.execute("ROLLBACK;")
        except Exception:
            pass
        raise


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]

    parser = argparse.ArgumentParser(
        description="Run two one-off SQL scripts against a SQLite database, with a confirmation prompt in between."
    )
    parser.add_argument(
        "--db",
        default=str(repo_root / "data" / "database.db"),
        help="Path to SQLite database file (default: data/database.db)",
    )
    args = parser.parse_args()

    db_path = Path(args.db).expanduser().resolve()
    sql_010 = repo_root / "backend" / "db_migrations" / "010_add_maps_username_owner.sql"
    sql_011 = repo_root / "backend" / "db_migrations" / "011_backfill_maps_username_geir_smestad.sql"

    if not db_path.exists():
        print(f"ERROR: DB file not found: {db_path}", file=sys.stderr)
        return 2
    if not sql_010.exists():
        print(f"ERROR: SQL file not found: {sql_010}", file=sys.stderr)
        return 2
    if not sql_011.exists():
        print(f"ERROR: SQL file not found: {sql_011}", file=sys.stderr)
        return 2

    print("This will run SQL scripts against your SQLite DB:")
    print(f"  DB:  {db_path}")
    print(f"  1)   {sql_010}")
    print(f"  2)   {sql_011}")
    print()

    if not _prompt_yes_no("Proceed with script (1)?"):
        print("Aborted.")
        return 0

    # isolation_level=None => autocommit mode; lets SQL files manage BEGIN/COMMIT safely.
    conn = sqlite3.connect(str(db_path), isolation_level=None)
    try:
        print(f"Running: {sql_010.name} ...")
        _run_sql_file(conn, sql_010)
        print("Done (1).")
        print()

        if not _prompt_yes_no("Proceed with script (2)?"):
            print("Stopped after (1).")
            return 0

        print(f"Running: {sql_011.name} ...")
        _run_sql_file(conn, sql_011)
        print("Done (2).")

        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())


