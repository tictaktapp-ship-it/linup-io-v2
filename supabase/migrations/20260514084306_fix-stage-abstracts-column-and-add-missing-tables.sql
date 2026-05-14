-- Ensure stage_abstracts has abstract_json column (may have been created without it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stage_abstracts'
      AND column_name = 'abstract_json'
  ) THEN
    ALTER TABLE stage_abstracts ADD COLUMN abstract_json jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  -- Ensure project_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stage_abstracts'
      AND column_name = 'project_id'
  ) THEN
    ALTER TABLE stage_abstracts ADD COLUMN project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE;
  END IF;

  -- Ensure stage column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stage_abstracts'
      AND column_name = 'stage'
  ) THEN
    ALTER TABLE stage_abstracts ADD COLUMN stage integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Ensure other tables referenced by pipeline exist
CREATE TABLE IF NOT EXISTS group_review_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage integer NOT NULL,
  group_id text NOT NULL,
  summary_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vp_analysis_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage integer NOT NULL,
  vp_id text NOT NULL,
  report_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stage_consolidations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage integer NOT NULL,
  consolidation_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fidelity_check_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage integer NOT NULL,
  result_json jsonb NOT NULL,
  passed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acceptance_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage integer NOT NULL,
  result_json jsonb NOT NULL,
  passed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cos_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage integer NOT NULL,
  output_json jsonb NOT NULL,
  overall_ready boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ig_audit_trails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage integer NOT NULL,
  call_number integer NOT NULL,
  hold boolean NOT NULL DEFAULT false,
  hold_reason text,
  audit_trail text NOT NULL,
  questions_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS founder_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage integer NOT NULL,
  question_id text NOT NULL,
  answer text NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, stage, question_id)
);