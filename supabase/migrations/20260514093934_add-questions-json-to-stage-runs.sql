-- Add questions_json column to stage_runs
ALTER TABLE stage_runs ADD COLUMN IF NOT EXISTS questions_json jsonb;
ALTER TABLE stage_runs ADD COLUMN IF NOT EXISTS has_questions boolean NOT NULL DEFAULT false;