from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Initialize the BergenOmap SQLite schema (documentation + convenience)."
    )
    parser.add_argument(
        "--fresh",
        action="store_true",
        help="Delete the existing DB file before creating tables.",
    )
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    data_dir = repo_root / "data"
    db_path = data_dir / "database.db"

    os.makedirs(data_dir, exist_ok=True)

    if args.fresh and db_path.exists():
        db_path.unlink()

    # Import here so running this script doesn't require Flask.
    # `backend/` is not a Python package; add it to sys.path explicitly.
    sys.path.insert(0, str(repo_root / "backend"))
    from Database import Database

    db = Database(db_name=str(db_path))
    try:
        db.create_table()
    finally:
        db.close()

    print(f"Initialized DB schema at: {db_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


