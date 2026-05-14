import { SupabaseClient } from '@supabase/supabase-js';
import { callAIWithRetry } from './payload.js';
import type { Message } from './payload.js';
import { record } from './cost.js';
import type { CosOutput } from './cos.js';
import type { IgQuestion } from './ig.js';

export interface PltOutput {
  stage: number;
  stageSummaryForFounder: string;
  whatHappenedThisStage: string;
  keyDecisionsPlain: string[];
  assumptionsPlain: string[];
  questionsForFounder: IgQuestion[];
  hasQuestions: boolean;
  openItemsForFounder: string[];
}

const PLT_SYSTEM_PROMPT = 'You are the Plain Language Translator (Tier S). ' +
  'Translate the stage output into plain, jargon-free English for a non-technical founder. ' +
  'Output ONLY valid JSON with no prose or markdown matching PltOutput schema. ' +
  'If there are no questions, set hasQuestions to false and questionsForFounder to empty array.';

function extractJson(raw: string): Record<string, unknown> | null {
  const clean = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  try { return JSON.parse(clean) as Record<string, unknown>; } catch { /* fall through */ }
  const matches = clean.match(/\{[\s\S]*\}/g);
  if (matches && matches.length > 0) {
    try { return JSON.parse(matches[matches.length - 1]!) as Record<string, unknown>; } catch { /* fall through */ }
  }
  return null;
}

export async function run(projectId: string, stage: number, cosOutput: CosOutput, igQuestionsForFounder: IgQuestion[], db: SupabaseClient): Promise<PltOutput> {
  const userContent = 'STAGE: ' + stage + '\n\nCHIEF OF STAFF SUMMARY:\n' + cosOutput.summaryForPlt + '\n\nIG QUESTIONS FOR FOUNDER (max 5):\n' + JSON.stringify(igQuestionsForFounder);
  const messages: Message[] = [{ role: 'system', content: PLT_SYSTEM_PROMPT }, { role: 'user', content: userContent }];
  const response = await callAIWithRetry('S', messages);
  await record(projectId, stage, 'PLT', 'S', response, db);
  const raw = (response.choices[0]?.message.content ?? '').trim();
  const parsed = extractJson(raw);
  let result: PltOutput;
  if (!parsed) {
    console.warn('[plt] JSON parse failed for stage ' + stage + ' — using fallback');
    result = { stage, stageSummaryForFounder: 'Stage ' + stage + ' completed.', whatHappenedThisStage: 'Your team completed stage ' + stage + '.', keyDecisionsPlain: [], assumptionsPlain: [], questionsForFounder: igQuestionsForFounder, hasQuestions: igQuestionsForFounder.length > 0, openItemsForFounder: [] };
  } else {
    result = parsed as unknown as PltOutput;
    if (!result.questionsForFounder) result.questionsForFounder = igQuestionsForFounder;
    if (typeof result.hasQuestions !== 'boolean') result.hasQuestions = result.questionsForFounder.length > 0;
  }
  await db.from('stage_runs').update({ plt_output_json: result, questions_json: result.questionsForFounder, has_questions: result.hasQuestions, updated_at: new Date().toISOString() }).eq('project_id', projectId).eq('stage', stage);
  console.log('[plt] Stage ' + stage + ' translated. Questions: ' + result.questionsForFounder.length);
  return result;
}