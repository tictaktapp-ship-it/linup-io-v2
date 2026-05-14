import { SupabaseClient } from '@supabase/supabase-js';
import { callAIWithRetry } from './payload.js';
import { record } from './cost.js';
const PLT_SYSTEM_PROMPT = 'You are the Plain Language Translator (Tier S). ' +
    'You are the last member to run before the founder sees this stage. Your job is to translate everything into plain, jargon-free English. ' +
    'The founder is a builder, not an engineer. Write as if explaining to a smart non-technical person. ' +
    'Produce: a stage summary, what happened this stage, key decisions in plain language, assumptions in plain language, ' +
    'and batch the IG questions (already filtered to max 5) into the questionsForFounder array in A/B/C/D format. ' +
    'If there are no questions, set hasQuestions to false and questionsForFounder to empty array. ' +
    'Output ONLY valid JSON matching PltOutput schema.';
// run (Doc 7A step 11 â€” Tier S, always final before founder)
export async function run(projectId, stage, cosOutput, igQuestionsForFounder, db) {
    const userContent = 'STAGE: ' + stage +
        '\n\nCHIEF OF STAFF SUMMARY:\n' + cosOutput.summaryForPlt +
        '\n\nKEY DECISIONS (technical):\n' + JSON.stringify(cosOutput.check2_decisionConsistency) +
        '\n\nASSUMPTIONS:\n' + JSON.stringify(cosOutput.check3_assumptionLog) +
        '\n\nOPEN ITEMS:\n' + JSON.stringify(cosOutput.check4_openItems.openItems) +
        '\n\nIG QUESTIONS FOR FOUNDER (max 5, already filtered):\n' + JSON.stringify(igQuestionsForFounder);
    const messages = [
        { role: 'system', content: PLT_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
    ];
    const response = await callAIWithRetry('S', messages);
    await record(projectId, stage, 'PLT', 'S', response, db);
    const raw = (response.choices[0]?.message.content ?? '').trim();
    let result;
    try {
        result = JSON.parse(raw);
    }
    catch (e) {
        throw new Error('[plt] JSON parse failed: ' + raw.slice(0, 100));
    }
    // Store PLT output and questions on the stage_run
    await db.from('stage_runs').update({
        plt_output_json: result,
        questions_json: result.questionsForFounder,
        has_questions: result.hasQuestions,
        updated_at: new Date().toISOString(),
    }).eq('project_id', projectId).eq('stage', stage);
    console.log('[plt] Stage ' + stage + ' translated. Questions: ' + result.questionsForFounder.length);
    return result;
}
//# sourceMappingURL=plt.js.map