-- Backfill script: set username='geir.smestad' for all existing maps.
-- Idempotent and safe to re-run.

UPDATE maps
SET username = 'geir.smestad'
WHERE username IS NULL OR username = '';


