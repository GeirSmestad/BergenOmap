-- Migration: Add workout_type and description columns to strava_activities
-- These columns store additional activity details from Strava API:
--   workout_type: Mapped text value (e.g., "Race", "Long run", "Workout")
--   description: Free-text description of the activity

ALTER TABLE strava_activities ADD COLUMN workout_type TEXT;
ALTER TABLE strava_activities ADD COLUMN description TEXT;

