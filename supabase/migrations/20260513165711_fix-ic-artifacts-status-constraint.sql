-- Fix ic_artifacts status check constraint to include all valid statuses
ALTER TABLE ic_artifacts DROP CONSTRAINT IF EXISTS ic_artifacts_status_check;
ALTER TABLE ic_artifacts ADD CONSTRAINT ic_artifacts_status_check 
  CHECK (status IN ('SCHEMA_FAIL', 'VP_FAIL', 'ACCEPTED', 'STUCK'));