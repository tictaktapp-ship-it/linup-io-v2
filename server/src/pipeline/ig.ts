import { SupabaseClient } from '@supabase/supabase-js';
import { callAIWithRetry } from './payload.js';
import type { Message } from './payload.js';
import { record } from './cost.js';
import type { VpConsolidation } from './compression.js';

export interface IgResult {
  call: 1 | 2;
  hold: boolean;
  holdReason?: string;
  auditTrail: string;
  questionsForFounder?: IgQuestion[];
}

export interface IgQuestion {
  id: string;
  text: string;
  options: { label: 'A' | 'B' | 'C' | 'D'; text: string }[];
  optionDDetail?: string;
}

const STAGE_CONTRADICTION_CHECK: Record<number, number[]> = {
  1:[0], 2:[1], 3:[2], 4:[2,3], 5:[2,4], 6:[1,4], 7:[3,4], 8:[2,6], 9:[4,8], 10:[9], 11:[10], 12:[11],
};

const IG_CALL1_SYSTEM_PROMPT = 'You are the Inspector General. Call 1 - Mechanical Review (Tier M). ' +
  'Check 0 (Stage Entry Check): confirm upstream stages LOCKED, PM PROCEED confirmed, domain drift (8 triggers), RTM updated. ' +
  'Check 1 (Domain Error Check): identify content outside this stage domain. ' +
  'OVERALL: APPROVED or HOLD with specific reason. ' +
  'Output IG Structured Audit Trail per 9C Section 8. ' +
  'Final line must be JSON only: { hold: boolean, holdReason: string or null, auditTrail: string }';

const IG_CALL2_SYSTEM_PROMPT = 'You are the Inspector General. Call 2 - Reasoning Review (Tier S). ' +
  'Check 0.5 (Cross-Stage Contradiction Check): check against stages listed in context. ' +
  'Check 0.6 (Proportionality Check): flag disproportionate scope/cost/complexity claims. ' +
  'Coherence Score (4 dimensions): Scale, Technology, Timeline/Complexity, Security. ' +
  'Check 2 (Technical Question Resolution): resolve technical questions where possible. ' +
  'Check 3 (Question Filter): produce max 5 founder questions in A/B/C/D format. ' +
  'OVERALL: APPROVED or HOLD. ' +
  'Output IG Structured Audit Trail per 9C Section 8. ' +
  'Final line must be JSON only: { hold: boolean, holdReason: string or null, auditTrail: string, questionsForFounder: array }';

export async function runCall1(projectId: string, stage: number, consolidation: VpConsolidation, db: SupabaseClient): Promise<IgResult> {
  const { data: stageRun } = await db.from('stage_runs').select('status, pm_proceed_at').eq('project_id', projectId).eq('stage', stage).single();
  const userContent = 'STAGE: ' + stage + '\nPM_PROCEED_AT: ' + (stageRun?.pm_proceed_at ?? 'NOT SET') + '\n\nVP CONSOLIDATION:\n' + JSON.stringify(consolidation);
  const messages: Message[] = [{ role: 'system', content: IG_CALL1_SYSTEM_PROMPT }, { role: 'user', content: userContent }];
  const response = await callAIWithRetry('M', messages);
  await record(projectId, stage, 'IG-CALL-1', 'M', response, db);
  const raw = (response.choices[0]?.message.content ?? '').trim();
  const jsonLine = raw.split('\n').filter((l: string) => l.trim().startsWith('{')).pop() ?? '{}';
  const parsed = JSON.parse(jsonLine);
  const result: IgResult = { call: 1, hold: parsed.hold === true, holdReason: parsed.holdReason ?? undefined, auditTrail: raw };
  await db.from('ig_audit_trails').insert({ project_id: projectId, stage, call_number: 1, hold: result.hold, hold_reason: result.holdReason ?? null, audit_trail: result.auditTrail, created_at: new Date().toISOString() });
  console.log('[ig] Call 1 stage ' + stage + ' hold: ' + result.hold);
  return result;
}

export async function runCall2(projectId: string, stage: number, consolidation: VpConsolidation, call1Result: IgResult, db: SupabaseClient): Promise<IgResult> {
  const stagesToCheck = STAGE_CONTRADICTION_CHECK[stage] ?? [];
  const { data: priorAbstracts } = await db.from('stage_abstracts').select('stage, abstract_json').eq('project_id', projectId).in('stage', stagesToCheck);
  const userContent = 'STAGE: ' + stage +
    '\nSTAGES TO CHECK: ' + stagesToCheck.join(', ') +
    '\n\nVP CONSOLIDATION:\n' + JSON.stringify(consolidation) +
    '\n\nPRIOR ABSTRACTS:\n' + JSON.stringify((priorAbstracts ?? []).map((a: any) => a.abstract_json)) +
    '\n\nIG CALL 1 AUDIT TRAIL:\n' + call1Result.auditTrail;
  const messages: Message[] = [{ role: 'system', content: IG_CALL2_SYSTEM_PROMPT }, { role: 'user', content: userContent }];
  const response = await callAIWithRetry('S', messages);
  await record(projectId, stage, 'IG-CALL-2', 'S', response, db);
  const raw = (response.choices[0]?.message.content ?? '').trim();
  const jsonLine = raw.split('\n').filter((l: string) => l.trim().startsWith('{')).pop() ?? '{}';
  const parsed = JSON.parse(jsonLine);
  const result: IgResult = { call: 2, hold: parsed.hold === true, holdReason: parsed.holdReason ?? undefined, auditTrail: raw, questionsForFounder: parsed.questionsForFounder ?? [] };
  await db.from('ig_audit_trails').insert({ project_id: projectId, stage, call_number: 2, hold: result.hold, hold_reason: result.holdReason ?? null, audit_trail: result.auditTrail, questions_json: result.questionsForFounder ?? null, created_at: new Date().toISOString() });
  console.log('[ig] Call 2 stage ' + stage + ' hold: ' + result.hold + ' questions: ' + (result.questionsForFounder?.length ?? 0));
  return result;
}