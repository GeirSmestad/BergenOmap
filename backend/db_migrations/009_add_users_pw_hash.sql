-- Migration: add password hash column to users
-- Note: plaintext for now (will be replaced with real hashing later), but we keep column name pw_hash.

ALTER TABLE users ADD COLUMN pw_hash TEXT;


