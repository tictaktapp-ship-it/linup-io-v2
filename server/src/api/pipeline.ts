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
      .select('id, organisation_id')
      .eq('id', projectId)
      .single();
    if (projErr || !project) return reply.status(404).send({ error: 'Project not found' });

    const { data: membership } = await supabase
      .from('organisation_members')
      .select('id')
      .eq('organisation_id', project.organisation_id)
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

  // POST /api/pipeline/pause/:projectId
  // Doc 11 D3: manual pause — sets stage to PAUSED after current IC completes.
  fastify.post('/api/pipeline/pause/:projectId', { preHandler: requireAuth }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const userId = request.profile.id;

    // Verify membership
    const { data: project } = await supabase.from('projects').select('organisation_id').eq('id', projectId).single();
    if (!project) return reply.status(404).send({ error: 'NOT_FOUND' });
    const { data: member } = await supabase.from('organisation_members').select('user_id').eq('organisation_id', project.organisation_id).eq('user_id', userId).maybeSingle();
    if (!member) return reply.status(403).send({ error: 'FORBIDDEN' });

    // Find the currently running stage
    const { data: running } = await supabase.from('stage_runs').select('id, stage, status').eq('project_id', projectId).in('status', ['PROCEEDING','IC_RUNNING','VP_REVIEWING','FIDELITY_CHECK','SPEC_ACCEPTANCE_TESTING','IG_CALL_1','IG_CALL_2','DA_REVIEWING','COS_REVIEWING','PLT_TRANSLATING']).order('stage').limit(1).maybeSingle();

    if (!running) return reply.status(409).send({ error: 'No stage currently running.' });

    await supabase.from('stage_runs').update({ status: 'PAUSED', pause_reason: 'USER_REQUESTED', paused_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', running.id);

    return reply.status(200).send({ paused: true, stage: running.stage });
  });

  // POST /api/pipeline/resume/:projectId
  // Doc 11 D3: resume — sets PAUSED stage back to PENDING for worker to re-claim.
  fastify.post('/api/pipeline/resume/:projectId', { preHandler: requireAuth }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const userId = request.profile.id;

    const { data: project } = await supabase.from('projects').select('organisation_id').eq('id', projectId).single();
    if (!project) return reply.status(404).send({ error: 'NOT_FOUND' });
    const { data: member } = await supabase.from('organisation_members').select('user_id').eq('organisation_id', project.organisation_id).eq('user_id', userId).maybeSingle();
    if (!member) return reply.status(403).send({ error: 'FORBIDDEN' });

    const { data: paused } = await supabase.from('stage_runs').select('id, stage').eq('project_id', projectId).eq('status', 'PAUSED').order('stage').limit(1).maybeSingle();

    if (!paused) return reply.status(409).send({ error: 'No paused stage found.' });

    await supabase.from('stage_runs').update({ status: 'PENDING', pause_reason: null, paused_at: null, updated_at: new Date().toISOString() }).eq('id', paused.id);

    return reply.status(200).send({ resumed: true, stage: paused.stage });
  });
}