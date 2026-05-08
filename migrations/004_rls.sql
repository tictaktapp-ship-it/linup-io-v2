-- ============================================================
-- LINUP v2 — Migration 004: Row Level Security
-- Run AFTER 001, 002, 003
-- Server uses service role key (bypasses RLS).
-- Client uses anon key (RLS enforced).
-- ============================================================

-- Enable RLS on all user-facing tables (2A)
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_identity ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_abstracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE wont_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_cost_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mec_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE mec_revenue_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifact_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payload_archive ENABLE ROW LEVEL SECURITY;

-- Enable RLS on pipeline tables (9F)
ALTER TABLE member_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rtm_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ic_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_review_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE consolidation_fidelity_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE spec_acceptance_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ic_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stuck_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ig_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE ic_artifact_previews ENABLE ROW LEVEL SECURITY;
ALTER TABLE linup_spend_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES
-- ============================================================

-- User profiles: own record only
CREATE POLICY "own_profile" ON user_profiles
  FOR ALL USING (id = auth.uid());

-- Backup codes: own record only
CREATE POLICY "own_backup_codes" ON backup_codes
  FOR ALL USING (user_id = auth.uid());

-- organisation_members: own membership rows visible
CREATE POLICY "own_membership" ON organisation_members
  FOR ALL USING (user_id = auth.uid());

-- Organisations: members only
CREATE POLICY "org_members_only" ON organisations
  FOR ALL USING (id IN (
    SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()
  ));

-- Projects: org members only
CREATE POLICY "project_org_members" ON projects
  FOR ALL USING (user_is_project_member(id));

-- Project-linked tables: org members only
CREATE POLICY "project_data_members" ON project_identity
  FOR ALL USING (user_is_project_member(project_id));

CREATE POLICY "stage_abstracts_members" ON stage_abstracts
  FOR ALL USING (user_is_project_member(project_id));

CREATE POLICY "change_requests_members" ON change_requests
  FOR ALL USING (user_is_project_member(project_id));

CREATE POLICY "wont_amendments_members" ON wont_amendments
  FOR ALL USING (user_is_project_member(project_id));

CREATE POLICY "cost_summary_members" ON project_cost_summary
  FOR ALL USING (user_is_project_member(project_id));

CREATE POLICY "download_events_members" ON download_events
  FOR ALL USING (user_is_project_member(project_id));

-- stage_runs: readable by members, written by server only
CREATE POLICY "stage_runs_read" ON stage_runs
  FOR SELECT USING (user_is_project_member(project_id));

-- founder_decisions: readable by members, written by server only
CREATE POLICY "founder_decisions_read" ON founder_decisions
  FOR SELECT USING (user_is_project_member(project_id));

-- mec_agreements: readable by project members
CREATE POLICY "mec_read" ON mec_agreements
  FOR SELECT USING (user_is_project_member(project_id));

-- artifact_payments: readable by project members
CREATE POLICY "artifact_payments_read" ON artifact_payments
  FOR SELECT USING (user_is_project_member(project_id));

-- RTM: readable by project members
CREATE POLICY "rtm_read" ON rtm_requirements
  FOR SELECT USING (user_is_project_member(project_id));

-- ic_artifacts: client READ permitted on status and member_id only
-- (enforced at app layer; RLS allows SELECT for members)
CREATE POLICY "ic_artifacts_read" ON ic_artifacts
  FOR SELECT USING (user_is_project_member(project_id));

-- ============================================================
-- SERVER-ONLY TABLES (no client access whatsoever)
-- ============================================================

CREATE POLICY "archive_server_only" ON payload_archive
  FOR ALL USING (FALSE);

CREATE POLICY "secrets_server_only" ON project_secrets
  FOR ALL USING (FALSE);

CREATE POLICY "mec_revenue_server_only" ON mec_revenue_events
  FOR ALL USING (FALSE);

CREATE POLICY "prompts_server_only" ON member_prompts
  FOR ALL USING (FALSE);

CREATE POLICY "group_reviews_server_only" ON group_review_summaries
  FOR ALL USING (FALSE);

CREATE POLICY "fidelity_checks_server_only" ON consolidation_fidelity_checks
  FOR ALL USING (FALSE);

CREATE POLICY "sat_server_only" ON spec_acceptance_tests
  FOR ALL USING (FALSE);

CREATE POLICY "ic_conflicts_server_only" ON ic_conflicts
  FOR ALL USING (FALSE);

CREATE POLICY "stuck_members_server_only" ON stuck_members
  FOR ALL USING (FALSE);

CREATE POLICY "ig_audit_server_only" ON ig_audit_trail
  FOR ALL USING (FALSE);

CREATE POLICY "previews_server_only" ON ic_artifact_previews
  FOR ALL USING (FALSE);

CREATE POLICY "spend_log_server_only" ON linup_spend_log
  FOR ALL USING (FALSE);
