-- Phase 9: Add council_state JSONB column to projects table
-- Stores all Phase 0 pipeline state:
--   Concierge phase, Idea Brief, Council member results (P0-2-001..013),
--   Quality Gate verdict, Phase 0.5 progress (P05-1-001..P05-2-003),
--   Feature Charter, confirmation timestamp.
-- Written to by pipeline/council.ts via service role key.
-- Read by GET /api/council/status/:projectId (membership-guarded).
-- Supabase Realtime fires on UPDATE → frontend polls for live progress.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS council_state JSONB DEFAULT NULL;

-- Index for efficient lookup when worker updates council_state
CREATE INDEX IF NOT EXISTS idx_projects_council_state_phase
  ON projects ((council_state->>'phase'))
  WHERE council_state IS NOT NULL;

COMMENT ON COLUMN projects.council_state IS
  'Phase 0 pipeline state — Concierge, PIS, Council (13 members), Phase 0.5 (5 members), Feature Charter. Written server-side only via service role.';