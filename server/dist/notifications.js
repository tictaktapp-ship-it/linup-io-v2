import webpush from 'web-push';
import { Resend } from 'resend';
import { supabase } from './lib/supabase.js';
// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
// ---------------------------------------------------------------------------
// Content map
// ---------------------------------------------------------------------------
function buildContent(p) {
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
async function sendPush(userId, title, body, projectId) {
    const { data: subs, error } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', userId);
    if (error || !subs || subs.length === 0)
        return;
    const payload = JSON.stringify({ title, body, url: `/app/project/${projectId}` });
    await Promise.allSettled(subs.map((row) => webpush.sendNotification(row.subscription, payload).catch((err) => {
        // 410 Gone = subscription expired — remove it
        if (err.statusCode === 410) {
            return supabase
                .from('push_subscriptions')
                .delete()
                .eq('user_id', userId)
                .eq('subscription->endpoint', row.subscription.endpoint);
        }
    })));
}
async function sendEmail(userId, subject, html) {
    const { data: user, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !user?.user?.email)
        return;
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
export async function notify(p) {
    // checkpoint_1 is Realtime only — no push or email
    if (p.event === 'checkpoint_1')
        return;
    const { title, body, subject, html } = buildContent(p);
    if (!title)
        return;
    const pushEvents = [
        'questions_ready',
        'stage_complete',
        'deadlock',
        'provider_outage',
        'error_recovered',
    ];
    const emailEvents = [
        'questions_ready',
        'deadlock',
        'provider_outage',
    ];
    const tasks = [];
    if (pushEvents.includes(p.event)) {
        tasks.push(sendPush(p.userId, title, body, p.projectId));
    }
    if (emailEvents.includes(p.event) && subject && html) {
        tasks.push(sendEmail(p.userId, subject, html));
    }
    await Promise.allSettled(tasks);
}
//# sourceMappingURL=notifications.js.map