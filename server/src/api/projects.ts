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
      .select('id, name, description, current_stage, status, progress_pct, updated_at')
      .eq('organisation_id', organisation_id)
      .order('updated_at', { ascending: false });

    if (projErr) {
      fastify.log.error(projErr, 'GET /api/projects — projects query failed');
      return reply.status(500).send({ error: 'Failed to load projects' });
    }

    // Fetch recent activity events (last 20, across all org projects)
    // stage_events table: id, project_id, type, stage, created_at
    const projectIds = (projects ?? []).map((p: { id: string }) => p.id);

    let activity: object[] = [];
    if (projectIds.length > 0) {
      const { data: events, error: evtErr } = await supabase
        .from('stage_events')
        .select('id, project_id, type, stage, created_at, projects(name)')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!evtErr && events) {
        activity = events.map((e) => ({
          id: e.id as string,
          project_id: e.project_id as string,
          project_name: (Array.isArray(e.projects) ? e.projects[0]?.name : (e.projects as { name: string } | null)?.name) ?? '',
          type: e.type as string,
          stage: e.stage as number,
          created_at: e.created_at as string,
        }));
      }
    }

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
        status: 'PENDING',
        current_stage: 0,
        progress_pct: 0,
      })
      .select('id, name, description, status, current_stage, progress_pct, created_at')
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
      status: i === 0 ? 'PENDING' : 'WAITING',
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
}