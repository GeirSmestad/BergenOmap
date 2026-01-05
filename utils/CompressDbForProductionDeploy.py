"""
Compress the map database for production deployment.

Deletes all original map images from the database, saving ~50% disk space.

Lossless compression further reduces file size by approximately 30%.
Lossy compression further reduces file size by approximately 90%

The difference in file size between fast and slow compression is approximately 2x.
"""

import argparse
import os
import sqlite3
from concurrent.futures import ProcessPoolExecutor, as_completed
from io import BytesIO
from pathlib import Path

from PIL import Image

DB_PATH = Path(__file__).parent.parent / "data" / "database.db"
DEFAULT_QUALITY = 90
DEFAULT_METHOD = 0

SQL_DELETE_ORIGINALS = """
BEGIN TRANSACTION;
UPDATE map_files
SET mapfile_original = NULL
WHERE mapfile_original IS NOT NULL;
COMMIT;
"""


def convert_blob_to_webp(
    blob: bytes,
    *,
    quality: int = DEFAULT_QUALITY,
    method: int = DEFAULT_METHOD,
    lossless: bool = False,
) -> bytes:
    """Convert an encoded image blob into a WEBP blob."""
    with Image.open(BytesIO(blob)) as img:
        # Preserve alpha if image has it
        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")

        buffer = BytesIO()
        img.save(
            buffer,
            format="WEBP",
            quality=quality,
            method=method,
            lossless=lossless,
        )
        return buffer.getvalue()


def _compress_task(args: tuple) -> tuple:
    """
    Worker function for parallel compression.
    Returns (map_id, map_name, compressed_final, compressed_original, error_msg).
    """
    map_id, map_name, final_blob, original_blob, quality, method, lossless, keep_originals = args
    compressed_final = None
    compressed_original = None
    errors = []

    if final_blob:
        try:
            compressed_final = convert_blob_to_webp(
                final_blob, quality=quality, method=method, lossless=lossless
            )
        except Exception as exc:
            errors.append(f"map_id {map_id} final: {exc}")

    if keep_originals and original_blob:
        try:
            compressed_original = convert_blob_to_webp(
                original_blob, quality=quality, method=method, lossless=lossless
            )
        except Exception as exc:
            errors.append(f"map_id {map_id} original: {exc}")

    return (map_id, map_name, compressed_final, compressed_original, errors)


def compress_database(*, quality: int, method: int, lossless: bool, keep_originals: bool, workers: int):
    with sqlite3.connect(DB_PATH) as conn:
        if not keep_originals:
            conn.executescript(SQL_DELETE_ORIGINALS)

        rows = conn.execute(
            "SELECT m.map_id, m.map_name, mf.mapfile_final, mf.mapfile_original "
            "FROM map_files mf "
            "JOIN maps m ON m.map_id = mf.map_id "
            "WHERE mf.mapfile_final IS NOT NULL OR mf.mapfile_original IS NOT NULL"
        ).fetchall()

    # Prepare tasks with all needed parameters
    tasks = [
        (map_id, map_name, final_blob, original_blob, quality, method, lossless, keep_originals)
        for map_id, map_name, final_blob, original_blob in rows
    ]

    print(f"Compressing {len(tasks)} maps using {workers} workers...")

    converted_count = 0
    with ProcessPoolExecutor(max_workers=workers) as executor:
        futures = {executor.submit(_compress_task, task): task for task in tasks}

        with sqlite3.connect(DB_PATH) as conn:
            for future in as_completed(futures):
                map_id, map_name, compressed_final, compressed_original, errors = future.result()

                for err in errors:
                    print(f"Skipping {err}")

                if compressed_final or compressed_original:
                    if compressed_final and compressed_original:
                        conn.execute(
                            "UPDATE map_files SET mapfile_final = ?, mapfile_original = ? WHERE map_id = ?",
                            (compressed_final, compressed_original, map_id),
                        )
                    elif compressed_final:
                        conn.execute(
                            "UPDATE map_files SET mapfile_final = ? WHERE map_id = ?",
                            (compressed_final, map_id),
                        )
                    elif compressed_original:
                        conn.execute(
                            "UPDATE map_files SET mapfile_original = ? WHERE map_id = ?",
                            (compressed_original, map_id),
                        )
                    converted_count += 1
                    print(f"Converted #{converted_count}: {map_name}")

            conn.commit()

    # VACUUM must be executed outside the transaction above
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("VACUUM;")


def prompt_confirmation(keep_originals: bool) -> bool:
    """Warn the operator since this permanently mutates every map."""
    if keep_originals:
         warning = (
            "WARNING: this will convert every map image (original and final) in database.db "
            "to WEBP. Type 'y' to continue: "
        )
    else:
        warning = (
            "WARNING: this will delete all original map blobs from database.db "
            "and convert every final map image to WEBP. Type 'y' to continue: "
        )
    response = input(warning)
    if response.strip().lower() not in {"y", "yes"}:
        print("Aborted by user; no changes were made.")
        return False
    return True


def _quality_value(value: str) -> int:
    quality = int(value)
    if not 0 <= quality <= 100:
        raise argparse.ArgumentTypeError("quality must be between 0 and 100")
    return quality


def _method_value(value: str) -> int:
    method = int(value)
    if not 0 <= method <= 6:
        raise argparse.ArgumentTypeError("method must be between 0 and 6")
    return method


def parse_cli_args():
    parser = argparse.ArgumentParser(
        description="Delete original map images and WEBP-compress final images."
    )
    parser.add_argument(
        "--quality",
        type=_quality_value,
        default=None,
        help=f"WEBP quality (0-100). Defaults to {DEFAULT_QUALITY}.",
    )
    parser.add_argument(
        "--method",
        type=_method_value,
        default=None,
        help=f"WEBP compression method (0-6). Defaults to {DEFAULT_METHOD}.",
    )
    parser.add_argument(
        "--lossless",
        action="store_true",
        help="Enable lossless WEBP compression (quality is ignored).",
    )
    parser.add_argument(
        "--keep-originals",
        action="store_true",
        help="Compress original maps instead of deleting them.",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=None,
        help=f"Number of parallel workers. Defaults to CPU count ({os.cpu_count()}).",
    )
    return parser.parse_args()


if __name__ == "__main__":
    print("Preparing to compress map database for production deployment.")
    args = parse_cli_args()
    quality = args.quality if args.quality is not None else DEFAULT_QUALITY
    method = args.method if args.method is not None else DEFAULT_METHOD
    workers = args.workers if args.workers is not None else os.cpu_count()

    flags_used = (
        args.quality is not None or args.method is not None or args.lossless or args.keep_originals
    )
    if flags_used or prompt_confirmation(args.keep_originals):
        compress_database(
            quality=quality,
            method=method,
            lossless=args.lossless,
            keep_originals=args.keep_originals,
            workers=workers,
        )
