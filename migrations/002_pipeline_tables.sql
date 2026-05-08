-- ============================================================
-- LINUP v2 — Migration 002: Pipeline Tables (Doc 9F §15)
-- Run AFTER 001_core_tables.sql
-- Where a table appears in both 2A and 9F, this file is authoritative.
-- ============================================================

-- member_prompts
-- RLS: server-side only
CREATE TABLE member_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id TEXT UNIQUE NOT NULL,
  member_title TEXT NOT NULL,
  stage INTEGER,
  model_tier TEXT CHECK (model_tier IN ('S','M','W')) NOT NULL,
  prompt_system_encrypted BYTEA NOT NULL,
  prompt_template_encrypted BYTEA NOT NULL,
  output_schema JSONB NOT NULL,
  is_conditional BOOLEAN DEFAULT FALSE,
  condition_domain TEXT,
  group_id TEXT,
  context_pulls JSONB DEFAULT '[]',  -- [{stage: int, sectionId: text}]
  key_version INTEGER DEFAULT 1,     -- tracks which ENCRYPTION_KEY version was used
  version INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- rtm_requirements
CREATE TABLE rtm_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  req_id TEXT NOT NULL,
  category TEXT CHECK (category IN ('FEATURE','CONSTRAINT','QUALITY','COMPLIANCE','ASSUMPTION')),
  description TEXT NOT NULL,
  stage_responsible INTEGER,
  status TEXT CHECK (status IN ('OPEN','ADDRESSED','PARTIALLY_ADDRESSED','NOT_REQUIRED')) DEFAULT 'OPEN',
  addressed_by TEXT[] DEFAULT '{}',
  addressed_in_stage INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, req_id)
);

-- ic_artifacts
CREATE TABLE ic_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL,
  member_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  content JSONB,
  self_verification JSONB,
  constraint_response JSONB,
  iteration_number INTEGER DEFAULT 1,
  schema_validation_result TEXT CHECK (schema_validation_result IN ('PASS','FAIL','PENDING')) DEFAULT 'PENDING',
  schema_validation_errors JSONB,
  vp_review_result TEXT CHECK (vp_review_result IN ('PASS','FAIL','PENDING')) DEFAULT 'PENDING',
  vp_review_notes TEXT,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  model_tier TEXT CHECK (model_tier IN ('S','M','W')),
  status TEXT CHECK (status IN ('PENDING','RUNNING','SCHEMA_FAILED','VP_FAILED','ACCEPTED','STUCK')) DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- group_review_summaries
CREATE TABLE group_review_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL,
  group_id TEXT NOT NULL,
  key_decisions JSONB DEFAULT '[]',
  conflicts_resolved JSONB DEFAULT '[]',
  assumptions JSONB DEFAULT '[]',
  handoff_notes TEXT,
  requirement_ids_addressed TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- consolidation_fidelity_checks
CREATE TABLE consolidation_fidelity_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL,
  result TEXT CHECK (result IN ('PASS','FAIL')) NOT NULL,
  check_1_decision_preservation JSONB,
  check_2_content_traceability JSONB,
  check_3_conflict_resolution JSONB,
  check_4_requirement_coverage JSONB,
  vp_consolidation_attempt INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- spec_acceptance_tests
CREATE TABLE spec_acceptance_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL,
  req_id TEXT NOT NULL,
  criterion TEXT,
  result TEXT CHECK (result IN ('SATISFIED','PARTIALLY_SATISFIED','NOT_SATISFIED')),
  gaps JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ic_conflicts
CREATE TABLE ic_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL,
  group_id TEXT NOT NULL,
  ic_a TEXT NOT NULL,
  ic_b TEXT NOT NULL,
  conflict_type INTEGER CHECK (conflict_type IN (1,2,3)) NOT NULL,
  description TEXT,
  resolution TEXT,
  escalated BOOLEAN DEFAULT FALSE,
  crp_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- stuck_members
CREATE TABLE stuck_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL,
  member_id TEXT NOT NULL,
  iteration_count INTEGER NOT NULL,
  persistent_failure TEXT,
  root_cause TEXT CHECK (root_cause IN ('BRIEF_WRONG','REQUIREMENT_UNACHIEVABLE','WRONG_SCOPE')),
  pm_action TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ig_audit_trail
CREATE TABLE ig_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL,
  call_number INTEGER NOT NULL,
  call_type TEXT CHECK (call_type IN ('MECHANICAL','REASONING')) NOT NULL,
  check_0_result JSONB,
  check_0_5_result JSONB,
  check_0_6_result JSONB,
  check_1_result JSONB,
  check_2_result JSONB,
  check_3_result JSONB,
  coherence_scores JSONB,
  domain_drift_detected BOOLEAN DEFAULT FALSE,
  overall_result TEXT CHECK (overall_result IN ('APPROVED','HOLD')),
  tokens_used INTEGER,
  model_tier TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ic_artifact_previews (live spec preview panel — Doc 11 D13)
CREATE TABLE IF NOT EXISTS ic_artifact_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID REFERENCES ic_artifacts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL,
  preview_type TEXT NOT NULL,
  preview_content JSONB,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- linup_spend_log (internal OpenRouter spend tracking — Doc 11 D11)
CREATE TABLE IF NOT EXISTS linup_spend_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  stage INTEGER,
  member_id TEXT,
  tier TEXT CHECK (tier IN ('S','M','W')),
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost_gbp DECIMAL(8,6),
  flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Additions to stage_runs (safe to run even if columns already exist)
ALTER TABLE stage_runs ADD COLUMN IF NOT EXISTS hold_count INTEGER DEFAULT 0;
ALTER TABLE stage_runs ADD COLUMN IF NOT EXISTS deadlock_declared BOOLEAN DEFAULT FALSE;
ALTER TABLE stage_runs ADD COLUMN IF NOT EXISTS checkpoint_1_status TEXT CHECK (checkpoint_1_status IN ('PENDING','SHOWN','FLAGGED'));
ALTER TABLE stage_runs ADD COLUMN IF NOT EXISTS checkpoint_2_status TEXT CHECK (checkpoint_2_status IN ('PENDING','SHOWN','FLAGGED'));
ALTER TABLE stage_runs ADD COLUMN IF NOT EXISTS current_member_id TEXT;
ALTER TABLE stage_runs ADD COLUMN IF NOT EXISTS current_group TEXT;

-- payload_archive section_id column (already defined in 001 but guaranteed here)
ALTER TABLE payload_archive ADD COLUMN IF NOT EXISTS section_id TEXT;
