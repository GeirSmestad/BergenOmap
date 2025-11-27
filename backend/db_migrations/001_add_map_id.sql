-- Migration: introduce surrogate key for maps table
PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

CREATE TABLE maps_new (
    map_id INTEGER PRIMARY KEY AUTOINCREMENT,
    map_name TEXT NOT NULL,
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
    mapfile_original BLOB,
    mapfile_final BLOB
);

INSERT INTO maps_new (
    map_name,
    nw_coords_lat, nw_coords_lon,
    se_coords_lat, se_coords_lon,
    optimal_rotation_angle,
    overlay_width, overlay_height,
    attribution,
    selected_pixel_coords, selected_realworld_coords,
    map_filename,
    map_area, map_event, map_date, map_course,
    map_club, map_course_planner, map_attribution,
    mapfile_original, mapfile_final
)
SELECT
    map_name,
    nw_coords_lat, nw_coords_lon,
    se_coords_lat, se_coords_lon,
    optimal_rotation_angle,
    overlay_width, overlay_height,
    attribution,
    selected_pixel_coords, selected_realworld_coords,
    map_filename,
    map_area, map_event, map_date, map_course,
    map_club, map_course_planner, map_attribution,
    mapfile_original, mapfile_final
FROM maps;

DROP TABLE maps;
ALTER TABLE maps_new RENAME TO maps;

COMMIT;
PRAGMA foreign_keys = ON;
VACUUM;

