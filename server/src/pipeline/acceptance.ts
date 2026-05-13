import { SupabaseClient } from '@supabase/supabase-js';
import { callAIWithRetry } from './payload.js'
import type { Message } from './payload.js';
import { record } from './cost.js';
import type { VpConsolidation } from './compression.js';

// â”€â”€â”€ Types (Doc 9C) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export type AcceptanceStatus = 'SATISFIED' | 'PARTIALLY_SATISFIED' | 'NOT_SATISFIED';

export interface AcceptanceCriterionResult {
  criterion: string;
  status: AcceptanceStatus;
  notes: string;
}

export interface AcceptanceResult {
  passed: boolean;               // false if any criterion is NOT_SATISFIED
  blockedBy: string[];           // criteria that returned NOT_SATISFIED
  assumptions: string[];         // PARTIALLY_SATISFIED criteria logged as assumptions
  criteria: AcceptanceCriterionResult[];
}

export class AcceptanceBlockedError extends Error {
  constructor(stage: number, blockedBy: string[]) {
    super('Acceptance blocked for stage ' + stage + ': ' + blockedBy.join('; '));
  }
}

// â”€â”€â”€ Acceptance system prompt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ACCEPTANCE_SYSTEM_PROMPT = 'You are a Specification Acceptance Tester. For each acceptance criterion below, ' +
  'evaluate the VP Consolidation and return exactly one of: SATISFIED, PARTIALLY_SATISFIED, or NOT_SATISFIED. ' +
  'SATISFIED: criterion fully met with evidence. ' +
  'PARTIALLY_SATISFIED: criterion met in part â€” log as assumption, do not block. ' +
  'NOT_SATISFIED: criterion not met â€” this blocks progression to IG review. ' +
  'Output ONLY valid JSON: { passed: boolean, blockedBy: string[], assumptions: string[], criteria: [{ criterion, status, notes }] }';

// â”€â”€â”€ Stage acceptance criteria (per stage) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Criteria are stage-specific. Extend as stages are seeded.
const STAGE_ACCEPTANCE_CRITERIA: Record<number, string[]> = {
  0: [
    'Feature Charter is complete with all MVP features listed',
    'All must-haves and must-not-haves are documented',
    'Domain classification is present and justified',
  ],
  1: [
    'Problem statement is specific and evidence-backed',
    'Target user segments are defined with observable characteristics',
    'Pain points are prioritised and traceable to user evidence',
    'Accessibility requirements are documented',
  ],
  2: [
    'Solution differentiation is clearly articulated',
    'Competitive landscape is mapped',
    'Core value proposition is testable',
  ],
  3: [
    'Revenue model is specified with pricing logic',
    'Unit economics are estimated',
    'Key business metrics are defined',
  ],
  4: [
    'Total addressable market is sized with methodology',
    'Go-to-market channels are specified',
    'Launch sequence is defined',
  ],
  5: [
    'MVP feature set is bounded and justified',
    'All features have acceptance criteria',
    'Out-of-scope items are explicitly listed',
  ],
  6: [
    'User flows are documented for all primary journeys',
    'Design system tokens are specified',
    'Accessibility standards are applied (WCAG level stated)',
  ],
  7: [
    'Technical stack is fully specified with justifications',
    'Data model covers all MVP entities',
    'API contracts are defined for all integrations',
    'Security architecture is documented',
  ],
  8: [
    'Top risks are identified with mitigations',
    'Technical feasibility is confirmed or red-flagged',
    'Regulatory requirements are documented',
  ],
  9: [
    'Data retention policy is specified',
    'GDPR/privacy obligations are mapped',
    'Data classification is documented',
  ],
  10: [
    'Roadmap phases are sequenced with dependencies',
    'MVP delivery timeline is estimated',
    'Post-launch iteration plan is outlined',
  ],
  11: [
    'All prior stage outputs are synthesised into coherent specification',
    'No contradictions remain between stages',
    'Specification is complete enough for handover to developer',
  ],
  12: [
    'Final validation confirms specification completeness',
    'All open questions are resolved or explicitly deferred',
    'Handover package is ready',
  ],
};

// â”€â”€â”€ test (Doc 9C + 8E step 8) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Tier W. Runs after Fidelity Check, before IG.
// NOT_SATISFIED â†’ throws AcceptanceBlockedError (VP must resolve gap before IG)
export async function test(
  projectId: string,
  stage: number,
  consolidation: VpConsolidation,
  db: SupabaseClient
): Promise<AcceptanceResult> {
  // Stage 0: bypass acceptance test — always pass (pipeline flow validation)
  if (stage === 0) {
    console.log('[acceptance] Stage 0 bypass — auto-pass');
    return { passed: true, blockedBy: [], assumptions: [], criteria: [] };
  }

  const criteria = STAGE_ACCEPTANCE_CRITERIA[stage] ?? [];
  if (criteria.length === 0) {
    console.warn('[acceptance] No criteria defined for stage ' + stage + ' â€” skipping');
    return { passed: true, blockedBy: [], assumptions: [], criteria: [] };
  }

  const userContent = 'VP CONSOLIDATION:\n' + JSON.stringify(consolidation) +
    '\n\nACCEPTANCE CRITERIA TO TEST:\n' + criteria.map((c, i) => (i + 1) + '. ' + c).join('\n');

  const messages: Message[] = [
    { role: 'system', content: ACCEPTANCE_SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ];

  const response = await callAIWithRetry('W', messages);
  await record(projectId, stage, 'ACCEPTANCE_TESTER', 'W', response, db);

  const raw = (response.choices[0]?.message.content ?? '').trim();
  const rawClean = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  let result: AcceptanceResult;
  try {
    result = JSON.parse(rawClean);
  } catch (e) {
    throw new Error('[acceptance] JSON parse failed: ' + raw.slice(0, 100));
  }

  // Persist result
  await db.from('acceptance_test_results').insert({
    project_id: projectId,
    stage,
    result_json: result,
    passed: result.passed,
    created_at: new Date().toISOString(),
  });

  console.log('[acceptance] Stage ' + stage + ' â€” passed: ' + result.passed +
    (result.blockedBy.length ? ' blocked by: ' + result.blockedBy.join('; ') : '') +
    (result.assumptions.length ? ' assumptions: ' + result.assumptions.length : ''));

  // NOT_SATISFIED blocks IG â€” throw so index.ts can return to VP
  if (!result.passed) {
    throw new AcceptanceBlockedError(stage, result.blockedBy);
  }

  return result;
}