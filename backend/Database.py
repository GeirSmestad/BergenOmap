import sqlite3
import json
import os 

database_file_location = '../data/database.db'

class Database:
    def __init__(self, db_name=database_file_location):
        self.connection = sqlite3.connect(db_name)
        self.cursor = self.connection.cursor()

    def create_table(self):
        create_maps_sql = '''
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
        '''
        create_map_files_sql = '''
        CREATE TABLE IF NOT EXISTS map_files (
            map_id INTEGER PRIMARY KEY,
            mapfile_original BLOB,
            mapfile_final BLOB,
            FOREIGN KEY (map_id) REFERENCES maps(map_id) ON DELETE CASCADE
        )
        '''
        self.cursor.execute(create_maps_sql)
        self.cursor.execute(create_map_files_sql)
        self.create_users_table()
        self.create_gps_tracks_table()
        self.create_internal_kv_table()
        self.create_strava_tables()
        self.connection.commit()

    def create_users_table(self):
        create_users_sql = '''
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY
        )
        '''
        self.cursor.execute(create_users_sql)

    def create_gps_tracks_table(self):
        create_gps_tracks_sql = '''
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
        '''
        self.cursor.execute(create_gps_tracks_sql)
        self.create_sessions_table()

    def create_internal_kv_table(self):
        create_kv_sql = '''
        CREATE TABLE IF NOT EXISTS internal_kv (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
        '''
        self.cursor.execute(create_kv_sql)

    def create_strava_tables(self):
        create_connections_sql = '''
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
        '''
        create_activities_sql = '''
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
            PRIMARY KEY (username, activity_id),
            FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
        )
        '''
        create_imports_sql = '''
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
        '''
        self.cursor.execute(create_connections_sql)
        self.cursor.execute(create_activities_sql)
        self.cursor.execute(create_imports_sql)

    def kv_set(self, key: str, value: str) -> None:
        insert_sql = '''
        INSERT INTO internal_kv (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
        '''
        self.cursor.execute(insert_sql, (key, value))
        self.connection.commit()

    def kv_get(self, key: str):
        select_sql = '''
        SELECT value
        FROM internal_kv
        WHERE key = ?
        LIMIT 1
        '''
        self.cursor.execute(select_sql, (key,))
        row = self.cursor.fetchone()
        return row[0] if row else None

    def get_strava_connection(self, username: str):
        select_sql = '''
        SELECT username, athlete_id, access_token, refresh_token, expires_at, scope, connected_at, updated_at, revoked_at
        FROM strava_connections
        WHERE username = ?
        LIMIT 1
        '''
        self.cursor.execute(select_sql, (username,))
        row = self.cursor.fetchone()
        if not row:
            return None
        (username, athlete_id, access_token, refresh_token, expires_at, scope, connected_at, updated_at, revoked_at) = row
        return {
            "username": username,
            "athlete_id": athlete_id,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_at": expires_at,
            "scope": scope,
            "connected_at": connected_at,
            "updated_at": updated_at,
            "revoked_at": revoked_at,
        }

    def upsert_strava_connection(
        self,
        username: str,
        *,
        athlete_id: int | None,
        access_token: str | None,
        refresh_token: str | None,
        expires_at: int | None,
        scope: str | None,
    ) -> None:
        if not self.get_user_by_username(username):
            raise ValueError(f"User '{username}' does not exist. Create the user before inserting Strava connections.")

        insert_sql = '''
        INSERT INTO strava_connections (
            username, athlete_id, access_token, refresh_token, expires_at, scope, connected_at, updated_at, revoked_at
        )
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL)
        ON CONFLICT(username) DO UPDATE SET
            athlete_id = excluded.athlete_id,
            access_token = excluded.access_token,
            refresh_token = excluded.refresh_token,
            expires_at = excluded.expires_at,
            scope = excluded.scope,
            updated_at = CURRENT_TIMESTAMP,
            revoked_at = NULL
        '''
        self.cursor.execute(
            insert_sql,
            (username, athlete_id, access_token, refresh_token, expires_at, scope),
        )
        self.connection.commit()

    def disconnect_strava(self, username: str) -> None:
        update_sql = '''
        UPDATE strava_connections
        SET
            access_token = NULL,
            refresh_token = NULL,
            expires_at = NULL,
            updated_at = CURRENT_TIMESTAMP,
            revoked_at = CURRENT_TIMESTAMP
        WHERE username = ?
        '''
        self.cursor.execute(update_sql, (username,))
        self.connection.commit()

    def upsert_strava_activity(
        self,
        username: str,
        *,
        activity_id: int,
        name: str | None,
        activity_type: str | None,
        start_date: str | None,
        start_lat: float | None,
        start_lon: float | None,
        distance: float | None,
        elapsed_time: int | None,
        updated_at: str | None,
        gpx_data: bytes,
    ) -> None:
        if not self.get_user_by_username(username):
            raise ValueError(f"User '{username}' does not exist. Create the user before inserting Strava activities.")

        insert_sql = '''
        INSERT INTO strava_activities (
            username, activity_id, name, type, start_date, start_lat, start_lon,
            distance, elapsed_time, updated_at, last_fetched_at, gpx_data, on_map_cached
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, NULL)
        ON CONFLICT(username, activity_id) DO UPDATE SET
            name = excluded.name,
            type = excluded.type,
            start_date = excluded.start_date,
            start_lat = excluded.start_lat,
            start_lon = excluded.start_lon,
            distance = excluded.distance,
            elapsed_time = excluded.elapsed_time,
            updated_at = excluded.updated_at,
            last_fetched_at = CURRENT_TIMESTAMP
        '''
        self.cursor.execute(
            insert_sql,
            (
                username,
                activity_id,
                name,
                activity_type,
                start_date,
                start_lat,
                start_lon,
                distance,
                elapsed_time,
                updated_at,
                gpx_data,
            ),
        )
        self.connection.commit()

    def set_strava_activity_gpx(self, username: str, activity_id: int, gpx_data: bytes) -> None:
        update_sql = '''
        UPDATE strava_activities
        SET gpx_data = ?, last_fetched_at = CURRENT_TIMESTAMP
        WHERE username = ? AND activity_id = ?
        '''
        self.cursor.execute(update_sql, (gpx_data, username, activity_id))
        self.connection.commit()

    def clear_strava_activity_gpx(self, username: str, activity_id: int) -> None:
        update_sql = '''
        UPDATE strava_activities
        SET gpx_data = ?
        WHERE username = ? AND activity_id = ?
        '''
        self.cursor.execute(update_sql, (b"", username, activity_id))
        self.connection.commit()

    def list_strava_activities(self, username: str):
        select_sql = '''
        SELECT
            a.activity_id,
            a.name,
            a.type,
            a.start_date,
            a.start_lat,
            a.start_lon,
            a.distance,
            a.elapsed_time,
            a.updated_at,
            a.last_fetched_at,
            length(a.gpx_data) as gpx_len
        FROM strava_activities a
        WHERE a.username = ?
        ORDER BY a.start_date DESC
        '''
        self.cursor.execute(select_sql, (username,))
        rows = self.cursor.fetchall()
        results = []
        for row in rows:
            (
                activity_id,
                name,
                activity_type,
                start_date,
                start_lat,
                start_lon,
                distance,
                elapsed_time,
                updated_at,
                last_fetched_at,
                gpx_len,
            ) = row
            results.append(
                {
                    "activity_id": activity_id,
                    "name": name,
                    "type": activity_type,
                    "start_date": start_date,
                    "start_lat": start_lat,
                    "start_lon": start_lon,
                    "distance": distance,
                    "elapsed_time": elapsed_time,
                    "updated_at": updated_at,
                    "last_fetched_at": last_fetched_at,
                    "has_gpx": bool(gpx_len and gpx_len > 0),
                }
            )
        return results

    def get_strava_activity_gpx(self, username: str, activity_id: int):
        select_sql = '''
        SELECT gpx_data
        FROM strava_activities
        WHERE username = ? AND activity_id = ?
        LIMIT 1
        '''
        self.cursor.execute(select_sql, (username, activity_id))
        row = self.cursor.fetchone()
        return row[0] if row else None

    def upsert_strava_import(
        self,
        username: str,
        *,
        activity_id: int,
        min_lat: float | None,
        min_lon: float | None,
        max_lat: float | None,
        max_lon: float | None,
    ) -> None:
        insert_sql = '''
        INSERT INTO strava_imports (
            username, activity_id, imported_at, last_imported_at, min_lat, min_lon, max_lat, max_lon
        )
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ?, ?)
        ON CONFLICT(username, activity_id) DO UPDATE SET
            last_imported_at = CURRENT_TIMESTAMP,
            min_lat = excluded.min_lat,
            min_lon = excluded.min_lon,
            max_lat = excluded.max_lat,
            max_lon = excluded.max_lon
        '''
        self.cursor.execute(insert_sql, (username, activity_id, min_lat, min_lon, max_lat, max_lon))
        self.connection.commit()

    def list_strava_imports(self, username: str):
        select_sql = '''
        SELECT activity_id, imported_at, last_imported_at, min_lat, min_lon, max_lat, max_lon
        FROM strava_imports
        WHERE username = ?
        ORDER BY last_imported_at DESC
        '''
        self.cursor.execute(select_sql, (username,))
        rows = self.cursor.fetchall()
        return [
            {
                "activity_id": activity_id,
                "imported_at": imported_at,
                "last_imported_at": last_imported_at,
                "min_lat": min_lat,
                "min_lon": min_lon,
                "max_lat": max_lat,
                "max_lon": max_lon,
            }
            for (activity_id, imported_at, last_imported_at, min_lat, min_lon, max_lat, max_lon) in rows
        ]

    def list_strava_imports_with_details(self, username: str):
        select_sql = '''
        SELECT 
            i.activity_id, 
            a.name, 
            a.start_date, 
            i.min_lat, 
            i.min_lon, 
            i.max_lat, 
            i.max_lon,
            a.type
        FROM strava_imports i
        JOIN strava_activities a ON i.username = a.username AND i.activity_id = a.activity_id
        WHERE i.username = ?
        ORDER BY a.start_date DESC
        '''
        self.cursor.execute(select_sql, (username,))
        rows = self.cursor.fetchall()
        return [
            {
                "activity_id": activity_id,
                "name": name,
                "start_date": start_date,
                "min_lat": min_lat,
                "min_lon": min_lon,
                "max_lat": max_lat,
                "max_lon": max_lon,
                "type": activity_type,
            }
            for (activity_id, name, start_date, min_lat, min_lon, max_lat, max_lon, activity_type) in rows
        ]

    def delete_strava_import(self, username: str, activity_id: int) -> None:
        delete_sql = '''
        DELETE FROM strava_imports
        WHERE username = ? AND activity_id = ?
        '''
        self.cursor.execute(delete_sql, (username, activity_id))
        self.connection.commit()

    def list_strava_imports_with_details(self, username: str):
        select_sql = '''
        SELECT
            i.activity_id,
            a.name,
            a.type,
            a.start_date,
            i.min_lat,
            i.min_lon,
            i.max_lat,
            i.max_lon
        FROM strava_imports i
        JOIN strava_activities a ON i.username = a.username AND i.activity_id = a.activity_id
        WHERE i.username = ?
        ORDER BY i.last_imported_at DESC
        '''
        self.cursor.execute(select_sql, (username,))
        rows = self.cursor.fetchall()
        return [
            {
                "activity_id": activity_id,
                "name": name,
                "type": activity_type,
                "start_date": start_date,
                "min_lat": min_lat,
                "min_lon": min_lon,
                "max_lat": max_lat,
                "max_lon": max_lon,
            }
            for (activity_id, name, activity_type, start_date, min_lat, min_lon, max_lat, max_lon) in rows
        ]

    def create_sessions_table(self):
        create_sessions_sql = '''
        CREATE TABLE IF NOT EXISTS sessions (
            session_key TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            FOREIGN KEY (username) REFERENCES users(username)
        )
        '''
        self.cursor.execute(create_sessions_sql)

    def ensure_user_exists(self, username):
        insert_sql = '''
        INSERT OR IGNORE INTO users (username)
        VALUES (?)
        '''
        self.cursor.execute(insert_sql, (username,))
        self.connection.commit()

    def get_user_by_username(self, username):
        select_sql = '''
        SELECT username
        FROM users
        WHERE username = ?
        LIMIT 1
        '''
        self.cursor.execute(select_sql, (username,))
        result = self.cursor.fetchone()
        return {"username": result[0]} if result else None

    def insert_gps_track(self, username, gpx_data, description=None, min_lat=None, min_lon=None, max_lat=None, max_lon=None):
        if not self.get_user_by_username(username):
            raise ValueError(f"User '{username}' does not exist. Create the user before inserting tracks.")

        if (
            min_lat is None or
            min_lon is None or
            max_lat is None or
            max_lon is None
        ):
            raise ValueError("Track bounds (min_lat/min_lon/max_lat/max_lon) are required.")

        insert_sql = '''
        INSERT INTO gps_tracks (username, gpx_data, description, min_lat, min_lon, max_lat, max_lon)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        '''
        self.cursor.execute(insert_sql, (username, gpx_data, description, min_lat, min_lon, max_lat, max_lon))

        self.connection.commit()
        return self.cursor.lastrowid

    def insert_gps_track_from_file(self, username, file_path, description=None):
        with open(file_path, 'rb') as file:
            gpx_data = file.read()
        return self.insert_gps_track(username, gpx_data, description)

    def list_gps_tracks(self, username):
        select_sql = '''
        SELECT track_id, username, description, min_lat, min_lon, max_lat, max_lon
        FROM gps_tracks
        WHERE username = ?
        ORDER BY track_id ASC
        '''
        self.cursor.execute(select_sql, (username,))
        rows = self.cursor.fetchall()
        return [
            {
                "track_id": track_id,
                "username": user,
                "description": description,
                "min_lat": min_lat,
                "min_lon": min_lon,
                "max_lat": max_lat,
                "max_lon": max_lon
            }
            for track_id, user, description, min_lat, min_lon, max_lat, max_lon in rows
        ]

    def get_gps_track_by_id(self, username, track_id):
        select_sql = '''
        SELECT track_id, username, gpx_data, description, min_lat, min_lon, max_lat, max_lon
        FROM gps_tracks
        WHERE username = ? AND track_id = ?
        LIMIT 1
        '''
        self.cursor.execute(select_sql, (username, track_id))
        result = self.cursor.fetchone()
        if not result:
            return None
        track_id, user, gpx_blob, description, min_lat, min_lon, max_lat, max_lon = result
        return {
            "track_id": track_id,
            "username": user,
            "gpx_data": gpx_blob,
            "description": description,
            "min_lat": min_lat,
            "min_lon": min_lon,
            "max_lat": max_lat,
            "max_lon": max_lon
        }

    def create_session(self, username, session_key, expires_at):
        insert_sql = '''
        INSERT INTO sessions (session_key, username, expires_at)
        VALUES (?, ?, ?)
        '''
        self.cursor.execute(insert_sql, (session_key, username, expires_at))
        self.connection.commit()

    def validate_session(self, session_key):
        select_sql = '''
        SELECT username, expires_at, is_active
        FROM sessions
        WHERE session_key = ?
        '''
        self.cursor.execute(select_sql, (session_key,))
        result = self.cursor.fetchone()
        
        if not result:
            return None
            
        username, expires_at, is_active = result
        
        if not is_active:
            return None
            
        return {
            "username": username,
            "expires_at": expires_at,
            "is_active": is_active
        }

    def cleanup_sessions(self):
        # Optional: Implement cleanup of expired sessions if needed
        pass

    def insert_data(self, data):
        insert_sql = '''
        INSERT INTO maps (
            map_name, nw_coords_lat, nw_coords_lon, 
            se_coords_lat, se_coords_lon, 
            optimal_rotation_angle, 
            overlay_width, overlay_height, 
            attribution, selected_pixel_coords, selected_realworld_coords, 
            map_filename, map_area, map_event, map_date, map_course,
            map_club, map_course_planner, map_attribution
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        '''
        for item in data:
            # Check if the record already exists
            self.cursor.execute('SELECT 1 FROM maps WHERE map_name = ?', (item['map_name'],))
            if self.cursor.fetchone() is None:
                # Record does not exist, insert new record
                self.cursor.execute(insert_sql, (
                    item['map_name'],
                    item['nw_coords'][0], item['nw_coords'][1],
                    item['se_coords'][0], item['se_coords'][1],
                    item['optimal_rotation_angle'],
                    item.get('overlay_width', ''), item.get('overlay_height', ''),
                    item.get('attribution', ''),
                    json.dumps(item.get('selected_pixel_coords', '')),
                    json.dumps(item.get('selected_realworld_coords', '')),
                    item['map_filename'],
                    item.get('map_area', ''),
                    item.get('map_event', ''),
                    item.get('map_date', ''),
                    item.get('map_course', ''),
                    item.get('map_club', ''),
                    item.get('map_course_planner', ''),
                    item.get('map_attribution', '')
                ))
        self.connection.commit()

    def insert_map(self, map_data):
        nw_lat = round(map_data['nw_coords'][0], 6)
        nw_lon = round(map_data['nw_coords'][1], 6)
        se_lat = round(map_data['se_coords'][0], 6)
        se_lon = round(map_data['se_coords'][1], 6)
        angle = round(map_data['optimal_rotation_angle'], 2)

        common_values = (
            map_data['map_name'],
            nw_lat, nw_lon,
            se_lat, se_lon,
            angle,
            map_data['overlay_width'], map_data['overlay_height'],
            map_data['attribution'],
            json.dumps([[int(x), int(y)] for (x, y) in map_data['selected_pixel_coords']]),
            json.dumps([[round(lat, 6), round(lon, 6)] for (lat, lon) in map_data['selected_realworld_coords']]),
            map_data['map_filename'],
            map_data.get('map_area', ''),
            map_data.get('map_event', ''),
            map_data.get('map_date', ''),
            map_data.get('map_course', ''),
            map_data.get('map_club', ''),
            map_data.get('map_course_planner', ''),
            map_data.get('map_attribution', '')
        )

        map_id = map_data.get('map_id')
        if map_id is None:
            insert_sql = '''
                INSERT INTO maps (
                    map_name,
                    nw_coords_lat, nw_coords_lon,
                    se_coords_lat, se_coords_lon,
                    optimal_rotation_angle,
                    overlay_width, overlay_height,
                    attribution,
                    selected_pixel_coords, selected_realworld_coords,
                    map_filename,
                    map_area,
                    map_event,
                    map_date,
                    map_course,
                    map_club,
                    map_course_planner,
                    map_attribution
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(map_name) DO UPDATE SET
                    nw_coords_lat = excluded.nw_coords_lat,
                    nw_coords_lon = excluded.nw_coords_lon,
                    se_coords_lat = excluded.se_coords_lat,
                    se_coords_lon = excluded.se_coords_lon,
                    optimal_rotation_angle = excluded.optimal_rotation_angle,
                    overlay_width = excluded.overlay_width,
                    overlay_height = excluded.overlay_height,
                    attribution = excluded.attribution,
                    selected_pixel_coords = excluded.selected_pixel_coords,
                    selected_realworld_coords = excluded.selected_realworld_coords,
                    map_filename = excluded.map_filename,
                    map_area = excluded.map_area,
                    map_event = excluded.map_event,
                    map_date = excluded.map_date,
                    map_course = excluded.map_course,
                    map_club = excluded.map_club,
                    map_course_planner = excluded.map_course_planner,
                    map_attribution = excluded.map_attribution
            '''
            self.cursor.execute(insert_sql, common_values)
            map_id = self.get_map_id_by_name(map_data['map_name'])
        else:
            update_sql = '''
                UPDATE maps
                SET
                    map_name = ?,
                    nw_coords_lat = ?,
                    nw_coords_lon = ?,
                    se_coords_lat = ?,
                    se_coords_lon = ?,
                    optimal_rotation_angle = ?,
                    overlay_width = ?,
                    overlay_height = ?,
                    attribution = ?,
                    selected_pixel_coords = ?,
                    selected_realworld_coords = ?,
                    map_filename = ?,
                    map_area = ?,
                    map_event = ?,
                    map_date = ?,
                    map_course = ?,
                    map_club = ?,
                    map_course_planner = ?,
                    map_attribution = ?
                WHERE map_id = ?
            '''
            self.cursor.execute(update_sql, common_values + (map_id,))

        self.connection.commit()
        return map_id


    def list_maps(self):
        self.cursor.execute('''
            SELECT
                map_id,
                map_name,
                nw_coords_lat, nw_coords_lon,
                se_coords_lat, se_coords_lon,
                optimal_rotation_angle,
                overlay_width, overlay_height,
                attribution,
                selected_pixel_coords, selected_realworld_coords,
                map_filename,
                map_area, map_event, map_date, map_course,
                map_club, map_course_planner, map_attribution
            FROM maps
        ''')
        rows = self.cursor.fetchall()
        maps = []
        for row in rows:
            (map_id,
            map_name, 
            nw_lat, nw_lon, 
            se_lat, se_lon, 
            angle, 
            overlay_width, overlay_height, 
            attribution, 
            selected_pixel_coords, selected_realworld_coords, 
            filename, 
            map_area, map_event, map_date, map_course,
            map_club, map_course_planner, map_attribution) = row
            maps.append({
                "map_id": map_id,
                "map_name": map_name,
                "nw_coords": [nw_lat, nw_lon],
                "se_coords": [se_lat, se_lon],
                "optimal_rotation_angle": angle,
                "overlay_width": overlay_width,
                "overlay_height": overlay_height,
                "attribution": attribution,
                "selected_pixel_coords": json.loads(selected_pixel_coords),
                "selected_realworld_coords": json.loads(selected_realworld_coords),
                "map_filename": filename,
                "map_area": map_area,
                "map_event": map_event,
                "map_date": map_date,
                "map_course": map_course,
                "map_club": map_club,
                "map_course_planner": map_course_planner,
                "map_attribution": map_attribution
            })
        return maps
    
    def insert_mapfile_original(self, map_id, mapfile_original):
        insert_sql = '''
        INSERT INTO map_files (map_id, mapfile_original)
        VALUES (?, ?)
        ON CONFLICT(map_id) DO UPDATE SET mapfile_original = excluded.mapfile_original
        '''
        self.cursor.execute(insert_sql, (map_id, mapfile_original))
        self.connection.commit()

    def insert_mapfile_final(self, map_id, mapfile_final):
        insert_sql = '''
        INSERT INTO map_files (map_id, mapfile_final)
        VALUES (?, ?)
        ON CONFLICT(map_id) DO UPDATE SET mapfile_final = excluded.mapfile_final
        '''
        self.cursor.execute(insert_sql, (map_id, mapfile_final))
        self.connection.commit()

    def get_mapfile_original_by_id(self, map_id):
        select_sql = '''
        SELECT mapfile_original 
        FROM map_files 
        WHERE map_id = ?
        '''
        self.cursor.execute(select_sql, (map_id,))
        result = self.cursor.fetchone()
        return result[0] if result else None

    def get_mapfile_final_by_id(self, map_id):
        select_sql = '''
        SELECT mapfile_final 
        FROM map_files 
        WHERE map_id = ?
        '''
        self.cursor.execute(select_sql, (map_id,))
        result = self.cursor.fetchone()
        return result[0] if result else None

    def get_mapfile_original(self, map_name):
        map_id = self.get_map_id_by_name(map_name)
        if map_id is None:
            return None
        return self.get_mapfile_original_by_id(map_id)

    def get_mapfile_final(self, map_name):
        map_id = self.get_map_id_by_name(map_name)
        if map_id is None:
            return None
        return self.get_mapfile_final_by_id(map_id)

    def get_map_id_by_name(self, map_name):
        select_sql = '''
        SELECT map_id
        FROM maps
        WHERE map_name = ?
        LIMIT 1
        '''
        self.cursor.execute(select_sql, (map_name,))
        result = self.cursor.fetchone()
        return result[0] if result else None

    def output_map_data_to_disk(self, js_output_dir, final_maps_output_dir, original_maps_output_dir, include_original=False, overwrite=False):
        # Ensure the output directories exist
        os.makedirs(js_output_dir, exist_ok=True)
        os.makedirs(final_maps_output_dir, exist_ok=True)
        if include_original:
            os.makedirs(original_maps_output_dir, exist_ok=True)
        
        # Fetch map data
        maps = self.list_maps()
        
        # Prepare the data for the JSON file
        map_definitions = []
        for map_entry in maps:
            if map_entry["map_name"] == '':
                continue

            map_def = {
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
                "map_attribution": map_entry["map_attribution"]
            }
            map_definitions.append(map_def)
            
            # Write the final map image
            final_image_blob = self.get_mapfile_final_by_id(map_entry["map_id"])
            final_image_filename = os.path.join(final_maps_output_dir, map_entry["map_filename"])

            if (final_image_blob is not None) and (overwrite or not os.path.exists(final_image_filename)):
                with open(final_image_filename, 'wb') as f:
                    f.write(final_image_blob)
            
            # Optionally write the original map image
            if include_original:
                original_image_blob = self.get_mapfile_original_by_id(map_entry["map_id"])
                if original_image_blob:
                    original_image_filename = os.path.join(original_maps_output_dir, f"Original_{map_entry['map_filename']}")
                    if overwrite or not os.path.exists(original_image_filename):
                        with open(original_image_filename, 'wb') as f:
                            f.write(original_image_blob)
    
        # Write the map definitions to a JS file
        map_definitions_js = "const mapDefinitions = " + json.dumps(map_definitions, indent=2, ensure_ascii=False) + ";"
        js_filepath = os.path.join(js_output_dir, 'mapDefinitions.js')
        
        with open(js_filepath, 'w', encoding='utf-8') as f:
            f.write(map_definitions_js)

    def print_all_maps(self):
        self.cursor.execute('''
            SELECT map_id, map_name, nw_coords_lat, nw_coords_lon,
                   se_coords_lat, se_coords_lon, optimal_rotation_angle,
                   overlay_width, overlay_height, attribution,
                   selected_pixel_coords, selected_realworld_coords,
                   map_filename, map_area, map_event, map_date, map_course,
                   map_club, map_course_planner, map_attribution
            FROM maps
        ''')
        rows = self.cursor.fetchall()
        for row in rows:
            (map_id, map_name, nw_lat, nw_lon, se_lat, se_lon, angle,
            overlay_width, overlay_height, attribution,
            selected_pixel_coords, selected_realworld_coords,
            filename, map_area, map_event, map_date, map_course,
            map_club, map_course_planner, map_attribution) = row
            print(f"Map ID: {map_id}")
            print(f"Map Name: {map_name}")
            print(f"  NW Coordinates: ({nw_lat}, {nw_lon})")
            print(f"  SE Coordinates: ({se_lat}, {se_lon})")
            print(f"  Optimal Rotation Angle: {angle}")
            print(f"  Overlay Width: {overlay_width}")
            print(f"  Overlay Height: {overlay_height}")
            print(f"  Attribution: {attribution}")
            print(f"  Metadata: area={map_area}, event={map_event}, date={map_date}, course={map_course}, club={map_club}, planner={map_course_planner}, map_attr={map_attribution}")
            print(f"  Selected Pixel Coordinates: {json.loads(selected_pixel_coords)}")
            print(f"  Selected Realworld Coordinates: {json.loads(selected_realworld_coords)}")
            print(f"  Filename: {filename}")
            print()
    
    """Helper method to load maps from disk into existing map entry"""
    def insert_mapfile_original_from_local_file(self, map_name, filename):
        map_id = self.get_map_id_by_name(map_name)
        if map_id is None:
            raise ValueError(f"Map named '{map_name}' was not found in the database.")
        with open(filename, 'rb') as file:
            mapfile_original = file.read()
            self.insert_mapfile_original(map_id, mapfile_original)

    """Helper method to load maps from disk into existing map entry"""
    def insert_mapfile_final_from_local_file(self, map_name, filename):
        map_id = self.get_map_id_by_name(map_name)
        if map_id is None:
            raise ValueError(f"Map named '{map_name}' was not found in the database.")
        with open(filename, 'rb') as file:
            mapfile_final = file.read()
            self.insert_mapfile_final(map_id, mapfile_final)

    def setup_database(self, json_data):
        self.create_table()
        self.insert_data(json_data)

    def open(self):
        self.connection = sqlite3.connect(self.db_name)
        self.cursor = self.connection.cursor()

    def close(self):
        self.connection.close()

