import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { PipelineSidebar } from '../../components/workspace/PipelineSidebar';
import { StageRunner } from '../../components/workspace/StageRunner';
import { RightPanel } from '../../components/workspace/RightPanel';

export interface StageRun {
  id: string;
  stage: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  hold_count: number;
  created_at: string;
  questions_json: { id: string; text: string; rationale: string; options: { key: string; text: string; recommended?: boolean }[] }[] | null;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  current_stage: number;
  progress_pct: number;
  created_at: string;
  updated_at: string;
}

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [stageRuns, setStageRuns] = useState<StageRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Initial data fetch ────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch('/api/projects/' + id)
      .then(async (res) => {
        if (res.status === 403 || res.status === 404) { navigate('/app'); return; }
        if (!res.ok) throw new Error('Failed to load project');
        const data = await res.json();
        setProject(data.project);
        setStageRuns(data.stageRuns);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  // ── Realtime subscription (Doc 8D Phase 5) ───────────────────────────
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel('project-' + id)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'stage_runs',
        filter: 'project_id=eq.' + id,
      }, (payload) => {
        const updated = payload.new as StageRun;
        setStageRuns((prev) =>
          prev.map((sr) => sr.stage === updated.stage ? { ...sr, ...updated } : sr)
        );
        if (updated.status !== undefined) {
          setProject((prev) => prev ? { ...prev, current_stage: updated.stage } : prev);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  if (loading) {
    return (
      <div className='workspace-loading'>
        <span>Loading project...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className='workspace-error'>
        <span>{error ?? 'Project not found'}</span>
      </div>
    );
  }

  const activeStageRun = stageRuns.find((sr) => sr.stage === project.current_stage) ?? null;

  return (
    <div className='workspace'>
      {/* Left panel — 220px */}
      <aside className='workspace__left'>
        <PipelineSidebar
          stageRuns={stageRuns}
          currentStage={project.current_stage}
          progressPct={project.progress_pct}
        />
      </aside>

      {/* Centre panel — flex 1 */}
      <main className='workspace__centre'>
        <StageRunner
          project={project}
          activeStageRun={activeStageRun}
          stageRuns={stageRuns}
        />
      </main>

      {/* Right panel — 320px */}
      <aside className='workspace__right'>
        <RightPanel
          project={project}
          stageRuns={stageRuns}
        />
      </aside>
    </div>
  );
}
