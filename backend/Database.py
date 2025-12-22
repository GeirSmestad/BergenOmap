from __future__ import annotations

import json
import os
import sqlite3

database_file_location = "../data/database.db"


class Database:
    """
    Thin DB handle.

    - Owns connection + cursor lifecycle
    - Owns schema creation
    - Keeps a small number of convenience wrappers used by scripts/admin endpoints

    All application DAL behavior (CRUD/query logic) should live in
    `backend/bergenomap/repositories/`.
    """

    def __init__(self, db_name: str = database_file_location):
        self.db_name = db_name
        self.connection = sqlite3.connect(db_name)
        self.cursor = self.connection.cursor()

    def create_table(self) -> None:
        create_maps_sql = """
        CREATE TABLE IF NOT EXISTS maps (
            map_id INTEGER PRIMARY KEY AUTOINCREMENT,
            map_name TEXT NOT NULL UNIQUE,
            nw_coords_lat REAL,
            nw_coords_lon REAL,
            se_coords_lat REAL,
            se_coords_lon REAL,
            optimal_rotation_angle REAL,
            overlay_width INTEGER,
            overlay_height INTEGER,
            attribution TEXT,
            selected_pixel_coords TEXT,
            selected_realworld_coords TEXT,
            map_filename TEXT,
            map_area TEXT,
            map_event TEXT,
            map_date TEXT,
            map_course TEXT,
            map_club TEXT,
            map_course_planner TEXT,
            map_attribution TEXT
        )
        """
        create_map_files_sql = """
        CREATE TABLE IF NOT EXISTS map_files (
            map_id INTEGER PRIMARY KEY,
            mapfile_original BLOB,
            mapfile_final BLOB,
            FOREIGN KEY (map_id) REFERENCES maps(map_id) ON DELETE CASCADE
        )
        """
        self.cursor.execute(create_maps_sql)
        self.cursor.execute(create_map_files_sql)
        self.create_users_table()
        self.create_gps_tracks_table()
        self.create_internal_kv_table()
        self.create_strava_tables()
        self.connection.commit()

    def create_users_table(self) -> None:
        create_users_sql = """
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY
        )
        """
        self.cursor.execute(create_users_sql)

    def create_gps_tracks_table(self) -> None:
        create_gps_tracks_sql = """
        CREATE TABLE IF NOT EXISTS gps_tracks (
            track_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            gpx_data BLOB NOT NULL,
            description TEXT,
            min_lat REAL,
            min_lon REAL,
            max_lat REAL,
            max_lon REAL,
            FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
        )
        """
        self.cursor.execute(create_gps_tracks_sql)
        self.create_sessions_table()

    def create_internal_kv_table(self) -> None:
        create_kv_sql = """
        CREATE TABLE IF NOT EXISTS internal_kv (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
        """
        self.cursor.execute(create_kv_sql)

    def create_strava_tables(self) -> None:
        create_connections_sql = """
        CREATE TABLE IF NOT EXISTS strava_connections (
            username TEXT PRIMARY KEY,
            athlete_id INTEGER,
            access_token TEXT,
            refresh_token TEXT,
            expires_at INTEGER,
            scope TEXT,
            connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            revoked_at DATETIME,
            FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
        )
        """
        create_activities_sql = """
        CREATE TABLE IF NOT EXISTS strava_activities (
            username TEXT NOT NULL,
            activity_id INTEGER NOT NULL,
            name TEXT,
            type TEXT,
            start_date TEXT,
            start_lat REAL,
            start_lon REAL,
            distance REAL,
            elapsed_time INTEGER,
            updated_at TEXT,
            last_fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            gpx_data BLOB NOT NULL,
            on_map_cached BOOLEAN,
            workout_type TEXT,
            description TEXT,
            PRIMARY KEY (username, activity_id),
            FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
        )
        """
        create_imports_sql = """
        CREATE TABLE IF NOT EXISTS strava_imports (
            username TEXT NOT NULL,
            activity_id INTEGER NOT NULL,
            imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            min_lat REAL,
            min_lon REAL,
            max_lat REAL,
            max_lon REAL,
            PRIMARY KEY (username, activity_id),
            FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
        )
        """
        self.cursor.execute(create_connections_sql)
        self.cursor.execute(create_activities_sql)
        self.cursor.execute(create_imports_sql)

    def create_sessions_table(self) -> None:
        create_sessions_sql = """
        CREATE TABLE IF NOT EXISTS sessions (
            session_key TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            FOREIGN KEY (username) REFERENCES users(username)
        )
        """
        self.cursor.execute(create_sessions_sql)

    def output_map_data_to_disk(
        self,
        js_output_dir: str,
        final_maps_output_dir: str,
        original_maps_output_dir: str,
        include_original: bool = False,
        overwrite: bool = False,
    ) -> None:
        """
        Convenience wrapper used by admin tooling.
        """
        from bergenomap.repositories import map_files_repo, maps_repo

        # Ensure the output directories exist
        os.makedirs(js_output_dir, exist_ok=True)
        os.makedirs(final_maps_output_dir, exist_ok=True)
        if include_original:
            os.makedirs(original_maps_output_dir, exist_ok=True)

        maps = maps_repo.list_maps(self)

        map_definitions: list[dict] = []
        for map_entry in maps:
            if map_entry.get("map_name") == "":
                continue

            map_definitions.append(
                {
                    "nw_coords": map_entry["nw_coords"],
                    "se_coords": map_entry["se_coords"],
                    "map_name": map_entry["map_name"],
                    "map_filename": map_entry["map_filename"],
                    "attribution": map_entry["attribution"],
                    "map_area": map_entry["map_area"],
                    "map_event": map_entry["map_event"],
                    "map_date": map_entry["map_date"],
                    "map_course": map_entry["map_course"],
                    "map_club": map_entry["map_club"],
                    "map_course_planner": map_entry["map_course_planner"],
                    "map_attribution": map_entry["map_attribution"],
                }
            )

            map_id = int(map_entry["map_id"])

            final_image_blob = map_files_repo.get_final_by_id(self, map_id)
            final_image_filename = os.path.join(final_maps_output_dir, map_entry["map_filename"])
            if (final_image_blob is not None) and (overwrite or not os.path.exists(final_image_filename)):
                with open(final_image_filename, "wb") as f:
                    f.write(final_image_blob)

            if include_original:
                original_image_blob = map_files_repo.get_original_by_id(self, map_id)
                if original_image_blob:
                    original_image_filename = os.path.join(
                        original_maps_output_dir, f"Original_{map_entry['map_filename']}"
                    )
                    if overwrite or not os.path.exists(original_image_filename):
                        with open(original_image_filename, "wb") as f:
                            f.write(original_image_blob)

        map_definitions_js = "const mapDefinitions = " + json.dumps(
            map_definitions, indent=2, ensure_ascii=False
        ) + ";"
        js_filepath = os.path.join(js_output_dir, "mapDefinitions.js")
        with open(js_filepath, "w", encoding="utf-8") as f:
            f.write(map_definitions_js)

    def close(self) -> None:
        self.connection.close()

 