"""Helper method; can be deleted if you don't want it."""
def pretty_format_maps(maps):
    for map in maps:
        print(f"Map Name: {map['map_name']}")
        print(f"  NW Coordinates: ({map['nw_coords'][0]}, {map['nw_coords'][1]})")
        print(f"  SE Coordinates: ({map['se_coords'][0]}, {map['se_coords'][1]})")
        print(f"  Optimal Rotation Angle: {map['optimal_rotation_angle']}")
        print(f"  Overlay Width: {map['overlay_width']}")
        print(f"  Overlay Height: {map['overlay_height']}")
        
        attribution_lines = map['attribution'].split('\n')
        print(f"  Attribution: {attribution_lines[0]}")
        for line in attribution_lines[1:]:
            print(f"               {line}")
        
        metadata_summary = ", ".join([
            f"area={map.get('map_area', '')}",
            f"event={map.get('map_event', '')}",
            f"date={map.get('map_date', '')}",
            f"course={map.get('map_course', '')}",
            f"club={map.get('map_club', '')}",
            f"planner={map.get('map_course_planner', '')}",
            f"map_attr={map.get('map_attribution', '')}"
        ])
        print(f"  Metadata: {metadata_summary}")
        
        print(f"  Selected Pixel Coordinates: {map['selected_pixel_coords']}")
        print(f"  Selected Realworld Coordinates: {map['selected_realworld_coords']}")
        print(f"  Filename: {map['map_filename']}")
        print()

if __name__ == '__main__':
    from MapDefinitions import map_definitions

    db = Database()

    print()
    print("Loading database.")
    print()