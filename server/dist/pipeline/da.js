import { SupabaseClient } from '@supabase/supabase-js';
import { callAIWithRetry } from './payload.js';
import { record } from './cost.js';
// DA only runs on Stages 2, 4, 8 (Doc 7A main loop step 9, Charter)
export const DA_STAGES = [2, 4, 8];
const DA_SYSTEM_PROMPT = 'You are the Technical Devil s Advocate (Tier S). ' +
    'Your job is to steelman the strongest objections to this stage output. ' +
    'Challenge assumptions, identify risks that have been understated, and flag proportionality issues forwarded from IG Check 0.6. ' +
    'You are not trying to block progress â€” you are trying to surface what could go wrong. ' +
    'Output ONLY valid JSON matching DaResult schema: ' +
    '{ stage, challengesRaised: string[], assumptionsChallenged: string[], recommendedAdjustments: string[], ' +
    'severityFlags: [{ item, severity }], overallVerdict: PROCEED or PROCEED_WITH_CAUTION or ESCALATE, notes: string }';
// run (Doc 7A step 9 â€” Tier S, Stages 2/4/8 only)
export async function run(projectId, stage, ig2Result, consolidation, db) {
    if (!DA_STAGES.includes(stage)) {
        throw new Error('DA called on non-DA stage: ' + stage + '. Only stages 2, 4, 8 run DA.');
    }
    const userContent = 'STAGE: ' + stage +
        '\n\nVP CONSOLIDATION:\n' + JSON.stringify(consolidation) +
        '\n\nIG CALL 2 AUDIT TRAIL (includes proportionality flags):\n' + ig2Result.auditTrail;
    const messages = [
        { role: 'system', content: DA_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
    ];
    const response = await callAIWithRetry('S', messages);
    await record(projectId, stage, 'DA', 'S', response, db);
    const raw = (response.choices[0]?.message.content ?? '').trim();
    let result;
    try {
        result = JSON.parse(raw);
    }
    catch (e) {
        throw new Error('[da] JSON parse failed: ' + raw.slice(0, 100));
    }
    await db.from('da_results').insert({
        project_id: projectId,
        stage,
        result_json: result,
        overall_verdict: result.overallVerdict,
        created_at: new Date().toISOString(),
    });
    console.log('[da] Stage ' + stage + ' verdict: ' + result.overallVerdict + ' challenges: ' + result.challengesRaised.length);
    return result;
}
//# sourceMappingURL=da.js.map