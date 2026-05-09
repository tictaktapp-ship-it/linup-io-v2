import { SupabaseClient } from '@supabase/supabase-js';
import { callAIWithRetry } from './payload.js';
import type { Message } from './payload.js';
import { record } from './cost.js';
import type { VpConsolidation } from './compression.js';

export interface CosOutput {
  stage: number;
  check1_scopeIntegrity: { passed: boolean; notes: string };
  check2_decisionConsistency: { passed: boolean; notes: string };
  check3_assumptionLog: { passed: boolean; notes: string };
  check4_openItems: { passed: boolean; notes: string; openItems: string[] };
  check5_founderReadiness: { passed: boolean; notes: string };
  check6_handoverPackage: { passed: boolean; notes: string };
  overallReady: boolean;
  summaryForPlt: string;
}

const COS_SYSTEM_PROMPT = 'You are the Chief of Staff (Tier M). Run exactly 6 checks before this stage output reaches the founder. ' +
  'Check 1 (Scope Integrity): confirm nothing outside MVP scope has been introduced. ' +
  'Check 2 (Decision Consistency): confirm no decision contradicts a prior stage decision. ' +
  'Check 3 (Assumption Log): confirm all assumptions are logged and flagged. ' +
  'Check 4 (Open Items): list any unresolved items that need founder awareness. ' +
  'Check 5 (Founder Readiness): confirm the PLT will have enough context to write clear founder questions. ' +
  'Check 6 (Handover Package): confirm all required sections are present for developer handover. ' +
  'Output ONLY valid JSON matching CosOutput schema. summaryForPlt must be a plain English paragraph for the PLT.';

// run (Doc 7A step 10 â€” Tier M)
export async function run(
  projectId: string,
  stage: number,
  consolidation: VpConsolidation,
  igAuditTrail: string,
  db: SupabaseClient
): Promise<CosOutput> {
  const { data: abstracts } = await db.from('stage_abstracts').select('stage, abstract_json').eq('project_id', projectId).lt('stage', stage).order('stage');

  const userContent = 'STAGE: ' + stage +
    '\n\nVP CONSOLIDATION:\n' + JSON.stringify(consolidation) +
    '\n\nIG AUDIT TRAIL:\n' + igAuditTrail +
    '\n\nPRIOR STAGE ABSTRACTS:\n' + JSON.stringify((abstracts ?? []).map((a: any) => a.abstract_json));

  const messages: Message[] = [
    { role: 'system', content: COS_SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ];

  const response = await callAIWithRetry('M', messages);
  await record(projectId, stage, 'COS', 'M', response, db);

  const raw = (response.choices[0]?.message.content ?? '').trim();
  let result: CosOutput;
  try {
    result = JSON.parse(raw);
  } catch (e) {
    throw new Error('[cos] JSON parse failed: ' + raw.slice(0, 100));
  }

  await db.from('cos_outputs').insert({
    project_id: projectId,
    stage,
    output_json: result,
    overall_ready: result.overallReady,
    created_at: new Date().toISOString(),
  });

  console.log('[cos] Stage ' + stage + ' ready: ' + result.overallReady + ' open items: ' + result.check4_openItems.openItems.length);
  return result;
}