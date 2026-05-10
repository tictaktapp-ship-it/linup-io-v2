import type { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import { supabase } from '../lib/supabase.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' });

export async function webhookRoutes(app: FastifyInstance) {

  // POST /api/webhooks/stripe
  // Standard Stripe webhook — subscription + payment events
  // Raw body required for signature verification — no JSON parsing middleware
  app.post('/api/webhooks/stripe', {
    config: { rawBody: true },
  }, async (req, reply) => {
    const sig = req.headers['stripe-signature'] as string;
    if (!sig) return reply.status(400).send({ error: 'Missing stripe-signature header' });
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        (req as any).rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      req.log.warn('Stripe webhook signature verification failed: ' + err.message);
      return reply.status(400).send({ error: 'Invalid signature' });
    }
    try {
      switch (event.type) {

        case 'payment_intent.succeeded': {
          const pi = event.data.object as Stripe.PaymentIntent;
          const { projectId, userId, type: piType } = pi.metadata;
          if (!projectId || !userId) break;
          // Upsert artifact_payments record
          await supabase.from('artifact_payments').upsert({
            project_id: projectId,
            user_id: userId,
            artifact_type: piType === 'APP_PACKAGE' ? 'APP_PACKAGE' : 'PER_ARTIFACT',
            stripe_payment_intent_id: pi.id,
            stripe_payment_status: 'succeeded',
            amount_gbp: pi.amount / 100,
            paid_at: new Date().toISOString(),
          }, { onConflict: 'stripe_payment_intent_id' });
          // If APP_PACKAGE, mark project as paid
          if (piType === 'APP_PACKAGE') {
            await supabase.from('projects').update({ app_download_paid: true }).eq('id', projectId);
          }
          break;
        }

        case 'customer.subscription.created': {
          const sub = event.data.object as Stripe.Subscription;
          const customerId = sub.customer as string;
          await supabase.from('organisations')
            .update({ plan: 'PRO', stripe_subscription_id: sub.id })
            .eq('stripe_customer_id', customerId);
          break;
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          const customerId = sub.customer as string;
          await supabase.from('organisations')
            .update({ plan: 'FREE', stripe_subscription_id: null })
            .eq('stripe_customer_id', customerId);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;
          // Log the failure — grace period + notification handled by Phase 8 notifications
          req.log.warn('invoice.payment_failed for customer: ' + customerId);
          break;
        }

        default:
          req.log.info('Unhandled Stripe event type: ' + event.type);
      }
    } catch (err: any) {
      req.log.error('Webhook handler error: ' + err.message);
      return reply.status(500).send({ error: 'INTERNAL' });
    }
    return reply.send({ received: true });
  });

  // POST /api/webhooks/stripe/connect
  // Stripe Connect webhook — separate secret, connected account events
  app.post('/api/webhooks/stripe/connect', {
    config: { rawBody: true },
  }, async (req, reply) => {
    const sig = req.headers['stripe-signature'] as string;
    if (!sig) return reply.status(400).send({ error: 'Missing stripe-signature header' });
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        (req as any).rawBody,
        sig,
        process.env.STRIPE_CONNECT_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      req.log.warn('Stripe Connect webhook signature verification failed: ' + err.message);
      return reply.status(400).send({ error: 'Invalid signature' });
    }
    try {
      switch (event.type) {

        case 'account.application.authorized': {
          const account = event.account;
          if (!account) break;
          await supabase.from('mec_agreements')
            .update({ mec_status: 'CONNECTED', connected_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('stripe_connected_account_id', account);
          break;
        }

        case 'account.application.deauthorized': {
          const account = event.account;
          req.log.warn('Stripe Connect account deauthorized: ' + account);
          if (!account) break;
          await supabase.from('mec_agreements')
            .update({ mec_status: 'INACTIVE', updated_at: new Date().toISOString() })
            .eq('stripe_connected_account_id', account);
          break;
        }

        case 'charge.succeeded': {
          const charge = event.data.object as Stripe.Charge;
          const connectedAccountId = event.account;
          if (!connectedAccountId) break;
          // Look up the mec_agreement for this connected account
          const { data: agreement } = await supabase.from('mec_agreements')
            .select('id, application_fee_percent')
            .eq('stripe_connected_account_id', connectedAccountId)
            .maybeSingle();
          if (!agreement) break;
          const grossGbp = charge.amount / 100;
          const feeGbp = (grossGbp * Number(agreement.application_fee_percent)) / 100;
          await supabase.from('mec_revenue_events').upsert({
            mec_agreement_id: agreement.id,
            stripe_charge_id: charge.id,
            gross_amount_gbp: grossGbp,
            application_fee_gbp: feeGbp,
            stripe_event_id: event.id,
            processed_at: new Date().toISOString(),
          }, { onConflict: 'stripe_event_id' });
          break;
        }

        default:
          req.log.info('Unhandled Stripe Connect event type: ' + event.type);
      }
    } catch (err: any) {
      req.log.error('Connect webhook handler error: ' + err.message);
      return reply.status(500).send({ error: 'INTERNAL' });
    }
    return reply.send({ received: true });
  });
}
