-- ============================================================
-- LINUP v2 — Migration 001: Core Tables (Doc 2A)
-- Run BEFORE 002_pipeline_tables.sql
-- model_tier is TEXT ('S','M','W') throughout — never INTEGER
-- Cost caps removed throughout — no cost_cap_* columns anywhere
-- ============================================================

-- organisations
CREATE TABLE organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  billing_email TEXT,
  plan TEXT CHECK (plan IN ('FREE','PRO')) DEFAULT 'FREE',
  -- Extend CHECK when tiers launch: ('FREE','PRO','STARTER','TEAM')
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  free_project_used BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,              -- GDPR soft delete
  deletion_scheduled_at TIMESTAMPTZ,   -- hard delete 30 days after soft delete
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- organisation_members
CREATE TABLE organisation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('OWNER','ADMIN','FOUNDER','VIEWER')) DEFAULT 'FOUNDER',
  invited_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organisation_id, user_id)
);

-- user_profiles
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_method TEXT CHECK (two_factor_method IN ('TOTP','SMS','EMAIL')),
  two_factor_verified_at TIMESTAMPTZ,
  notification_email BOOLEAN DEFAULT TRUE,
  notification_push BOOLEAN DEFAULT TRUE,
  push_subscription JSONB,
  auth_method TEXT CHECK (auth_method IN ('PASSWORD','GOOGLE','GITHUB')) DEFAULT 'PASSWORD',
  oauth_provider_id TEXT,             -- provider user ID for deduplication
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- backup_codes
CREATE TABLE backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,            -- bcrypt hash (cost=12), never stored plaintext
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 8 codes per user. Single-use. Regenerating invalidates all previous codes.

-- projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  slug TEXT,                          -- url-safe project name for file naming
  description TEXT,
  current_stage INTEGER DEFAULT 0,    -- 0=Phase0, 1=Phase0.5, 2-12=Stages1-11
  status TEXT CHECK (status IN (
    'ONBOARDING','PHASE_0','PHASE_05','ACTIVE','COMPLETE','PAUSED','DELETED'
  )) DEFAULT 'ONBOARDING',
  domain_classification JSONB,
  is_first_free_project BOOLEAN DEFAULT FALSE,  -- TRUE for the lifetime-free project
  spec_downloaded BOOLEAN DEFAULT FALSE,
  app_downloaded BOOLEAN DEFAULT FALSE,
  app_download_paid BOOLEAN DEFAULT FALSE,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- project_identity (§1)
CREATE TABLE project_identity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  problem_statement TEXT,
  primary_user TEXT,
  solution_hypothesis TEXT,
  wont_list JSONB DEFAULT '[]',
  domain_flags JSONB DEFAULT '{}',
  feature_charter JSONB,
  idea_brief TEXT,
  constraints JSONB DEFAULT '{}',
  version INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- founder_decisions (§2)
CREATE TABLE founder_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  stage INTEGER,
  sequence_number INTEGER NOT NULL,   -- per-project counter (NOT a global SERIAL)
  decision_type TEXT CHECK (decision_type IN (
    'FOUNDER','ASSUMED','EXCEPTIONAL','CRP','WLAP'
  )) NOT NULL,
  question TEXT NOT NULL,
  question_id UUID,                   -- idempotency key linking to the PLT question
  options JSONB,
  answer TEXT NOT NULL,
  answer_text TEXT,                   -- free text for D answers
  plt_interpretation TEXT,            -- PLT's structured interpretation of D answers
  interpretation_confirmed_at TIMESTAMPTZ,
  made_by TEXT,
  rationale TEXT,
  flagged_by_founder BOOLEAN DEFAULT FALSE,
  flag_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- stage_abstracts (§3 compressed)
CREATE TABLE stage_abstracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL,
  binding_constraints JSONB DEFAULT '[]',
  key_decisions JSONB DEFAULT '[]',
  assumptions_made JSONB DEFAULT '[]',
  founder_decisions_this_stage JSONB DEFAULT '[]',
  word_count INTEGER,
  full_archive_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, stage)
);

-- payload_archive
-- RLS: FOR ALL USING (FALSE) — no client access ever
CREATE TABLE payload_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL,
  member_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  section_id TEXT,
  content JSONB NOT NULL,
  word_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- stage_runs
-- PAUSED_COST_CAP status removed — cost caps do not exist
CREATE TABLE stage_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL,
  status TEXT CHECK (status IN (
    'PENDING','PROCEEDING','IC_RUNNING','VP_REVIEWING',
    'FIDELITY_CHECK','SPEC_ACCEPTANCE_TESTING',
    'IG_CALL_1','IG_CALL_2','DA_REVIEWING',
    'COS_REVIEWING','PLT_TRANSLATING',
    'AWAITING_FOUNDER','FOUNDER_ANSWERED','COMPRESSING',
    'LOCKED','HOLD','DEADLOCKED','PAUSED',
    'API_ERROR','RATE_LIMITED'
  )) DEFAULT 'PENDING',
  current_group TEXT,
  current_member_id TEXT,
  hold_count INTEGER DEFAULT 0,
  deadlock_declared BOOLEAN DEFAULT FALSE,
  checkpoint_1_status TEXT CHECK (checkpoint_1_status IN ('PENDING','SHOWN','FLAGGED')),
  checkpoint_2_status TEXT CHECK (checkpoint_2_status IN ('PENDING','SHOWN','FLAGGED')),
  pause_reason TEXT CHECK (pause_reason IN (
    'USER_REQUESTED','AUTO_VISIBILITY','AUTO_NETWORK','AUTO_SLEEP','TIMEOUT','PROVIDER_OUTAGE'
  )),
  paused_at TIMESTAMPTZ,
  last_progress_at TIMESTAMPTZ,       -- updated after each IC completes
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  model_tier_breakdown JSONB DEFAULT '{"S": 0, "M": 0, "W": 0}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  pm_proceed_issued_at TIMESTAMPTZ,
  pm_locked_issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, stage)
);

