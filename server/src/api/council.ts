import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import {
  handleConciergeMessage,
  handlePisMessage,
  confirmIdeaBrief,
  getCouncilStatus,
  getPhase05Status,
  confirmFeatureCharter,
} from '../pipeline/council.js';

// ── Phase 0 Council API (Doc 8D Phase 9, Doc 5 Screen 6) ─────────────────────
// All endpoints require auth. Project membership verified on each request.

export async function councilRoutes(fastify: FastifyInstance): Promise<void> {

  // Helper: verify caller is a member of this project and return project row
  async function assertMember(projectId: string, userId: string, organisationId: string) {
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('id, name, status, current_stage')
      .eq('id', projectId)
      .eq('organisation_id', organisationId)
      .single();
    if (projErr || !project) return null;

    const { data: member, error: memErr } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();
    if (memErr || !member) return null;

    return project;
  }

  // ── POST /api/council/concierge ────────────────────────────────────────────
  // Onboarding Concierge (P0-0-001). Max 3 exchanges per Doc 11 D16.
  // Body: { projectId: string; message: string; exchangeCount: number }
  // Returns: { reply: string; handoffToPis: boolean }
  fastify.post('/api/council/concierge', { preHandler: requireAuth }, async (request, reply) => {
    const { id: userId, organisation_id } = request.profile;
    const body = request.body as {
      projectId?: string;
      message?: string;
      exchangeCount?: number;
    };

    if (!body.projectId || !body.message) {
      return reply.status(400).send({ error: 'projectId and message are required' });
    }

    const project = await assertMember(body.projectId, userId, organisation_id);
    if (!project) return reply.status(403).send({ error: 'FORBIDDEN' });

    const exchangeCount = typeof body.exchangeCount === 'number' ? body.exchangeCount : 0;

    try {
      const result = await handleConciergeMessage({
        projectId: body.projectId,
        message: body.message,
        exchangeCount,
      });
      return reply.send(result);
    } catch (err: any) {
      fastify.log.error(err, 'POST /api/council/concierge failed');
      return reply.status(500).send({ error: 'CONCIERGE_ERROR' });
    }
  });

  // ── POST /api/council/pis ──────────────────────────────────────────────────
  // Product Intake Specialist (P0-1-001). Conversational idea extraction.
  // Body: { projectId: string; message: string; history: Array<{role,content}> }
  // Returns: { reply: string; ideaBrief: object | null; briefComplete: boolean }
  fastify.post('/api/council/pis', { preHandler: requireAuth }, async (request, reply) => {
    const { id: userId, organisation_id } = request.profile;
    const body = request.body as {
      projectId?: string;
      message?: string;
      history?: Array<{ role: string; content: string }>;
    };

    if (!body.projectId || !body.message) {
      return reply.status(400).send({ error: 'projectId and message are required' });
    }

    const project = await assertMember(body.projectId, userId, organisation_id);
    if (!project) return reply.status(403).send({ error: 'FORBIDDEN' });

    try {
      const result = await handlePisMessage({
        projectId: body.projectId,
        projectName: project.name,
        message: body.message,
        history: body.history ?? [],
      });
      return reply.send(result);
    } catch (err: any) {
      fastify.log.error(err, 'POST /api/council/pis failed');
      return reply.status(500).send({ error: 'PIS_ERROR' });
    }
  });

  // ── POST /api/council/confirm-brief ───────────────────────────────────────
  // Founder confirms the Idea Brief → triggers Council run (P0-2-001..013).
  // Body: { projectId: string; ideaBrief: object }
  // Returns: { ok: true } — Council runs async, status via GET /council/status
  fastify.post('/api/council/confirm-brief', { preHandler: requireAuth }, async (request, reply) => {
    const { id: userId, organisation_id } = request.profile;
    const body = request.body as {
      projectId?: string;
      ideaBrief?: Record<string, unknown>;
    };

    if (!body.projectId || !body.ideaBrief) {
      return reply.status(400).send({ error: 'projectId and ideaBrief are required' });
    }

    const project = await assertMember(body.projectId, userId, organisation_id);
    if (!project) return reply.status(403).send({ error: 'FORBIDDEN' });

    // Persist the Idea Brief to the project row (council_state JSONB column)
    const { error: saveErr } = await supabase
      .from('projects')
      .update({
        council_state: {
          phase: 'COUNCIL_RUNNING',
          idea_brief: body.ideaBrief,
          started_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.projectId);

    if (saveErr) {
      fastify.log.error(saveErr, 'POST /api/council/confirm-brief — save failed');
      return reply.status(500).send({ error: 'SAVE_FAILED' });
    }

    // Trigger Council async (non-blocking)
    confirmIdeaBrief(body.projectId, body.ideaBrief).catch((err: Error) => {
      fastify.log.error(err, 'council/confirm-brief — async run failed for ' + body.projectId);
    });

    return reply.send({ ok: true });
  });

  // ── GET /api/council/status/:projectId ────────────────────────────────────
  // Returns live Council progress: which of the 13 specialists are done,
  // Quality Gate verdict, conditional questions if any.
  fastify.get('/api/council/status/:projectId', { preHandler: requireAuth }, async (request, reply) => {
    const { id: userId, organisation_id } = request.profile;
    const { projectId } = request.params as { projectId: string };

    const project = await assertMember(projectId, userId, organisation_id);
    if (!project) return reply.status(403).send({ error: 'FORBIDDEN' });

    try {
      const status = await getCouncilStatus(projectId);
      return reply.send(status);
    } catch (err: any) {
      fastify.log.error(err, 'GET /api/council/status failed');
      return reply.status(500).send({ error: 'STATUS_ERROR' });
    }
  });

  // ── GET /api/council/phase05/status/:projectId ────────────────────────────
  // Returns Phase 0.5 progress: which of the 5 sequential members are done,
  // and the Approved Feature Charter when complete.
  fastify.get('/api/council/phase05/status/:projectId', { preHandler: requireAuth }, async (request, reply) => {
    const { id: userId, organisation_id } = request.profile;
    const { projectId } = request.params as { projectId: string };

    const project = await assertMember(projectId, userId, organisation_id);
    if (!project) return reply.status(403).send({ error: 'FORBIDDEN' });

    try {
      const status = await getPhase05Status(projectId);
      return reply.send(status);
    } catch (err: any) {
      fastify.log.error(err, 'GET /api/council/phase05/status failed');
      return reply.status(500).send({ error: 'PHASE05_STATUS_ERROR' });
    }
  });

  // ── POST /api/council/confirm-charter ─────────────────────────────────────
  // Founder confirms the Approved Feature Charter → Stage 1 begins.
  // Body: { projectId: string }
  // Returns: { ok: true } — Stage 1 queued in stage_runs
  fastify.post('/api/council/confirm-charter', { preHandler: requireAuth }, async (request, reply) => {
    const { id: userId, organisation_id } = request.profile;
    const body = request.body as { projectId?: string };

    if (!body.projectId) {
      return reply.status(400).send({ error: 'projectId is required' });
    }

    const project = await assertMember(body.projectId, userId, organisation_id);
    if (!project) return reply.status(403).send({ error: 'FORBIDDEN' });

    try {
      await confirmFeatureCharter(body.projectId);
      return reply.send({ ok: true });
    } catch (err: any) {
      fastify.log.error(err, 'POST /api/council/confirm-charter failed');
      return reply.status(500).send({ error: 'CONFIRM_CHARTER_ERROR' });
    }
  });
}