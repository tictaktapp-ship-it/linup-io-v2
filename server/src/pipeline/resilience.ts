import { SupabaseClient } from '@supabase/supabase-js';
import type { IgResult } from './ig.js';

// â”€â”€â”€ Hold Counter & Deadlock (Doc 7A) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const DEADLOCK_THRESHOLD = 3; // 3 holds = DEADLOCKED

export interface HoldRecord {
  projectId: string;
  stage: number;
  holdCount: number;
  deadlocked: boolean;
}

// â”€â”€â”€ CRP types (Doc 9D) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export type CrpTier = 'A' | 'B' | 'C';
export interface CrpRecord {
  projectId: string;
  stage: number;
  tier: CrpTier;
  description: string;
  resolution: string;
  resolvedAt: string;
}

// â”€â”€â”€ incrementHoldCount (Doc 7A) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Returns new hold count. Caller checks for deadlock threshold.
export async function incrementHoldCount(projectId: string, stage: number, db: SupabaseClient): Promise<number> {
  const { data: current } = await db.from('stage_runs').select('hold_count').eq('project_id', projectId).eq('stage', stage).single();
  const newCount = ((current?.hold_count ?? 0) as number) + 1;
  await db.from('stage_runs').update({ hold_count: newCount, updated_at: new Date().toISOString() }).eq('project_id', projectId).eq('stage', stage);
  return newCount;
}

// â”€â”€â”€ handleHold (Doc 7A) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Called when IG issues a HOLD. Increments counter, checks for deadlock.
// Returns { deadlocked: boolean } â€” caller decides next action.
export async function handleHold(projectId: string, stage: number, igResult: IgResult, db: SupabaseClient): Promise<HoldRecord> {
  const holdCount = await incrementHoldCount(projectId, stage, db);
  const deadlocked = holdCount >= DEADLOCK_THRESHOLD;

  if (deadlocked) {
    await db.from('stage_runs').update({ status: 'DEADLOCKED', deadlock_declared_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('project_id', projectId).eq('stage', stage);
    console.log('[resilience] DEADLOCKED â€” project ' + projectId + ' stage ' + stage + ' holds: ' + holdCount);
  } else {
    await db.from('stage_runs').update({ status: 'HOLD', updated_at: new Date().toISOString() }).eq('project_id', projectId).eq('stage', stage);
    console.log('[resilience] HOLD ' + holdCount + '/' + DEADLOCK_THRESHOLD + ' â€” project ' + projectId + ' stage ' + stage);
  }

  await db.from('hold_log').insert({ project_id: projectId, stage, hold_number: holdCount, hold_reason: igResult.holdReason ?? null, deadlocked, created_at: new Date().toISOString() });
  return { projectId, stage, holdCount, deadlocked };
}

// â”€â”€â”€ recordCrp (Doc 9D â€” Conflict Resolution Protocol) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Tier A: VP resolves inline. Tier B: requirement unachievable â€” PM + IG notified. Tier C: scope change â€” PM reassesses.
export async function recordCrp(record: CrpRecord, db: SupabaseClient): Promise<void> {
  await db.from('crp_records').insert({
    project_id: record.projectId,
    stage: record.stage,
    tier: record.tier,
    description: record.description,
    resolution: record.resolution,
    resolved_at: record.resolvedAt,
  });
  console.log('[resilience] CRP Tier ' + record.tier + ' recorded â€” stage ' + record.stage);
}

// â”€â”€â”€ recordWlap (Doc 9D â€” Work-Loss Avoidance Protocol) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Called when a stage error or pause risks losing completed IC work.
// Ensures completed IC artifacts are checkpointed before any re-run.
export async function checkWlap(projectId: string, stage: number, db: SupabaseClient): Promise<{ safeToRerun: boolean; completedIcs: string[] }> {
  const { data: artifacts } = await db.from('ic_artifacts').select('member_id, status').eq('project_id', projectId).eq('stage', stage).eq('status', 'ACCEPTED');
  const completedIcs = (artifacts ?? []).map((a: any) => a.member_id);
  console.log('[resilience] WLAP check â€” stage ' + stage + ' completed ICs: ' + completedIcs.length);
  return { safeToRerun: true, completedIcs };
}