-- Quality & Resilience Tables
CREATE TABLE change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  raised_by UUID REFERENCES auth.users(id),
  raised_at TIMESTAMPTZ DEFAULT NOW(),
  affected_member_id TEXT,
  affected_stage INTEGER,
  nature TEXT NOT NULL,
  proposed_resolution TEXT,
  evidence TEXT,
  urgency TEXT CHECK (urgency IN ('BLOCKING','HIGH','MEDIUM','LOW')) DEFAULT 'MEDIUM',
  tier TEXT CHECK (tier IN ('A','B','C')),
  status TEXT CHECK (status IN ('OPEN','IN_PROGRESS','RESOLVED','REJECTED')) DEFAULT 'OPEN',
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

CREATE TABLE wont_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  item_description TEXT NOT NULL,
  founder_reason TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  impact_assessment TEXT,
  impact_stages_affected INTEGER[],
  status TEXT CHECK (status IN ('QUEUE','IMPACT_ASSESSED','APPROVED','REJECTED','LATER')) DEFAULT 'QUEUE',
  resolved_at TIMESTAMPTZ,
  new_classification TEXT CHECK (new_classification IN ('SHOULD','COULD'))
);

-- project_cost_summary: cost_cap_* columns removed — soft limiter is in linup_spend_log (9F)
CREATE TABLE project_cost_summary (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  total_tokens_input BIGINT DEFAULT 0,
  total_tokens_output BIGINT DEFAULT 0,
  total_cost_gbp DECIMAL(10,4) DEFAULT 0,
  tier_breakdown JSONB DEFAULT '{"S": 0, "M": 0, "W": 0}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE download_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  download_type TEXT CHECK (download_type IN ('SPEC','APP','PER_ARTIFACT')),
  artifact_type TEXT,                 -- e.g. 'API_REGISTER', 'SQL_SCHEMA' for PER_ARTIFACT
  payment_required BOOLEAN,
  amount_gbp DECIMAL(8,2),
  stripe_payment_intent_id TEXT,
  stripe_payment_status TEXT,
  download_url TEXT,
  download_url_expires_at TIMESTAMPTZ,
  storage_path TEXT,                  -- Supabase Storage path for cleanup
  artifact_expires_at TIMESTAMPTZ,    -- 90-day retention cutoff
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- MEC Tables
CREATE TABLE mec_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ NOT NULL,
  acknowledged_ip TEXT,
  stripe_connected_account_id TEXT,
  mec_status TEXT CHECK (mec_status IN (
    'DISCLOSED','CONNECTED','LIVE','INACTIVE'
  )) DEFAULT 'DISCLOSED',
  application_fee_percent DECIMAL(4,2) DEFAULT 1.50,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mec_revenue_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mec_agreement_id UUID REFERENCES mec_agreements(id),
  stripe_charge_id TEXT NOT NULL,
  gross_amount_gbp DECIMAL(10,2) NOT NULL,
  application_fee_gbp DECIMAL(10,4) NOT NULL,
  stripe_event_id TEXT UNIQUE NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-Artifact Payments
CREATE TABLE artifact_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  artifact_type TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_payment_status TEXT,
  amount_gbp DECIMAL(8,2) NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Secrets
-- All values stored as AES-256-GCM encrypted BYTEA
-- Encrypted with SECRETS_ENCRYPTION_KEY (separate from ENCRYPTION_KEY used for member_prompts)
-- Never returned to client. Server only.
CREATE TABLE project_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  supabase_url_encrypted BYTEA,
  supabase_anon_key_encrypted BYTEA,
  supabase_service_role_key_encrypted BYTEA,
  stripe_publishable_key_encrypted BYTEA,
  stripe_secret_key_encrypted BYTEA,
  stripe_webhook_secret_encrypted BYTEA,
  stripe_connect_platform_id_encrypted BYTEA,
  stripe_connect_webhook_secret_encrypted BYTEA,
  resend_api_key_encrypted BYTEA,
  from_email TEXT,
  vapid_public_key_encrypted BYTEA,
  vapid_private_key_encrypted BYTEA,
  vapid_subject TEXT,
  openrouter_api_key_encrypted BYTEA,
  sentry_dsn_encrypted BYTEA,
  twilio_account_sid_encrypted BYTEA,
  twilio_auth_token_encrypted BYTEA,
  posthog_api_key_encrypted BYTEA,
  posthog_host TEXT,
  saml_idp_url_encrypted BYTEA,
  saml_certificate_encrypted BYTEA,
  openai_api_key_encrypted BYTEA,
  web3_rpc_url_encrypted BYTEA,
  jwt_secret_encrypted BYTEA,
  app_encryption_key_encrypted BYTEA,
  wizard_completed BOOLEAN DEFAULT FALSE,
  wizard_completed_at TIMESTAMPTZ,
  env_files_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
