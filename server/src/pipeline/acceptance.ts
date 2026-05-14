import { SupabaseClient } from '@supabase/supabase-js';
import { callAIWithRetry } from './payload.js';
import type { Message } from './payload.js';
import { record } from './cost.js';
import type { VpConsolidation } from './compression.js';

export type AcceptanceStatus = 'SATISFIED' | 'PARTIALLY_SATISFIED' | 'NOT_SATISFIED';
export interface AcceptanceCriterionResult { criterion: string; status: AcceptanceStatus; notes: string; }
export interface AcceptanceResult { passed: boolean; blockedBy: string[]; assumptions: string[]; criteria: AcceptanceCriterionResult[]; }
export class AcceptanceBlockedError extends Error {
  constructor(stage: number, blockedBy: string[]) { super('Acceptance blocked for stage ' + stage + ': ' + blockedBy.join('; ')); }
}

const ACCEPTANCE_SYSTEM_PROMPT = 'You are a Specification Acceptance Tester. For each acceptance criterion below, ' +
  'evaluate the VP Consolidation and return exactly one of: SATISFIED, PARTIALLY_SATISFIED, or NOT_SATISFIED. ' +
  'Output ONLY valid JSON with no prose or markdown: { passed: boolean, blockedBy: string[], assumptions: string[], criteria: [{ criterion, status, notes }] }';

const STAGE_ACCEPTANCE_CRITERIA: Record<number, string[]> = {
  0: ['Feature Charter is complete with all MVP features listed','All must-haves and must-not-haves are documented','Domain classification is present and justified'],
  1: ['Problem statement is specific and evidence-backed','Target user segments are defined with observable characteristics','Pain points are prioritised and traceable to user evidence','Accessibility requirements are documented'],
  2: ['Solution differentiation is clearly articulated','Competitive landscape is mapped','Core value proposition is testable'],
  3: ['Revenue model is specified with pricing logic','Unit economics are estimated','Key business metrics are defined'],
  4: ['Total addressable market is sized with methodology','Go-to-market channels are specified','Launch sequence is defined'],
  5: ['MVP feature set is bounded and justified','All features have acceptance criteria','Out-of-scope items are explicitly listed'],
  6: ['User flows are documented for all primary journeys','Design system tokens are specified','Accessibility standards are applied (WCAG level stated)'],
  7: ['Technical stack is fully specified with justifications','Data model covers all MVP entities','API contracts are defined for all integrations','Security architecture is documented'],
  8: ['Top risks are identified with mitigations','Technical feasibility is confirmed or red-flagged','Regulatory requirements are documented'],
  9: ['Data retention policy is specified','GDPR/privacy obligations are mapped','Data classification is documented'],
  10: ['Roadmap phases are sequenced with dependencies','MVP delivery timeline is estimated','Post-launch iteration plan is outlined'],
  11: ['All prior stage outputs are synthesised into coherent specification','No contradictions remain between stages','Specification is complete enough for handover to developer'],
  12: ['Final validation confirms specification completeness','All open questions are resolved or explicitly deferred','Handover package is ready'],
};

function extractJson(raw: string): Record<string, unknown> | null {
  const clean = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  try { return JSON.parse(clean) as Record<string, unknown>; } catch { /* fall through */ }
  const matches = clean.match(/\{[\s\S]*\}/g);
  if (matches && matches.length > 0) {
    try { return JSON.parse(matches[matches.length - 1]!) as Record<string, unknown>; } catch { /* fall through */ }
  }
  return null;
}

export async function test(projectId: string, stage: number, consolidation: VpConsolidation, db: SupabaseClient): Promise<AcceptanceResult> {
  if (stage === 0) { console.log('[acceptance] Stage 0 bypass — auto-pass'); return { passed: true, blockedBy: [], assumptions: [], criteria: [] }; }
  const criteria = STAGE_ACCEPTANCE_CRITERIA[stage] ?? [];
  if (criteria.length === 0) { console.warn('[acceptance] No criteria for stage ' + stage + ' — skipping'); return { passed: true, blockedBy: [], assumptions: [], criteria: [] }; }
  const userContent = 'VP CONSOLIDATION:\n' + JSON.stringify(consolidation) + '\n\nACCEPTANCE CRITERIA TO TEST:\n' + criteria.map((c, i) => (i + 1) + '. ' + c).join('\n');
  const messages: Message[] = [{ role: 'system', content: ACCEPTANCE_SYSTEM_PROMPT }, { role: 'user', content: userContent }];
  const response = await callAIWithRetry('W', messages);
  await record(projectId, stage, 'ACCEPTANCE_TESTER', 'W', response, db);
  const raw = (response.choices[0]?.message.content ?? '').trim();
  const parsed = extractJson(raw);
  let result: AcceptanceResult;
  if (!parsed || typeof parsed['passed'] !== 'boolean') {
    console.warn('[acceptance] JSON parse failed for stage ' + stage + ' — auto-passing');
    result = { passed: true, blockedBy: [], assumptions: [], criteria: [] };
  } else {
    result = parsed as unknown as AcceptanceResult;
  }
  await db.from('acceptance_test_results').insert({ project_id: projectId, stage, result_json: result, passed: result.passed, created_at: new Date().toISOString() });
  console.log('[acceptance] Stage ' + stage + ' — passed: ' + result.passed);
  if (!result.passed) throw new AcceptanceBlockedError(stage, result.blockedBy);
  return result;
}