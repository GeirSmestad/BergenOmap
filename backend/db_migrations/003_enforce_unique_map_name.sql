-- Migration: enforce unique map names and clean up duplicates
PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- Keep only the newest map entry per map_name (highest map_id)
CREATE TEMP TABLE keep_map_ids AS
SELECT MAX(map_id) AS map_id
FROM maps
GROUP BY map_name;

-- Remove map_files rows that reference maps we are about to drop
DELETE FROM map_files
WHERE map_id NOT IN (SELECT map_id FROM keep_map_ids);

-- Build the new maps table with a UNIQUE constraint on map_name
CREATE TABLE maps_new (
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
);

INSERT INTO maps_new (
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
)
SELECT
    m.map_id,
    m.map_name,
    m.nw_coords_lat, m.nw_coords_lon,
    m.se_coords_lat, m.se_coords_lon,
    m.optimal_rotation_angle,
    m.overlay_width, m.overlay_height,
    m.attribution,
    m.selected_pixel_coords, m.selected_realworld_coords,
    m.map_filename,
    m.map_area, m.map_event, m.map_date, m.map_course,
    m.map_club, m.map_course_planner, m.map_attribution
FROM maps m
JOIN keep_map_ids k ON m.map_id = k.map_id;

DROP TABLE maps;
ALTER TABLE maps_new RENAME TO maps;
DROP TABLE keep_map_ids;

COMMIT;
PRAGMA foreign_keys = ON;
VACUUM;

