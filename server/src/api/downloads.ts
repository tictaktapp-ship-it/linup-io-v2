import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' });

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

async function getOrgForUser(userId: string) {
  const { data, error } = await supabase
    .from('organisations')
    .select('id, plan, stripe_customer_id, free_project_used')
    .eq('owner_id', userId)
    .single();
  if (error || !data) throw new Error('Organisation not found');
  return data;
}

async function getProject(projectId: string, userId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, status, app_download_paid, is_first_free_project, organisation_id')
    .eq('id', projectId)
    .single();
  if (error || !data) throw new Error('Project not found');
  // Verify membership
  const { data: member } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();
  if (!member) throw new Error('FORBIDDEN');
  return data;
}

async function hasArtifactBeenPaid(userId: string, projectId: string, artifactType: string): Promise<boolean> {
  const { data } = await supabase
    .from('artifact_payments')
    .select('id')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .eq('artifact_type', artifactType)
    .eq('stripe_payment_status', 'succeeded')
    .maybeSingle();
  return !!data;
}

async function getDownloadAccess(
  userId: string,
  projectId: string,
  artifactType: string
): Promise<{ allowed: boolean; paymentRequired: boolean; amountGbp?: number; type?: string }> {
  const org = await getOrgForUser(userId);

  // Pro subscriber Ã¢â‚¬â€ always included
  if (org.plan !== 'FREE') {
    return { allowed: true, paymentRequired: false };
  }

  const project = await getProject(projectId, userId);

  if (project.is_first_free_project) {
    // First project: spec PDF free, app package Ã‚Â£199
    if (artifactType === 'SPEC_PDF') return { allowed: true, paymentRequired: false };
    if (project.app_download_paid) return { allowed: true, paymentRequired: false };
    return { allowed: false, paymentRequired: true, amountGbp: 199.00, type: 'APP_PACKAGE' };
  }

  // Second project onwards: Ã‚Â£10 per artifact
  const alreadyPaid = await hasArtifactBeenPaid(userId, projectId, artifactType);
  if (alreadyPaid) return { allowed: true, paymentRequired: false };
  return { allowed: false, paymentRequired: true, amountGbp: 10.00, type: 'PER_ARTIFACT' };
}

async function generateSignedUrl(bucket: string, path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24); // 24h
  if (error || !data) throw new Error('Failed to generate signed URL');
  return data.signedUrl;
}

// ----------------------------------------------------------------
// Route registration
// ----------------------------------------------------------------

export async function downloadsRoutes(app: FastifyInstance) {

  // GET /api/downloads/spec/:project_id
  // Spec PDF Ã¢â‚¬â€ free on first project, Ã‚Â£10 per artifact on subsequent projects
  app.get('/api/downloads/spec/:project_id', { preHandler: requireAuth }, async (req, reply) => {
    const { project_id } = req.params as { project_id: string };
    const userId = (req as any).userId;
    try {
      // Verify project membership — spec PDF is free for all members
      const { data: member } = await supabase.from('project_members').select('id').eq('project_id', project_id).eq('user_id', userId).single();
      if (!member) return reply.status(403).send({ error: { code: 'FORBIDDEN' } });
      // Generate PDF on-demand if not yet in storage
      const storagePath = project_id + '/spec.pdf';
      const { data: existing } = await supabase.storage.from('artifacts').list(project_id);
      const alreadyExists = (existing ?? []).some((f: any) => f.name === 'spec.pdf');
      if (!alreadyExists) {
        const { generateSpecPdf } = await import('../pipeline/zip-generator.js');
        const pdfBuffer = await generateSpecPdf(project_id, [0,1,2,3,4,5,6,7,8,9,10,11,12], supabase as any);
        await supabase.storage.from('artifacts').upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true });
      }
      const url = await generateSignedUrl('artifacts', storagePath);
      return reply.send({ available: true, download_url: url });
    } catch (err: any) {
      if (err.message === 'FORBIDDEN') return reply.status(403).send({ error: { code: 'FORBIDDEN' } });
      req.log.error(err);
      return reply.status(500).send({ error: { code: 'INTERNAL' } });
    }
  });

  // GET /api/downloads/app/:project_id
  // App Package ZIP Ã¢â‚¬â€ Ã‚Â£199 first project free tier, Ã‚Â£10 subsequent, included on Pro
  app.get('/api/downloads/app/:project_id', { preHandler: requireAuth }, async (req, reply) => {
    const { project_id } = req.params as { project_id: string };
    const userId = (req as any).userId;
    try {
      const access = await getDownloadAccess(userId, project_id, 'APP_PACKAGE');
      if (!access.allowed) {
        const amount = access.type === 'APP_PACKAGE' ? 19900 : 1000;
        const pi = await stripe.paymentIntents.create({
          amount,
          currency: 'gbp',
          metadata: { projectId: project_id, userId, type: access.type! },
        });
        return reply.send({
          available: false,
          all_stages_complete: false,
          payment_required: true,
          amount_gbp: access.amountGbp,
          payment_intent_client_secret: pi.client_secret,
        });
      }
      const url = await generateSignedUrl('artifacts', project_id + '/app-package.zip');
      return reply.send({ available: true, all_stages_complete: true, payment_required: false, download_url: url });
    } catch (err: any) {
      if (err.message === 'FORBIDDEN') return reply.status(403).send({ error: { code: 'FORBIDDEN' } });
      req.log.error(err);
      return reply.status(500).send({ error: { code: 'INTERNAL' } });
    }
  });

  // POST /api/downloads/app/payment-confirm
  // Called after Stripe confirms payment client-side Ã¢â‚¬â€ records payment + returns signed URL
  app.post('/api/downloads/app/payment-confirm', { preHandler: requireAuth }, async (req, reply) => {
    const { project_id, payment_intent_id } = req.body as { project_id: string; payment_intent_id: string };
    const userId = (req as any).userId;
    try {
      // Verify PaymentIntent status with Stripe directly
      const pi = await stripe.paymentIntents.retrieve(payment_intent_id);
      if (pi.status !== 'succeeded') {
        return reply.status(402).send({ error: { code: 'PAYMENT_NOT_CONFIRMED' } });
      }
      const artifactType = pi.metadata.type === 'APP_PACKAGE' ? 'APP_PACKAGE' : 'APP_PACKAGE';
      // Record payment in artifact_payments
      await supabase.from('artifact_payments').upsert({
        project_id,
        user_id: userId,
        artifact_type: artifactType,
        stripe_payment_intent_id: payment_intent_id,
        stripe_payment_status: 'succeeded',
        amount_gbp: pi.amount / 100,
        paid_at: new Date().toISOString(),
      }, { onConflict: 'stripe_payment_intent_id' });
      // If APP_PACKAGE on first project, set app_download_paid = true on projects row
      if (pi.metadata.type === 'APP_PACKAGE') {
        await supabase.from('projects').update({ app_download_paid: true }).eq('id', project_id);
      }
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const url = await generateSignedUrl('artifacts', project_id + '/app-package.zip');
      return reply.send({ download_url: url, expires_at: expiresAt });
    } catch (err: any) {
      if (err.message === 'FORBIDDEN') return reply.status(403).send({ error: { code: 'FORBIDDEN' } });
      req.log.error(err);
      return reply.status(500).send({ error: { code: 'INTERNAL' } });
    }
  });
}
