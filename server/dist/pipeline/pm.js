import { SupabaseClient } from '@supabase/supabase-js';
import { compressStage } from './compression.js';
// â”€â”€â”€ Errors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export class PmGateError extends Error {
    constructor(msg) { super('PM gate error: ' + msg); }
}
// â”€â”€â”€ Stage name map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STAGE_NAMES = {
    0: 'Phase 0 â€” Foundation',
    1: 'Stage 1 â€” Problem & User',
    2: 'Stage 2 â€” Solution & Differentiation',
    3: 'Stage 3 â€” Business Model',
    4: 'Stage 4 â€” Market & GTM',
    5: 'Stage 5 â€” Product Scope',
    6: 'Stage 6 â€” UX & Design',
    7: 'Stage 7 â€” Technical Architecture',
    8: 'Stage 8 â€” Risk & Feasibility',
    9: 'Stage 9 â€” Data & Privacy',
    10: 'Stage 10 â€” Roadmap & Sequencing',
    11: 'Stage 11 â€” Specification Synthesis',
    12: 'Stage 12 â€” Final Validation',
};
export function getStageName(stage) {
    return STAGE_NAMES[stage] ?? 'Stage ' + stage;
}
// â”€â”€â”€ issueProceed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Pre-stage gate. Validates prior stage is LOCKED (except stage 0/1).
// Sets stage_runs.pm_proceed_at timestamp.
export async function issueProceed(projectId, stage, db) {
    // Gate: prior stage must be LOCKED before this stage can PROCEED
    if (stage > 1) {
        const { data: prior } = await db
            .from('stage_runs')
            .select('status')
            .eq('project_id', projectId)
            .eq('stage', stage - 1)
            .single();
        if (!prior || prior.status !== 'LOCKED') {
            throw new PmGateError('Stage ' + (stage - 1) + ' must be LOCKED before stage ' + stage + ' can proceed. Current status: ' + prior?.status);
        }
    }
    const { error } = await db
        .from('stage_runs')
        .update({ pm_proceed_issued_at: new Date().toISOString(), status: 'PROCEEDING' })
        .eq('project_id', projectId)
        .eq('stage', stage);
    if (error)
        throw new PmGateError('Failed to set pm_proceed_at: ' + error.message);
    console.log('[pm] PROCEED issued â€” project ' + projectId + ' stage ' + stage);
}
// â”€â”€â”€ issueLocked â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Post-compression gate. Sets stage_runs.status = LOCKED and pm_locked_at.
// Only called after compressStage completes successfully.
export async function issueLocked(projectId, stage, db) {
    const { error } = await db
        .from('stage_runs')
        .update({ status: 'LOCKED', pm_locked_issued_at: new Date().toISOString() })
        .eq('project_id', projectId)
        .eq('stage', stage);
    if (error)
        throw new PmGateError('Failed to set LOCKED: ' + error.message);
    console.log('[pm] LOCKED issued â€” project ' + projectId + ' stage ' + stage);
}
// â”€â”€â”€ handleFounderAnswer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Called by POST /api/founder/answer after all founder questions are answered.
// Flow: store answer â†’ check if all questions answered â†’ compress â†’ LOCKED
export async function handleFounderAnswer(projectId, stage, questionId, answer, consolidation, db) {
    // 1. Store the answer
    const { error: insertError } = await db.from('founder_answers').upsert({
        project_id: projectId,
        stage,
        question_id: questionId,
        answer,
        answered_at: new Date().toISOString(),
    }, { onConflict: 'project_id,stage,question_id' });
    if (insertError)
        throw new PmGateError('Failed to store founder answer: ' + insertError.message);
    // 2. Check if all questions for this stage have been answered
    const { data: stageRun } = await db
        .from('stage_runs')
        .select('questions_json, status')
        .eq('project_id', projectId)
        .eq('stage', stage)
        .single();
    if (!stageRun)
        throw new PmGateError('Stage run not found for stage ' + stage);
    const questions = stageRun.questions_json ?? [];
    const { data: answers } = await db
        .from('founder_answers')
        .select('question_id')
        .eq('project_id', projectId)
        .eq('stage', stage);
    const answeredIds = new Set((answers ?? []).map((a) => a.question_id));
    const allAnswered = questions.every(q => answeredIds.has(q.id));
    if (!allAnswered) {
        console.log('[pm] Founder answered ' + answeredIds.size + '/' + questions.length + ' questions for stage ' + stage);
        return { locked: false };
    }
    // 3. All answered â€” run compression then LOCKED
    console.log('[pm] All questions answered for stage ' + stage + ' â€” running compression');
    await compressStage(projectId, stage, consolidation, db);
    await issueLocked(projectId, stage, db);
    return { locked: true };
}
//# sourceMappingURL=pm.js.map