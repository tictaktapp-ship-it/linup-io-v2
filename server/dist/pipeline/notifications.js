import { SupabaseClient } from '@supabase/supabase-js';
import { notify } from '../notifications.js';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function getProjectOwner(projectId, db) {
    const { data: project } = await db
        .from('projects')
        .select('created_by, name')
        .eq('id', projectId)
        .single();
    if (!project?.created_by)
        return { userId: null, email: null, name: project?.name ?? null };
    const { data: { user } } = await db.auth.admin.getUserById(project.created_by);
    return {
        userId: project.created_by,
        email: user?.email ?? null,
        name: project.name ?? null,
    };
}
async function sendEmail(to, subject, body) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.warn('[notifications] RESEND_API_KEY not set — skipping email');
        return;
    }
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: 'LINUP <hello@linup.io>', to, subject, text: body }),
        });
        if (!res.ok)
            console.error('[notifications] Email send failed: ' + res.status);
    }
    catch (e) {
        console.error('[notifications] Email error: ' + e.message);
    }
}
async function pushRealtimeEvent(projectId, event, payload, db) {
    await db.from('notification_events').insert({
        project_id: projectId,
        event_type: event,
        payload_json: payload,
        created_at: new Date().toISOString(),
    });
}
// ---------------------------------------------------------------------------
// 1. Questions ready — push + email (most important)
// Spec: Doc 8D Phase 8 event 1
// ---------------------------------------------------------------------------
export async function sendQuestionsReady(projectId, pltOutput, db) {
    await pushRealtimeEvent(projectId, 'QUESTIONS_READY', { stage: pltOutput.stage, questionCount: pltOutput.questionsForFounder.length }, db);
    const { userId, email, name } = await getProjectOwner(projectId, db);
    if (userId) {
        await notify({
            event: 'questions_ready',
            userId,
            projectId,
            projectName: name ?? undefined,
            stageName: 'Stage ' + pltOutput.stage,
        });
    }
    if (email) {
        const subject = 'Your input needed — Stage ' + pltOutput.stage + ' ready';
        const body = pltOutput.stageSummaryForFounder + '\n\nYou have ' + pltOutput.questionsForFounder.length + ' question(s) to answer. Log in at https://linup.io/app to continue.';
        await sendEmail(email, subject, body);
    }
    console.log('[notifications] QUESTIONS_READY sent — stage ' + pltOutput.stage);
}
// ---------------------------------------------------------------------------
// 2. Stage complete — push only
// Spec: Doc 8D Phase 8 event 2
// ---------------------------------------------------------------------------
export async function sendStageCompleteNoQuestions(projectId, stage, db) {
    await pushRealtimeEvent(projectId, 'STAGE_COMPLETE', { stage }, db);
    const { userId, name } = await getProjectOwner(projectId, db);
    if (userId) {
        await notify({
            event: 'stage_complete',
            userId,
            projectId,
            projectName: name ?? undefined,
            stageName: 'Stage ' + stage,
        });
    }
    console.log('[notifications] STAGE_COMPLETE sent — stage ' + stage);
}
// ---------------------------------------------------------------------------
// 3. Checkpoint 1 — Realtime only, no push or email
// Spec: Doc 8D Phase 8 event 3
// ---------------------------------------------------------------------------
export async function sendCheckpoint1(projectId, consolidation, db) {
    await db.from('stage_runs')
        .update({ checkpoint_1_status: 'SHOWN', updated_at: new Date().toISOString() })
        .eq('project_id', projectId)
        .eq('stage', consolidation.stage);
    await pushRealtimeEvent(projectId, 'CHECKPOINT_1', { stage: consolidation.stage }, db);
    console.log('[notifications] CHECKPOINT_1 fired — stage ' + consolidation.stage);
}
// ---------------------------------------------------------------------------
// 4. Deadlock — push + email
// Spec: Doc 8D Phase 8 event 4
// ---------------------------------------------------------------------------
export async function sendDeadlockNotification(projectId, stage, igResult, db) {
    await pushRealtimeEvent(projectId, 'DEADLOCK', { stage, reason: igResult.holdReason }, db);
    const { userId, email, name } = await getProjectOwner(projectId, db);
    if (userId) {
        await notify({
            event: 'deadlock',
            userId,
            projectId,
            projectName: name ?? undefined,
            stageName: 'Stage ' + stage,
        });
    }
    if (email) {
        const subject = 'Your team is stuck — Stage ' + stage + ' needs your input';
        const body = 'Your engineering team has hit a deadlock on Stage ' + stage + '. This means the team has disagreed 3 times and cannot resolve it without your direction. Log in at https://linup.io/app to review and decide.';
        await sendEmail(email, subject, body);
    }
    console.log('[notifications] DEADLOCK sent — stage ' + stage);
}
// ---------------------------------------------------------------------------
// 5. Provider outage — push + email
// Spec: Doc 8D Phase 8 event 5
// ---------------------------------------------------------------------------
export async function sendProviderOutage(projectId, stage, db) {
    await pushRealtimeEvent(projectId, 'PROVIDER_OUTAGE', { stage }, db);
    const { userId, email, name } = await getProjectOwner(projectId, db);
    if (userId) {
        await notify({
            event: 'provider_outage',
            userId,
            projectId,
            projectName: name ?? undefined,
            stageName: 'Stage ' + stage,
        });
    }
    if (email) {
        const subject = 'Pipeline paused — provider outage';
        const body = 'The pipeline for your project has been paused due to an AI provider outage. It will resume automatically once the provider recovers. No action needed.';
        await sendEmail(email, subject, body);
    }
    console.log('[notifications] PROVIDER_OUTAGE sent — stage ' + stage);
}
// ---------------------------------------------------------------------------
// 6. Error recovered — push only
// Spec: Doc 8D Phase 8 event 6
// ---------------------------------------------------------------------------
export async function sendErrorRecovered(projectId, stage, db) {
    await pushRealtimeEvent(projectId, 'ERROR_RECOVERED', { stage }, db);
    const { userId, name } = await getProjectOwner(projectId, db);
    if (userId) {
        await notify({
            event: 'error_recovered',
            userId,
            projectId,
            projectName: name ?? undefined,
            stageName: 'Stage ' + stage,
        });
    }
    console.log('[notifications] ERROR_RECOVERED sent — stage ' + stage);
}
// ---------------------------------------------------------------------------
// Hold notification — Realtime only (internal pipeline event, no push/email)
// ---------------------------------------------------------------------------
export async function sendHoldNotification(projectId, stage, igResult, db) {
    await pushRealtimeEvent(projectId, 'HOLD', { stage, reason: igResult.holdReason }, db);
    console.log('[notifications] HOLD sent — stage ' + stage);
}
//# sourceMappingURL=notifications.js.map