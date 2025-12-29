-- Migration: make maps user-owned by adding maps.username (FK to users.username)
-- We keep map_name globally unique (existing behavior).
--
-- SQLite cannot add FK constraints with ALTER TABLE, so we rebuild the table like other migrations.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- Ensure the default legacy user exists (avoids FK issues when enabling foreign_keys later).
INSERT OR IGNORE INTO users (username) VALUES ('geir.smestad');

CREATE TABLE maps_new (
    map_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
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
    map_attribution TEXT,
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

INSERT INTO maps_new (
    map_id,
    username,
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
)
SELECT
    map_id,
    'geir.smestad' as username,
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
FROM maps;

DROP TABLE maps;
ALTER TABLE maps_new RENAME TO maps;

CREATE INDEX IF NOT EXISTS idx_maps_username ON maps(username);

COMMIT;
PRAGMA foreign_keys = ON;
VACUUM;


