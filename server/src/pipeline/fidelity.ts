import { SupabaseClient } from '@supabase/supabase-js';
import { callAIWithRetry } from './payload.js';
import type { Message } from './payload.js';
import { record } from './cost.js';
import type { VpConsolidation } from './compression.js';
import type { GroupReviewSummary } from './vp.js';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface FidelityResult {
  passed: boolean;
  checks: {
    decisionPreservation: boolean;    // Check 1: every Group Review Summary decision in consolidation
    contentTraceability: boolean;     // Check 2: every consolidation section traceable to IC output
    conflictResolutionDoc: boolean;   // Check 3: every resolution documented
    requirementCoverage: boolean;     // Check 4: every in-scope REQ-ID addressed
  };
  failedChecks: string[];
  notes: string;
}

export class FidelityCheckError extends Error {
  constructor(stage: number, failed: string[]) {
    super('Fidelity check failed stage ' + stage + ': ' + failed.join(', '));
  }
}

// â”€â”€â”€ Fidelity Check system prompt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FIDELITY_SYSTEM_PROMPT = 'You are a Consolidation Fidelity Checker. Run exactly 4 checks against the VP consolidation. ' +
  'Check 1 (Decision Preservation): every decision in every Group Review Summary must appear in the consolidation. ' +
  'Check 2 (Content Traceability): every section in the consolidation must be traceable to at least one IC output in a Group Review Summary. ' +
  'Check 3 (Conflict Resolution Documentation): every resolved conflict in any Group Review Summary must be documented in the consolidation. ' +
  'Check 4 (Requirement Coverage): every REQ-ID addressed in any Group Review Summary must appear in the consolidation. ' +
  'Output ONLY valid JSON: { passed: boolean, checks: { decisionPreservation: boolean, contentTraceability: boolean, conflictResolutionDoc: boolean, requirementCoverage: boolean }, failedChecks: string[], notes: string }';

// â”€â”€â”€ check (Doc 9C + 8E step 7) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Tier W automated call. Max 2 VP consolidation attempts before PM notified.
// Called from index.ts after VP consolidation, before IG.
export async function check(
  projectId: string,
  stage: number,
  consolidation: VpConsolidation,
  groupSummaries: GroupReviewSummary[],
  db: SupabaseClient
): Promise<FidelityResult> {
  const userContent = 'VP CONSOLIDATION:\n' + JSON.stringify(consolidation) +
    '\n\nGROUP REVIEW SUMMARIES:\n' + JSON.stringify(groupSummaries);

  const messages: Message[] = [
    { role: 'system', content: FIDELITY_SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ];

  const response = await callAIWithRetry('W', messages);
  await record(projectId, stage, 'FIDELITY_CHECK', 'W', response, db);

  const raw = (response.choices[0]?.message.content ?? '').trim();
  let result: FidelityResult;
  try {
    result = JSON.parse(raw);
  } catch (e) {
    throw new FidelityCheckError(stage, ['JSON_PARSE_FAILED: ' + raw.slice(0, 100)]);
  }

  // Persist fidelity result
  await db.from('fidelity_check_results').insert({
    project_id: projectId,
    stage,
    result_json: result,
    passed: result.passed,
    created_at: new Date().toISOString(),
  });

  console.log('[fidelity] Stage ' + stage + ' â€” passed: ' + result.passed + (result.passed ? '' : ' failed: ' + result.failedChecks.join(', ')));
  return result;
}