import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

export async function notificationRoutes(app: FastifyInstance): Promise<void> {

  // POST /api/notifications/subscribe
  // Registers a browser PushSubscription for the authenticated user.
  // Body: { subscription: PushSubscriptionJSON }
  app.post('/api/notifications/subscribe', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const userId = (request as any).user.sub;
    const { subscription } = request.body as { subscription: object };

    if (!subscription) {
      return reply.status(400).send({ error: 'subscription required' });
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        { user_id: userId, subscription },
        { onConflict: 'subscription->endpoint' }
      );

    if (error) {
      request.log.error(error, 'Failed to save push subscription');
      return reply.status(500).send({ error: 'Failed to save subscription' });
    }

    return reply.status(201).send({ ok: true });
  });

  // DELETE /api/notifications/subscribe
  // Unregisters a browser PushSubscription for the authenticated user.
  // Body: { endpoint: string }
  app.delete('/api/notifications/subscribe', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const userId = (request as any).user.sub;
    const { endpoint } = request.body as { endpoint: string };

    if (!endpoint) {
      return reply.status(400).send({ error: 'endpoint required' });
    }

    const { error } = await (supabase as any)
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('subscription->endpoint', endpoint);

    if (error) {
      request.log.error(error, 'Failed to delete push subscription');
      return reply.status(500).send({ error: 'Failed to delete subscription' });
    }

    return reply.status(200).send({ ok: true });
  });

  // GET /api/notifications/vapid-public-key
  // Returns the VAPID public key so the browser can subscribe.
  // No auth required — public key is safe to expose.
  app.get('/api/notifications/vapid-public-key', async (_request, reply) => {
    return reply.send({ key: process.env.VAPID_PUBLIC_KEY });
  });
}