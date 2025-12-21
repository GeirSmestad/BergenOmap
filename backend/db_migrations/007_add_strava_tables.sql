-- Migration: Strava integration tables
-- New tables only; no inserts.

CREATE TABLE IF NOT EXISTS internal_kv (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

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
);

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
);

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
);

CREATE INDEX IF NOT EXISTS idx_strava_activities_user_start_date
    ON strava_activities(username, start_date);

CREATE INDEX IF NOT EXISTS idx_strava_imports_user_last_imported
    ON strava_imports(username, last_imported_at);


