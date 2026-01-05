"""
Backfill map metadata from OCR + AI (CLI tool).

This is the primary tuning/debugging entrypoint. It is intentionally runnable
from a terminal without starting the web server.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


def _add_backend_to_syspath(repo_root: Path) -> None:
    # `backend/` is not a package; add it to sys.path.
    backend_dir = repo_root / "backend"
    sys.path.insert(0, str(backend_dir))


def _parse_args(repo_root: Path) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run OCR + AI metadata extraction for selected maps.")
    parser.add_argument(
        "--db",
        default=str(repo_root / "data" / "database.db"),
        help="Path to SQLite database file (default: data/database.db)",
    )

    select = parser.add_argument_group("Selection")
    select.add_argument("--all", action="store_true", help="Process all maps.")
    select.add_argument("--map-name", action="append", default=[], help="Process a map by name (repeatable).")
    select.add_argument("--id-min", type=int, default=None, help="Minimum map_id (inclusive).")
    select.add_argument("--id-max", type=int, default=None, help="Maximum map_id (inclusive).")
    select.add_argument("--limit", type=int, default=None, help="Maximum number of maps to process.")

    parser.add_argument("--dry-run", action="store_true", help="Do not write changes to DB.")

    debug = parser.add_argument_group("Debug / tuning")
    debug.add_argument("--debug-print-ocr", action="store_true", help="Print OCR text groups to console.")
    debug.add_argument(
        "--debug-image-out",
        default=None,
        help=(
            "Write an annotated image with OCR text regions marked. "
            "If multiple maps are processed, this can be a directory or a template containing "
            "{map_id} and/or {map_name}."
        ),
    )

    parser.add_argument(
        "--openai-api-key",
        default=None,
        help=(
            "OpenAI API key to use for this run. If provided, it will be stored in internal_kv as "
            "OPENAI_API_KEY for future runs."
        ),
    )

    return parser.parse_args()


def _validate_selection(args: argparse.Namespace) -> None:
    has_selection = bool(args.all or args.map_name or (args.id_min is not None) or (args.id_max is not None))
    if not has_selection:
        raise SystemExit("ERROR: provide a selection (e.g. --all, --map-name ..., or --id-min/--id-max)")


def _normalize_debug_image_out(path_str: str | None) -> str | None:
    if not path_str:
        return None
    return str(Path(path_str).expanduser())


def _resolve_debug_image_path(template_or_dir: str, *, map_id: int, map_name: str) -> Path:
    p = Path(template_or_dir)
    safe = "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in map_name)[:80]

    # Treat as a directory if it exists as a dir, or if it looks like a dir path (no suffix).
    if (p.exists() and p.is_dir()) or (p.suffix.lower() not in (".png", ".jpg", ".jpeg", ".webp") and "{" not in template_or_dir):
        return p / f"ocr_{map_id}_{safe}.png"

    if "{map_id}" in template_or_dir or "{map_name}" in template_or_dir:
        return Path(template_or_dir.format(map_id=map_id, map_name=safe))

    # Single output file path. If multiple maps are processed, later ones will overwrite.
    return Path(template_or_dir)


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    args = _parse_args(repo_root)
    _validate_selection(args)

    db_path = Path(args.db).expanduser().resolve()
    if not db_path.exists():
        print(f"ERROR: DB file not found: {db_path}", file=sys.stderr)
        return 2

    _add_backend_to_syspath(repo_root)

    from Database import Database
    from bergenomap.repositories import map_files_repo, maps_repo
    from bergenomap.services.map_metadata_ocr_pipeline import run_map_metadata_pipeline
    from bergenomap.services.map_ocr_service import annotate_text_groups, TesseractOcrEngine
    from PIL import Image
    import io

    debug_out = _normalize_debug_image_out(args.debug_image_out)

    db = Database(db_name=str(db_path))
    try:
        openai_api_key = _resolve_openai_api_key(db, cli_value=args.openai_api_key)
        if openai_api_key:
            print("OpenAI: enabled (api key loaded from internal_kv or CLI)")
        else:
            print("OpenAI: disabled (no api key in internal_kv and no --openai-api-key provided)")

        selected = _select_maps(
            db,
            all_maps=bool(args.all),
            map_names=list(args.map_name or []),
            id_min=args.id_min,
            id_max=args.id_max,
            limit=args.limit,
        )
        if not selected:
            print("No maps matched selection.")
            return 0

        print(f"Selected {len(selected)} map(s). dry_run={args.dry_run}")

        engine = TesseractOcrEngine()

        updated = 0
        for entry in selected:
            map_id = int(entry["map_id"])
            map_name = str(entry["map_name"])
            username = str(entry["username"])

            blob = map_files_repo.get_original_by_id(db, map_id)
            if not blob:
                print(f"- map_id={map_id} name={map_name}: missing original map image; skipping")
                continue

            try:
                image = Image.open(io.BytesIO(blob))
            except Exception as exc:
                print(f"- map_id={map_id} name={map_name}: failed to decode image: {exc}; skipping")
                continue

            result = run_map_metadata_pipeline(image, ocr_engine=engine, openai_api_key=openai_api_key)

            print(f"- map_id={map_id} name={map_name}")
            if args.debug_print_ocr:
                _print_ocr_groups(result.ocr_groups)
            print(f"  parsed: {result.metadata}")

            if debug_out:
                try:
                    groups = engine.extract_text_groups(image)
                    annotated = annotate_text_groups(image, groups)
                    out_path = _resolve_debug_image_path(debug_out, map_id=map_id, map_name=map_name)
                    out_path.parent.mkdir(parents=True, exist_ok=True)
                    annotated.save(out_path)
                    print(f"  debug_image: {out_path}")
                except Exception as exc:
                    print(f"  debug_image: failed to write ({exc})")

            if args.dry_run:
                continue

            try:
                did_update = maps_repo.update_map_metadata_if_default(
                    db,
                    username=username,
                    map_id=map_id,
                    metadata=result.metadata,
                )
            except Exception as exc:
                print(f"  db_update: FAILED ({exc})")
                continue

            if did_update:
                updated += 1
                print("  db_update: updated")
            else:
                print("  db_update: no changes (fields already set)")

        print(f"Done. Updated {updated}/{len(selected)} map(s).")
        return 0
    finally:
        db.close()


def _select_maps(
    db,
    *,
    all_maps: bool,
    map_names: list[str],
    id_min: int | None,
    id_max: int | None,
    limit: int | None,
) -> list[dict]:
    where = []
    params: list[object] = []

    if map_names:
        placeholders = ",".join(["?"] * len(map_names))
        where.append(f"map_name IN ({placeholders})")
        params.extend(map_names)

    if id_min is not None:
        where.append("map_id >= ?")
        params.append(int(id_min))
    if id_max is not None:
        where.append("map_id <= ?")
        params.append(int(id_max))

    sql = "SELECT map_id, username, map_name FROM maps"
    if not all_maps and where:
        sql += " WHERE " + " AND ".join(where)
    elif not all_maps and not where:
        # Should be prevented by _validate_selection(), but keep safe.
        sql += " WHERE 1=0"

    sql += " ORDER BY map_id ASC"
    if limit is not None:
        sql += " LIMIT ?"
        params.append(int(limit))

    db.cursor.execute(sql, tuple(params))
    return [{"map_id": r[0], "username": r[1], "map_name": r[2]} for r in db.cursor.fetchall()]


def _print_ocr_groups(groups: list[dict]) -> None:
    if not groups:
        print("  ocr_groups: []")
        return
    print(f"  ocr_groups ({len(groups)}):")
    for g in groups[:500]:
        text = str(g.get("text") or "").strip().replace("\n", " ")
        bbox = g.get("bbox")
        conf = g.get("conf")
        print(f"    - conf={conf} bbox={bbox} text={text!r}")
    if len(groups) > 500:
        print(f"    ... ({len(groups) - 500} more)")


def _resolve_openai_api_key(db, *, cli_value: str | None) -> str | None:
    """
    Read OpenAI API key from internal_kv, optionally overriding (and persisting) via CLI flag.
    """

    from bergenomap.repositories.internal_kv_repo import OPENAI_API_KEY_KEY

    if cli_value is not None:
        value = str(cli_value).strip()
        if value:
            from bergenomap.repositories import internal_kv_repo

            internal_kv_repo.kv_set(db, OPENAI_API_KEY_KEY, value)
            return value
        return None

    from bergenomap.repositories import internal_kv_repo

    value = internal_kv_repo.kv_get(db, OPENAI_API_KEY_KEY)
    return value.strip() if isinstance(value, str) and value.strip() else None


if __name__ == "__main__":
    raise SystemExit(main())


