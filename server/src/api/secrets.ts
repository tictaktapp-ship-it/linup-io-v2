import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { encryptSecret, decryptSecret } from '../utils/crypto.js';

type SecretStep = 'supabase' | 'stripe' | 'email' | 'domain' | 'complete';
type ServiceName = 'supabase' | 'stripe' | 'resend' | 'openrouter';

interface SecretPayload {
  supabase_url?: string;
  supabase_anon_key?: string;
  supabase_service_role_key?: string;
  stripe_publishable_key?: string;
  stripe_secret_key?: string;
  stripe_webhook_secret?: string;
  stripe_connect_platform_id?: string;
  stripe_connect_webhook_secret?: string;
  resend_api_key?: string;
  from_email?: string;
  vapid_public_key?: string;
  vapid_private_key?: string;
  vapid_subject?: string;
  openrouter_api_key?: string;
  [key: string]: string | undefined;
}

function encryptPayload(secrets: SecretPayload): Record<string, Buffer> {
  const encrypted: Record<string, Buffer> = {};
  for (const [k, v] of Object.entries(secrets)) {
    if (typeof v === 'string' && v.trim().length > 0) {
      encrypted[k] = encryptSecret(v.trim());
    }
  }
  return encrypted;
}

function resolveConfiguredFlags(row: Record<string, unknown> | null) {
  if (!row) return { supabase: false, stripe: false, email: false, push: false, openrouter: false, stripe_connect: false };
  return {
    supabase:       !!(row['supabase_url'] && row['supabase_service_role_key']),
    stripe:         !!(row['stripe_secret_key'] && row['stripe_webhook_secret']),
    email:          !!(row['resend_api_key']),
    push:           !!(row['vapid_public_key'] && row['vapid_private_key']),
    openrouter:     !!(row['openrouter_api_key']),
    stripe_connect: !!(row['stripe_connect_platform_id']),
  };
}

