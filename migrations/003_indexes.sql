-- ============================================================
-- LINUP v2 — Migration 003: Indexes
-- Run AFTER 001 and 002
-- ============================================================

-- backup_codes
CREATE INDEX IF NOT EXISTS idx_backup_codes_user
  ON backup_codes(user_id) WHERE NOT used;

-- founder_decisions — unique partial index for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_founder_decisions_question
  ON founder_decisions(project_id, question_id)
  WHERE question_id IS NOT NULL;

-- payload_archive
CREATE INDEX IF NOT EXISTS idx_archive_project_stage
  ON payload_archive(project_id, stage, member_id);

CREATE INDEX IF NOT EXISTS idx_archive_section
  ON payload_archive(project_id, stage, section_id);

-- stage_runs
CREATE INDEX IF NOT EXISTS idx_stage_runs_project
  ON stage_runs(project_id, stage);

CREATE INDEX IF NOT EXISTS idx_stage_runs_status
  ON stage_runs(status) WHERE status NOT IN ('LOCKED','PENDING');

-- rtm_requirements
CREATE INDEX IF NOT EXISTS idx_rtm_project_status
  ON rtm_requirements(project_id, status);

CREATE INDEX IF NOT EXISTS idx_rtm_project_stage
  ON rtm_requirements(project_id, stage_responsible);

-- ic_artifacts
CREATE INDEX IF NOT EXISTS idx_ic_artifacts_project_stage
  ON ic_artifacts(project_id, stage, group_id, status);

-- ic_artifact_previews
CREATE INDEX IF NOT EXISTS idx_previews_project_stage
  ON ic_artifact_previews(project_id, stage);

-- linup_spend_log
CREATE INDEX IF NOT EXISTS idx_spend_project
  ON linup_spend_log(project_id, created_at);
