-- Migration: add stored_points (field checking / synfaring)
--
-- Stores per-user points captured in the field.

CREATE TABLE stored_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    precision_meters INTEGER NULL,
    description TEXT NOT NULL DEFAULT '',
    username TEXT NOT NULL,
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

CREATE INDEX idx_stored_points_username ON stored_points(username);

