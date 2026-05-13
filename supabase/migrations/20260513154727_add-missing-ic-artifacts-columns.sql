-- Add missing columns to ic_artifacts
ALTER TABLE ic_artifacts
  ADD COLUMN IF NOT EXISTS schema_errors jsonb,
  ADD COLUMN IF NOT EXISTS vp_notes text,
  ADD COLUMN IF NOT EXISTS vp_failure_conditions jsonb;