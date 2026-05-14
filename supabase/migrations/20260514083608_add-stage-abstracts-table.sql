-- Stage abstracts table (Doc 7B compression output)
-- Stores the compressed abstract for each completed stage
CREATE TABLE IF NOT EXISTS stage_abstracts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage           integer NOT NULL,
  abstract_json   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, stage)
);

CREATE INDEX IF NOT EXISTS idx_stage_abstracts_project_stage
  ON stage_abstracts(project_id, stage);

ALTER TABLE stage_abstracts ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access on stage_abstracts"
  ON stage_abstracts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);