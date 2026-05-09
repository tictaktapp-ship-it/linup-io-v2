import { SupabaseClient } from '@supabase/supabase-js';
import type { PltOutput } from './plt.js';
import type { IgResult } from './ig.js';
import type { VpConsolidation } from './compression.js';

// â”€â”€â”€ Notification helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// All notifications: push (Supabase Realtime) + email (Resend via server/.env RESEND_API_KEY)

async function getProjectOwnerEmail(projectId: string, db: SupabaseClient): Promise<string | null> {
  const { data } = await db.from('projects').select('owner_id').eq('id', projectId).single();
  if (!data?.owner_id) return null;
  const { data: user } = await db.from('users').select('email').eq('id', data.owner_id).single();
  return user?.email ?? null;
}

async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.warn('[notifications] RESEND_API_KEY not set â€” skipping email'); return; }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'LINUP <noreply@linup.io>', to, subject, text: body }),
    });
    if (!res.ok) console.error('[notifications] Email send failed: ' + res.status);
  } catch (e: any) { console.error('[notifications] Email error: ' + e.message); }
}

async function pushRealtimeEvent(projectId: string, event: string, payload: object, db: SupabaseClient): Promise<void> {
  await db.from('notification_events').insert({ project_id: projectId, event_type: event, payload_json: payload, created_at: new Date().toISOString() });
}

// â”€â”€â”€ 1. Questions ready (Doc 7A â€” most important) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function sendQuestionsReady(projectId: string, pltOutput: PltOutput, db: SupabaseClient): Promise<void> {
  await pushRealtimeEvent(projectId, 'QUESTIONS_READY', { stage: pltOutput.stage, questionCount: pltOutput.questionsForFounder.length }, db);
  const email = await getProjectOwnerEmail(projectId, db);
  if (email) {
    const subject = 'Your input needed â€” Stage ' + pltOutput.stage + ' ready';
    const body = pltOutput.stageSummaryForFounder + '\n\nYou have ' + pltOutput.questionsForFounder.length + ' question(s) to answer. Log in at https://linup.io/app to continue.';
    await sendEmail(email, subject, body);
  }
  console.log('[notifications] QUESTIONS_READY sent â€” stage ' + pltOutput.stage);
}

// â”€â”€â”€ 2. Stage complete no questions (Doc 7A) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function sendStageCompleteNoQuestions(projectId: string, stage: number, db: SupabaseClient): Promise<void> {
  await pushRealtimeEvent(projectId, 'STAGE_COMPLETE', { stage }, db);
  const email = await getProjectOwnerEmail(projectId, db);
  if (email) await sendEmail(email, 'Stage ' + stage + ' complete', 'Stage ' + stage + ' is complete. Moving to Stage ' + (stage + 1) + '. Log in at https://linup.io/app to follow progress.');
  console.log('[notifications] STAGE_COMPLETE (no questions) sent â€” stage ' + stage);
}

// â”€â”€â”€ 3. Checkpoint 1 (Doc 7A â€” informational, no action required) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function sendCheckpoint1(projectId: string, consolidation: VpConsolidation, db: SupabaseClient): Promise<void> {
  await db.from('stage_runs').update({ checkpoint_1_status: 'SHOWN', updated_at: new Date().toISOString() }).eq('project_id', projectId).eq('stage', consolidation.stage);
  await pushRealtimeEvent(projectId, 'CHECKPOINT_1', { stage: consolidation.stage }, db);
  console.log('[notifications] CHECKPOINT_1 fired â€” stage ' + consolidation.stage);
}

// â”€â”€â”€ 4. Deadlock (Doc 7A) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function sendDeadlockNotification(projectId: string, stage: number, igResult: IgResult, db: SupabaseClient): Promise<void> {
  await pushRealtimeEvent(projectId, 'DEADLOCK', { stage, reason: igResult.holdReason }, db);
  const email = await getProjectOwnerEmail(projectId, db);
  if (email) {
    const subject = 'Your team is stuck â€” Stage ' + stage + ' needs your input';
    const body = 'Your engineering team has hit a deadlock on Stage ' + stage + '. This means the team has disagreed 3 times and cannot resolve it without your direction. Log in at https://linup.io/app to review and decide.';
    await sendEmail(email, subject, body);
  }
  console.log('[notifications] DEADLOCK sent â€” stage ' + stage);
}

// â”€â”€â”€ 5. Error recovered (Doc 7A) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function sendErrorRecovered(projectId: string, stage: number, db: SupabaseClient): Promise<void> {
  await pushRealtimeEvent(projectId, 'ERROR_RECOVERED', { stage }, db);
  const email = await getProjectOwnerEmail(projectId, db);
  if (email) await sendEmail(email, 'Issue resolved â€” Stage ' + stage + ' continuing', 'Your team hit a temporary issue on Stage ' + stage + ' but has recovered automatically. No action needed.');
  console.log('[notifications] ERROR_RECOVERED sent â€” stage ' + stage);
}

// â”€â”€â”€ 6. Hold notification (Doc 7A) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function sendHoldNotification(projectId: string, stage: number, igResult: IgResult, db: SupabaseClient): Promise<void> {
  await pushRealtimeEvent(projectId, 'HOLD', { stage, reason: igResult.holdReason }, db);
  console.log('[notifications] HOLD sent â€” stage ' + stage);
}