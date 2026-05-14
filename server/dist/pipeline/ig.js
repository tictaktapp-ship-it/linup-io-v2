import { SupabaseClient } from '@supabase/supabase-js';
import { callAIWithRetry } from './payload.js';
import { record } from './cost.js';
const STAGE_CONTRADICTION_CHECK = {
    1: [0], 2: [1], 3: [2], 4: [2, 3], 5: [2, 4], 6: [1, 4], 7: [3, 4], 8: [2, 6], 9: [4, 8], 10: [9], 11: [10], 12: [11],
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
// Extracts the last JSON object from an AI response.
// Handles cases where the model prepends prose before the JSON block.
function extractJson(raw) {
    // Try to find the last { ... } block in the response
    const match = raw.match(/\{[\s\S]*\}/g);
    if (match && match.length > 0) {
        const candidate = match[match.length - 1];
        try {
            return JSON.parse(candidate);
        }
        catch {
            // fall through to line-by-line
        }
    }
    // Fallback: try each line that starts with '{' from the end
    const lines = raw.split('\n').reverse();
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('{')) {
            try {
                return JSON.parse(trimmed);
            }
            catch {
                continue;
            }
        }
    }
    console.warn('[ig] Could not extract JSON from response — defaulting to no-hold');
    return {};
}
export async function runCall1(projectId, stage, consolidation, db) {
    const { data: stageRun } = await db.from('stage_runs').select('status, pm_proceed_at').eq('project_id', projectId).eq('stage', stage).single();
    const userContent = 'STAGE: ' + stage + '\nPM_PROCEED_AT: ' + (stageRun?.pm_proceed_at ?? 'NOT SET') + '\n\nVP CONSOLIDATION:\n' + JSON.stringify(consolidation);
    const messages = [{ role: 'system', content: IG_CALL1_SYSTEM_PROMPT }, { role: 'user', content: userContent }];
    const response = await callAIWithRetry('M', messages);
    await record(projectId, stage, 'IG-CALL-1', 'M', response, db);
    const raw = (response.choices[0]?.message.content ?? '').trim();
    const parsed = extractJson(raw);
    const result = { call: 1, hold: parsed['hold'] === true, holdReason: parsed['holdReason'] ?? undefined, auditTrail: raw };
    await db.from('ig_audit_trails').insert({ project_id: projectId, stage, call_number: 1, hold: result.hold, hold_reason: result.holdReason ?? null, audit_trail: result.auditTrail, created_at: new Date().toISOString() });
    console.log('[ig] Call 1 stage ' + stage + ' hold: ' + result.hold);
    return result;
}
export async function runCall2(projectId, stage, consolidation, call1Result, db) {
    const stagesToCheck = STAGE_CONTRADICTION_CHECK[stage] ?? [];
    const { data: priorAbstracts } = await db.from('stage_abstracts').select('stage, abstract_json').eq('project_id', projectId).in('stage', stagesToCheck);
    const userContent = 'STAGE: ' + stage +
        '\nSTAGES TO CHECK: ' + stagesToCheck.join(', ') +
        '\n\nVP CONSOLIDATION:\n' + JSON.stringify(consolidation) +
        '\n\nPRIOR ABSTRACTS:\n' + JSON.stringify((priorAbstracts ?? []).map((a) => a.abstract_json)) +
        '\n\nIG CALL 1 AUDIT TRAIL:\n' + call1Result.auditTrail;
    const messages = [{ role: 'system', content: IG_CALL2_SYSTEM_PROMPT }, { role: 'user', content: userContent }];
    const response = await callAIWithRetry('S', messages);
    await record(projectId, stage, 'IG-CALL-2', 'S', response, db);
    const raw = (response.choices[0]?.message.content ?? '').trim();
    const parsed = extractJson(raw);
    const result = { call: 2, hold: parsed['hold'] === true, holdReason: parsed['holdReason'] ?? undefined, auditTrail: raw, questionsForFounder: parsed['questionsForFounder'] ?? [] };
    await db.from('ig_audit_trails').insert({ project_id: projectId, stage, call_number: 2, hold: result.hold, hold_reason: result.holdReason ?? null, audit_trail: result.auditTrail, questions_json: result.questionsForFounder ?? null, created_at: new Date().toISOString() });
    console.log('[ig] Call 2 stage ' + stage + ' hold: ' + result.hold + ' questions: ' + (result.questionsForFounder?.length ?? 0));
    return result;
}
//# sourceMappingURL=ig.js.map