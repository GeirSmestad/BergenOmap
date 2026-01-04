-- Migration: add maps.map_scale (målestokk)
--
-- Notes:
-- - SQLite doesn't support `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
-- - Migrations in this repo are applied once, so we keep this simple.

ALTER TABLE maps ADD COLUMN map_scale TEXT DEFAULT '';


