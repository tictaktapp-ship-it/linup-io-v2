DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'own_membership' AND tablename = 'organisation_members') THEN
    CREATE POLICY own_membership ON organisation_members FOR ALL USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'project_org_members' AND tablename = 'projects') THEN
    CREATE POLICY project_org_members ON projects FOR ALL USING (user_is_project_member(id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'project_data_members' AND tablename = 'project_identity') THEN
    CREATE POLICY project_data_members ON project_identity FOR ALL USING (user_is_project_member(project_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'stage_abstracts_members' AND tablename = 'stage_abstracts') THEN
    CREATE POLICY stage_abstracts_members ON stage_abstracts FOR ALL USING (user_is_project_member(project_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'change_requests_members' AND tablename = 'change_requests') THEN
    CREATE POLICY change_requests_members ON change_requests FOR ALL USING (user_is_project_member(project_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'wont_amendments_members' AND tablename = 'wont_amendments') THEN
    CREATE POLICY wont_amendments_members ON wont_amendments FOR ALL USING (user_is_project_member(project_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cost_summary_members' AND tablename = 'project_cost_summary') THEN
    CREATE POLICY cost_summary_members ON project_cost_summary FOR ALL USING (user_is_project_member(project_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'download_events_members' AND tablename = 'download_events') THEN
    CREATE POLICY download_events_members ON download_events FOR ALL USING (user_is_project_member(project_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'stage_runs_read' AND tablename = 'stage_runs') THEN
    CREATE POLICY stage_runs_read ON stage_runs FOR SELECT USING (user_is_project_member(project_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'founder_decisions_read' AND tablename = 'founder_decisions') THEN
    CREATE POLICY founder_decisions_read ON founder_decisions FOR SELECT USING (user_is_project_member(project_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mec_read' AND tablename = 'mec_agreements') THEN
    CREATE POLICY mec_read ON mec_agreements FOR SELECT USING (user_is_project_member(project_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'artifact_payments_read' AND tablename = 'artifact_payments') THEN
    CREATE POLICY artifact_payments_read ON artifact_payments FOR SELECT USING (user_is_project_member(project_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'rtm_read' AND tablename = 'rtm_requirements') THEN
    CREATE POLICY rtm_read ON rtm_requirements FOR SELECT USING (user_is_project_member(project_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ic_artifacts_read' AND tablename = 'ic_artifacts') THEN
    CREATE POLICY ic_artifacts_read ON ic_artifacts FOR SELECT USING (user_is_project_member(project_id));
  END IF;
END $$;