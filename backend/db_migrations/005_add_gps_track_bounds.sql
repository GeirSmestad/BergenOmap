-- Migration: add bounds columns for gps_tracks
-- (min_lat, min_lon, max_lat, max_lon) are nullable to allow manual backfill for existing tracks.

ALTER TABLE gps_tracks ADD COLUMN min_lat REAL;
ALTER TABLE gps_tracks ADD COLUMN min_lon REAL;
ALTER TABLE gps_tracks ADD COLUMN max_lat REAL;
ALTER TABLE gps_tracks ADD COLUMN max_lon REAL;


