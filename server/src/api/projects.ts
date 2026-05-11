import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

export async function projectRoutes(fastify: FastifyInstance): Promise<void> {

  // ── GET /api/projects ─────────────────────────────────────────────────────
  // Returns project list + recent activity for the authenticated user's org.
  // No cost data returned per Doc 8D Phase 4.
  fastify.get('/api/projects', { preHandler: requireAuth }, async (request, reply) => {
    const { organisation_id } = request.profile;

    // Fetch all projects for this org, ordered by most recently updated
    const { data: projects, error: projErr } = await supabase
      .from('projects')
      .select('id, name, description, current_stage, status, updated_at')
      .eq('organisation_id', organisation_id)
      .order('updated_at', { ascending: false });

    if (projErr) {
      fastify.log.error(projErr, 'GET /api/projects — projects query failed');
      return reply.status(500).send({ error: 'Failed to load projects' });
    }

    const activity: object[] = [];

    return reply.send({ projects: projects ?? [], activity });
  });

  // ── POST /api/projects ────────────────────────────────────────────────────
  // Creates a new project. Enforces free tier gate.
  // On success: creates project row + 13 stage_runs records (stages 0–12).
  fastify.post('/api/projects', { preHandler: requireAuth }, async (request, reply) => {
    const { id: userId, organisation_id } = request.profile;
    const body = request.body as { name?: string; description?: string | null };

    // Validate input
    const name = (body.name ?? '').trim();
    if (!name || name.length < 2 || name.length > 80) {
      return reply.status(400).send({ error: 'Project name must be 2–80 characters' });
    }
    const description = body.description?.trim() || null;

    // ── Free tier gate (Doc 8D Phase 4) ──────────────────────────────────
    const { data: org, error: orgErr } = await supabase
      .from('organisations')
      .select('plan, free_project_used')
      .eq('id', organisation_id)
      .single();

    if (orgErr || !org) {
      fastify.log.error(orgErr, 'POST /api/projects — org lookup failed');
      return reply.status(500).send({ error: 'Failed to verify account status' });
    }

    if (org.plan === 'FREE' && org.free_project_used === true) {
      return reply.status(409).send({
        error: 'Free project already used',
        code: 'FREE_PROJECT_USED',
      });
    }

    // ── Create project ────────────────────────────────────────────────────
    const { data: project, error: createErr } = await supabase
      .from('projects')
      .insert({
        organisation_id,
        created_by: userId,
        name,
        description,
        status: 'ONBOARDING',
        current_stage: 0,
      })
      .select('id, name, description, status, current_stage, created_at')
      .single();

    if (createErr || !project) {
      fastify.log.error(createErr, 'POST /api/projects — project insert failed');
      return reply.status(500).send({ error: 'Failed to create project' });
    }

    // ── Create stage_runs for all 13 stages (0–12) ────────────────────────
    // Per Doc 8D Phase 4: "create stage_runs records for all 13 stages (0–12)"
    const stageRuns = Array.from({ length: 13 }, (_, i) => ({
      project_id: project.id,
      stage: i,
      status: 'PENDING',
    }));

    const { error: stageErr } = await supabase
      .from('stage_runs')
      .insert(stageRuns);

    if (stageErr) {
      fastify.log.error(stageErr, 'POST /api/projects — stage_runs insert failed');
      // Project was created — clean up to avoid orphaned project
      await supabase.from('projects').delete().eq('id', project.id);
      return reply.status(500).send({ error: 'Failed to initialise pipeline stages' });
    }

    // ── Mark free_project_used if on FREE plan ────────────────────────────
    if (org.plan === 'FREE') {
      const { error: flagErr } = await supabase
        .from('organisations')
        .update({ free_project_used: true })
        .eq('id', organisation_id);

      if (flagErr) {
        // Non-fatal — project created successfully, flag will be enforced on next attempt
        fastify.log.error(flagErr, 'POST /api/projects — failed to set free_project_used flag');
      }
    }

    return reply.status(201).send({ project });
  });

  // -- DELETE /api/projects/:id -------------------------------------------
  fastify.delete('/api/projects/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { organisation_id } = request.profile;
    const { error } = await supabase.from('projects').delete().eq('id', id).eq('organisation_id', organisation_id);
    if (error) return reply.status(500).send({ error: 'Failed to delete project' });
    await supabase.from('stage_runs').delete().eq('project_id', id);
    await supabase.from('organisations').update({ free_project_used: false }).eq('id', organisation_id);
    return reply.status(200).send({ message: 'Deleted' });
  });

  // -- GET /api/projects/:id -----------------------------------------------
  // Returns single project + all stage_runs. Used by Workspace (Phase 5).
  // No cost data returned per Doc 8D Phase 5.
  fastify.get('/api/projects/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { id: userId, organisation_id } = request.profile;

    // Verify project belongs to this org
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('id, name, description, status, current_stage, created_at, updated_at')
      .eq('id', id)
      .eq('organisation_id', organisation_id)
      .single();

    if (projErr || !project) {
      return reply.status(404).send({ error: 'NOT_FOUND' });
    }

    // Fetch all stage_runs ordered by stage number
    const { data: stageRuns, error: stageErr } = await supabase
      .from('stage_runs')
      .select('id, stage, status, started_at, completed_at, hold_count, created_at')
      .eq('project_id', id)
      .order('stage', { ascending: true });

    if (stageErr) {
      fastify.log.error(stageErr, 'GET /api/projects/:id -- stage_runs fetch failed');
      return reply.status(500).send({ error: 'STAGE_RUNS_FETCH_FAILED' });
    }

    return reply.send({ project, stageRuns: stageRuns ?? [] });
  });
}
