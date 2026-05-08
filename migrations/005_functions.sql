-- ============================================================
-- LINUP v2 — Migration 005: Helper Functions
-- Run AFTER 001, 002, 003, 004
-- ============================================================

-- user_is_project_member()
-- Used by RLS policies across project-linked tables.
-- SECURITY DEFINER so it runs with elevated privileges to join tables
-- without triggering RLS on organisation_members itself.
CREATE OR REPLACE FUNCTION user_is_project_member(p_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organisation_members om
    JOIN projects p ON p.organisation_id = om.organisation_id
    WHERE p.id = p_project_id AND om.user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;