async function assertProjectMember(projectId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('project_members')
    .select('user_id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();
  return !!data;
}

function decryptField(row: Record<string, unknown>, field: string): string {
  const val = row[field];
  if (!val || typeof val !== 'string') return '';
  try { return decryptSecret(Buffer.from(val, 'base64')); }
  catch { return ''; }
}

export async function secretsRoutes(fastify: FastifyInstance): Promise<void> {

  // GET /api/secrets/status/:project_id
  fastify.get<{ Params: { project_id: string } }>(
    '/api/secrets/status/:project_id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { project_id } = request.params;
      const { id: userId } = request.profile;

      const isMember = await assertProjectMember(project_id, userId);
      if (!isMember) return reply.status(403).send({ error: 'Access denied' });

      const { data: row } = await supabase
        .from('project_secrets')
        .select('supabase_url, supabase_service_role_key, stripe_secret_key, stripe_webhook_secret, resend_api_key, vapid_public_key, vapid_private_key, openrouter_api_key, stripe_connect_platform_id, wizard_completed, env_files_generated_at')
        .eq('project_id', project_id)
        .single();

      return reply.send({
        wizard_completed: !!(row?.['wizard_completed']),
        configured: resolveConfiguredFlags(row as Record<string, unknown> | null),
        env_files_generated_at: row?.['env_files_generated_at'] ?? null,
      });
    }
  );

  // POST /api/secrets/save — body never logged (Doc 14 sec req 1)
  fastify.post(
    '/api/secrets/save',
    { preHandler: requireAuth, config: { rawBody: false } },
    async (request, reply) => {
      request.log = request.log.child({ body: '[REDACTED]' });

      const body = request.body as { project_id: string; step: SecretStep; secrets: SecretPayload };
      if (!body?.project_id || !body?.step || !body?.secrets) {
        return reply.status(400).send({ error: 'project_id, step, and secrets are required' });
      }

      const { id: userId } = request.profile;
      const isMember = await assertProjectMember(body.project_id, userId);
      if (!isMember) return reply.status(403).send({ error: 'Access denied' });

      // Encrypt immediately before any await that could fail — Doc 14 sec req 2
      const encryptedFields = encryptPayload(body.secrets);

      const upsertData: Record<string, string> = { project_id: body.project_id };
      for (const [k, buf] of Object.entries(encryptedFields)) {
        upsertData[k] = buf.toString('base64');
      }
      if (body.step === 'complete') upsertData['wizard_completed'] = 'true';

      const { error: upsertErr } = await supabase
        .from('project_secrets')
        .upsert(upsertData, { onConflict: 'project_id' });

      if (upsertErr) {
        fastify.log.error({ err: upsertErr, project_id: body.project_id, step: body.step }, 'secrets/save upsert failed');
        return reply.status(500).send({ error: 'Failed to save secrets' });
      }

      return reply.send({ ok: true, step_saved: body.step });
    }
  );

  // POST /api/secrets/test
  fastify.post<{ Body: { project_id: string; service: ServiceName } }>(
    '/api/secrets/test',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { project_id, service } = request.body ?? {};
      if (!project_id || !service) return reply.status(400).send({ error: 'project_id and service are required' });

      const { id: userId } = request.profile;
      const isMember = await assertProjectMember(project_id, userId);
      if (!isMember) return reply.status(403).send({ error: 'Access denied' });

      const columns: Record<ServiceName, string> = {
        supabase:   'supabase_url, supabase_service_role_key',
        stripe:     'stripe_secret_key',
        resend:     'resend_api_key',
        openrouter: 'openrouter_api_key',
      };

      const { data: row, error: fetchErr } = await supabase
        .from('project_secrets')
        .select(columns[service])
        .eq('project_id', project_id)
        .single();

      if (fetchErr || !row) return reply.send({ success: false, detail: 'No credentials saved for this service yet.' });

      const r = row as unknown as Record<string, unknown>;
      let result: { success: boolean; detail: string };

      try {
        switch (service) {
          case 'supabase': {
            const url = decryptField(r, 'supabase_url');
            const key = decryptField(r, 'supabase_service_role_key');
            if (!url || !key) { result = { success: false, detail: 'Supabase credentials not fully saved.' }; break; }
            const { createClient } = await import('@supabase/supabase-js');
            const client = createClient(url, key);
            const { error } = await client.from('organisations').select('count').limit(1);
            if (error) { result = { success: false, detail: 'Connection failed: ' + error.message }; break; }
            const ref = new URL(url).hostname.split('.')[0];
            result = { success: true, detail: 'Connected — project ref: ' + ref };
            break;
          }
          case 'stripe': {
            const sk = decryptField(r, 'stripe_secret_key');
            if (!sk) { result = { success: false, detail: 'Stripe secret key not saved.' }; break; }
            const { default: Stripe } = await import('stripe');
            const stripe = new Stripe(sk);
            const account = await stripe.accounts.retrieve('');  // empty string = own account
            const mode = sk.startsWith('sk_live') ? 'live' : 'test';
            result = { success: true, detail: 'Connected — ' + mode + ' mode, account: ' + account.id };
            break;
          }
          case 'resend': {
            const apiKey = decryptField(r, 'resend_api_key');
            if (!apiKey) { result = { success: false, detail: 'Resend API key not saved.' }; break; }
            const { Resend } = await import('resend');
            const resend = new Resend(apiKey);
            const domains = await resend.domains.list();
            const count = Array.isArray(domains.data) ? (domains.data as unknown[]).length : 0;
            result = { success: true, detail: 'Connected — ' + count + ' domain(s) verified' };
            break;
          }
          case 'openrouter': {
            const apiKey = decryptField(r, 'openrouter_api_key');
            if (!apiKey) { result = { success: false, detail: 'OpenRouter API key not saved.' }; break; }
            const res = await fetch('https://openrouter.ai/api/v1/models', {
              headers: { Authorization: 'Bearer ' + apiKey },
            });
            if (!res.ok) { result = { success: false, detail: 'OpenRouter returned ' + res.status }; break; }
            result = { success: true, detail: 'Connected — OpenRouter API key valid' };
            break;
          }
          default:
            result = { success: false, detail: 'Unknown service' };
        }
      } catch (err) {
        fastify.log.error({ err, service, project_id }, 'secrets/test threw');
        result = { success: false, detail: 'Connection test failed — check your credentials.' };
      }

      return reply.send(result);
    }
  );

  // POST /api/secrets/generate-env
  fastify.post<{ Body: { project_id: string } }>(
    '/api/secrets/generate-env',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { project_id } = request.body ?? {};
      if (!project_id) return reply.status(400).send({ error: 'project_id is required' });

      const { id: userId } = request.profile;
      const isMember = await assertProjectMember(project_id, userId);
      if (!isMember) return reply.status(403).send({ error: 'Access denied' });

      const { data: row, error: fetchErr } = await supabase
        .from('project_secrets')
        .select('*')
        .eq('project_id', project_id)
        .single();

      if (fetchErr || !row) return reply.status(404).send({ error: 'No secrets found for this project' });

      const r = row as Record<string, unknown>;
      const d = (f: string) => decryptField(r, f);

      const frontendEnv = [
        'VITE_SUPABASE_URL=' + d('supabase_url'),
        'VITE_SUPABASE_ANON_KEY=' + d('supabase_anon_key'),
        'VITE_STRIPE_PUBLISHABLE_KEY=' + d('stripe_publishable_key'),
        'VITE_API_URL=https://api.yourdomain.com',
        'VITE_VAPID_PUBLIC_KEY=' + d('vapid_public_key'),
      ].join('\n');

      const backendEnv = [
        'SUPABASE_URL=' + d('supabase_url'),
        'SUPABASE_SERVICE_ROLE_KEY=' + d('supabase_service_role_key'),
        'STRIPE_SECRET_KEY=' + d('stripe_secret_key'),
        'STRIPE_WEBHOOK_SECRET=' + d('stripe_webhook_secret'),
        'STRIPE_CONNECT_WEBHOOK_SECRET=' + d('stripe_connect_webhook_secret'),
        'STRIPE_CONNECT_PLATFORM_ID=' + d('stripe_connect_platform_id'),
        'RESEND_API_KEY=' + d('resend_api_key'),
        'FROM_EMAIL=' + d('from_email'),
        'VAPID_PRIVATE_KEY=' + d('vapid_private_key'),
        'VAPID_PUBLIC_KEY=' + d('vapid_public_key'),
        'VAPID_SUBJECT=' + d('vapid_subject'),
        'OPENROUTER_API_KEY=' + d('openrouter_api_key'),
      ].join('\n');

      const envExample = [
        'VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co',
        'VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here',
        'VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_key_here',
        'VITE_API_URL=https://api.yourdomain.com',
        'VITE_VAPID_PUBLIC_KEY=your_vapid_public_key_here',
        'SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here',
        'STRIPE_SECRET_KEY=sk_live_your_key_here',
        'STRIPE_WEBHOOK_SECRET=whsec_your_secret_here',
        'RESEND_API_KEY=re_your_key_here',
        'VAPID_PRIVATE_KEY=your_vapid_private_key_here',
        'VAPID_SUBJECT=mailto:you@yourdomain.com',
        'OPENROUTER_API_KEY=sk-or-your_key_here',
      ].join('\n');

      const bucket = 'env-files';
      const basePath = project_id;
      const expiresAt = new Date(Date.now() + 86400000).toISOString();

      const uploads = [
        { path: basePath + '/frontend.env.local', content: frontendEnv },
        { path: basePath + '/backend.env',        content: backendEnv },
        { path: basePath + '/env.example',        content: envExample },
      ];

      for (const upload of uploads) {
        const { error: uploadErr } = await supabase.storage
          .from(bucket)
          .upload(upload.path, Buffer.from(upload.content, 'utf8'), {
            contentType: 'text/plain',
            upsert: true,
          });
        if (uploadErr) {
          fastify.log.error({ err: uploadErr, path: upload.path }, 'secrets/generate-env upload failed');
          return reply.status(500).send({ error: 'Failed to generate env files' });
        }
      }

      const { data: signed, error: signErr } = await supabase.storage
        .from(bucket)
        .createSignedUrl(basePath + '/frontend.env.local', 86400);

      if (signErr || !signed) return reply.status(500).send({ error: 'Failed to generate download URL' });

      await supabase
        .from('project_secrets')
        .update({ env_files_generated_at: new Date().toISOString() })
        .eq('project_id', project_id);

      return reply.send({ download_url: signed.signedUrl, expires_at: expiresAt });
    }
  );

  // PATCH /api/secrets/update
  fastify.patch(
    '/api/secrets/update',
    { preHandler: requireAuth, config: { rawBody: false } },
    async (request, reply) => {
      request.log = request.log.child({ body: '[REDACTED]' });

      const body = request.body as { project_id: string; secret_key: string; secret_value: string };
      if (!body?.project_id || !body?.secret_key || !body?.secret_value) {
        return reply.status(400).send({ error: 'project_id, secret_key, and secret_value are required' });
      }

      const { id: userId } = request.profile;
      const isMember = await assertProjectMember(body.project_id, userId);
      if (!isMember) return reply.status(403).send({ error: 'Access denied' });

      // Encrypt immediately before any await that could fail — Doc 14 sec req 2
      const encryptedValue = encryptSecret(body.secret_value.trim()).toString('base64');

      const { error: updateErr } = await supabase
        .from('project_secrets')
        .update({ [body.secret_key]: encryptedValue })
        .eq('project_id', body.project_id);

      if (updateErr) {
        fastify.log.error({ err: updateErr, project_id: body.project_id, secret_key: body.secret_key }, 'secrets/update failed');
        return reply.status(500).send({ error: 'Failed to update secret' });
      }

      return reply.send({ ok: true });
    }
  );
}