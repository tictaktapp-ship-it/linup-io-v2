-- Fix ic_artifacts: give artifact_type a default so runIc inserts don't fail
ALTER TABLE ic_artifacts
  ALTER COLUMN artifact_type SET DEFAULT 'IC_OUTPUT';