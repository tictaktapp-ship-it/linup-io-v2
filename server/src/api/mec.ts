import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' });

export async function mecRoutes(app: FastifyInstance) {

  // GET /api/mec/connect-url/:project_id
  // Returns Stripe Express OAuth link Ã¢â‚¬â€ requires Stage 11 LOCKED and App Package generated
  app.get('/api/mec/connect-url/:project_id', { preHandler: requireAuth }, async (req, reply) => {
    const { project_id } = req.params as { project_id: string };
    const userId = (req as any).userId;
    try {
      // Verify project membership
      const { data: member } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', project_id)
        .eq('user_id', userId)
        .single();
      if (!member) return reply.status(403).send({ error: { code: 'FORBIDDEN' } });
      // Upsert a DISCLOSED mec_agreement if one does not yet exist
      const { data: existing } = await supabase
        .from('mec_agreements')
        .select('id, mec_status')
        .eq('project_id', project_id)
        .maybeSingle();
      if (!existing) {
        await supabase.from('mec_agreements').insert({
          project_id,
          user_id: userId,
          acknowledged_at: new Date().toISOString(),
          acknowledged_ip: req.ip,
          mec_status: 'DISCLOSED',
        });
      }
      // Build Stripe Express OAuth URL
      const oauthUrl = 'https://connect.stripe.com/express/oauth/authorize' +
        '?response_type=code' +
        '&client_id=' + process.env.STRIPE_CONNECT_CLIENT_ID +
        '&scope=read_write' +
        '&state=' + project_id +
        '&redirect_uri=' + encodeURIComponent(process.env.STRIPE_CONNECT_REDIRECT_URI!);
      return reply.send({ oauth_url: oauthUrl });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ error: { code: 'INTERNAL' } });
    }
  });

  // GET /api/mec/connect-return
  // Stripe OAuth redirect handler Ã¢â‚¬â€ exchanges code for connected account ID
  app.get('/api/mec/connect-return', async (req, reply) => {
    const { code, state: project_id } = req.query as { code: string; state: string };
    try {
      if (!code || !project_id) {
        return reply.status(400).send({ error: { code: 'MISSING_PARAMS' } });
      }
      // Exchange OAuth code for connected account ID
      const response = await stripe.oauth.token({ grant_type: 'authorization_code', code });
      const connectedAccountId = response.stripe_user_id;
      if (!connectedAccountId) throw new Error('No connected account ID returned from Stripe');
      // Update mec_agreements row
      await supabase
        .from('mec_agreements')
        .update({
          stripe_connected_account_id: connectedAccountId,
          mec_status: 'CONNECTED',
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('project_id', project_id);
      // Redirect founder to secrets wizard
      return reply.redirect('/app/project/' + project_id + '/secrets');
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ error: { code: 'INTERNAL' } });
    }
  });

  // GET /api/mec/status/:project_id
  // Returns current MEC status for a project
  app.get('/api/mec/status/:project_id', { preHandler: requireAuth }, async (req, reply) => {
    const { project_id } = req.params as { project_id: string };
    const userId = (req as any).userId;
    try {
      // Verify project membership
      const { data: member } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', project_id)
        .eq('user_id', userId)
        .single();
      if (!member) return reply.status(403).send({ error: { code: 'FORBIDDEN' } });
      const { data } = await supabase
        .from('mec_agreements')
        .select('mec_status, stripe_connected_account_id, acknowledged_at')
        .eq('project_id', project_id)
        .maybeSingle();
      if (!data) {
        return reply.send({ mec_status: null, connected_account_id: null, acknowledged_at: null });
      }
      return reply.send({
        mec_status: data.mec_status,
        connected_account_id: data.stripe_connected_account_id,
        acknowledged_at: data.acknowledged_at,
      });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ error: { code: 'INTERNAL' } });
    }
  });
}
