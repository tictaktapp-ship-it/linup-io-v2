import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

// ─── Pipeline routes (Doc 8E) ─────────────────────────────────────────────────
// POST /api/pipeline/run/:projectId/:stage  — enqueue a stage run
// GET  /api/pipeline/status/:projectId/:stage — current stage status

export async function pipelineRoutes(fastify: FastifyInstance): Promise<void> {

  // ─── POST /api/pipeline/run/:projectId/:stage ─────────────────────────────
  fastify.post('/api/pipeline/run/:projectId/:stage', { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as any).user;
    const { projectId, stage: stageStr } = request.params as { projectId: string; stage: string };
    const stage = parseInt(stageStr, 10);
    if (isNaN(stage) || stage < 0 || stage > 12) return reply.status(400).send({ error: 'Invalid stage' });

    // Verify project exists and user is a member of the org
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('id, org_id')
      .eq('id', projectId)
      .single();
    if (projErr || !project) return reply.status(404).send({ error: 'Project not found' });

    const { data: membership } = await supabase
      .from('org_members')
      .select('id')
      .eq('org_id', project.org_id)
      .eq('user_id', user.id)
      .single();
    if (!membership) return reply.status(403).send({ error: 'Not a member of this organisation' });

    // Check stage_run exists and is in a runnable state
    const { data: stageRun } = await supabase
      .from('stage_runs')
      .select('status')
      .eq('project_id', projectId)
      .eq('stage', stage)
      .single();

    const runnableStatuses = ['PENDING', 'ERROR', 'HOLD'];
    if (stageRun && !runnableStatuses.includes(stageRun.status)) {
      return reply.status(409).send({ error: 'Stage is already ' + stageRun.status });
    }

    // Upsert stage_run with QUEUED status
    const { error: upsertErr } = await supabase.from('stage_runs').upsert({
      project_id: projectId,
      stage,
      status: 'QUEUED',
      queued_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'project_id,stage' });
    if (upsertErr) return reply.status(500).send({ error: 'Failed to queue stage: ' + upsertErr.message });

    return reply.status(202).send({ queued: true, projectId, stage });
  });

  // ─── GET /api/pipeline/status/:projectId/:stage ───────────────────────────
  fastify.get('/api/pipeline/status/:projectId/:stage', { preHandler: requireAuth }, async (request, reply) => {
    const { projectId, stage: stageStr } = request.params as { projectId: string; stage: string };
    const stage = parseInt(stageStr, 10);
    const { data, error } = await supabase
      .from('stage_runs')
      .select('status, stage, pm_proceed_at, pm_locked_at, checkpoint_1_reached, checkpoint_2_reached, hold_count, error_message, current_group_id, current_ic_id, current_ic_iteration, has_questions, questions_json, plt_output_json')
      .eq('project_id', projectId)
      .eq('stage', stage)
      .single();
    if (error || !data) return reply.status(404).send({ error: 'Stage run not found' });
    return reply.send(data);
  });
}