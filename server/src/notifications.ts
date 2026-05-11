import webpush from 'web-push';
import { Resend } from 'resend';
import { supabase } from './lib/supabase.js';

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

const resend = new Resend(process.env.RESEND_API_KEY!);

// ---------------------------------------------------------------------------
// Event types
// Spec: Doc 8D Phase 8 — Events to implement
//
// 1. questions_ready   → push + email
// 2. stage_complete    → push only
// 3. checkpoint_1      → Realtime only (no push/email)
// 4. deadlock          → push + email
// 5. provider_outage   → push + email
// 6. error_recovered   → push only
// ---------------------------------------------------------------------------

export type NotificationEvent =
  | 'questions_ready'
  | 'stage_complete'
  | 'checkpoint_1'
  | 'deadlock'
  | 'provider_outage'
  | 'error_recovered';

interface NotifyPayload {
  event: NotificationEvent;
  userId: string;
  projectId: string;
  projectName?: string;
  stageName?: string;
  extra?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Content map
// ---------------------------------------------------------------------------

function buildContent(p: NotifyPayload): { title: string; body: string; subject: string; html: string } {
  const proj = p.projectName ?? 'Your project';
  const stage = p.stageName ?? 'current stage';

  switch (p.event) {
    case 'questions_ready':
      return {
        title: 'Your team needs input',
        body: `${proj} — your engineering team has questions ready for ${stage}.`,
        subject: `[LINUP] Input needed — ${proj}`,
        html: `<p>Your engineering team has questions ready for <strong>${stage}</strong> in <strong>${proj}</strong>.</p><p><a href="https://linup.io/app/project/${p.projectId}">Review and answer →</a></p>`,
      };
    case 'stage_complete':
      return {
        title: 'Stage complete',
        body: `${proj} — ${stage} is complete.`,
        subject: '',
        html: '',
      };
    case 'deadlock':
      return {
        title: '⚠ Your team is stuck',
        body: `${proj} — your engineering team has reached a deadlock on ${stage}. Your input is required.`,
        subject: `[LINUP] Team deadlock — ${proj}`,
        html: `<p>Your engineering team has reached a deadlock on <strong>${stage}</strong> in <strong>${proj}</strong>.</p><p>Your input is required to continue.</p><p><a href="https://linup.io/app/project/${p.projectId}">Resolve deadlock →</a></p>`,
      };
    case 'provider_outage':
      return {
        title: 'Pipeline paused — provider outage',
        body: `${proj} — pipeline paused due to an AI provider outage. It will resume automatically.`,
        subject: `[LINUP] Pipeline paused — ${proj}`,
        html: `<p>The pipeline for <strong>${proj}</strong> has been paused due to an AI provider outage.</p><p>It will resume automatically once the provider recovers. No action needed.</p>`,
      };
    case 'error_recovered':
      return {
        title: 'Pipeline resumed',
        body: `${proj} — the pipeline has recovered and is running again.`,
        subject: '',
        html: '',
      };
    case 'checkpoint_1':
    default:
      // checkpoint_1 is Realtime only — this path should not be reached
      return { title: '', body: '', subject: '', html: '' };
  }
}

// ---------------------------------------------------------------------------
// Transport helpers
// ---------------------------------------------------------------------------

async function sendPush(userId: string, title: string, body: string, projectId: string): Promise<void> {
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId);

  if (error || !subs || subs.length === 0) return;

  const payload = JSON.stringify({ title, body, url: `/app/project/${projectId}` });

  await Promise.allSettled(
    subs.map((row: { subscription: webpush.PushSubscription }) =>
      webpush.sendNotification(row.subscription, payload).catch((err: Error) => {
        // 410 Gone = subscription expired — remove it
        if ((err as any).statusCode === 410) {
          return supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', userId)
            .eq('subscription->endpoint', row.subscription.endpoint);
        }
      })
    )
  );
}

async function sendEmail(userId: string, subject: string, html: string): Promise<void> {
  const { data: user, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !user?.user?.email) return;

  await resend.emails.send({
    from: 'LINUP <hello@linup.io>',
    to: user.user.email,
    subject,
    html,
  });
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function notify(p: NotifyPayload): Promise<void> {
  // checkpoint_1 is Realtime only — no push or email
  if (p.event === 'checkpoint_1') return;

  const { title, body, subject, html } = buildContent(p);
  if (!title) return;

  const pushEvents: NotificationEvent[] = [
    'questions_ready',
    'stage_complete',
    'deadlock',
    'provider_outage',
    'error_recovered',
  ];

  const emailEvents: NotificationEvent[] = [
    'questions_ready',
    'deadlock',
    'provider_outage',
  ];

  const tasks: Promise<void>[] = [];

  if (pushEvents.includes(p.event)) {
    tasks.push(sendPush(p.userId, title, body, p.projectId));
  }

  if (emailEvents.includes(p.event) && subject && html) {
    tasks.push(sendEmail(p.userId, subject, html));
  }

  await Promise.allSettled(tasks);
}