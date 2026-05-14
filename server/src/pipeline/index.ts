import { SupabaseClient } from '@supabase/supabase-js';
import * as pm from './pm.js';
import * as vp from './vp.js';
import * as fidelity from './fidelity.js';
import * as acceptance from './acceptance.js';
import * as ig from './ig.js';
import * as da from './da.js';
import * as cos from './cos.js';
import * as plt from './plt.js';
import * as notifications from './notifications.js';
import * as rtm from './rtm.js';
import * as resilience from './resilience.js';
import * as schema from './schema.js';
import { callAIWithRetry, ApiError, RateLimitExhaustedError } from './payload.js';
import { checkSoftLimits } from './cost.js';
import { record } from './cost.js';
import { assemblePayload } from './payload.js';
import { loadMember, loadVpForStage, loadMembersForStage } from './members.js';
import { getVpIdForStage } from './vp.js';
import type { GroupReviewSummary } from './vp.js';
import type { IgResult } from './ig.js';

export class StuckMemberError extends Error {
  constructor(memberId: string, stage: number, iterations: number) {
    super('Member ' + memberId + ' stuck at stage ' + stage + ' after ' + iterations + ' iterations');
  }
}

// --- runIc (Doc 7A - IC execution with retry, max 3 iterations) ---
async function runIc(memberId: string, projectId: string, stage: number, groupSummaries: GroupReviewSummary[], db: SupabaseClient): Promise<{ memberId: string; content: string }> {
  const member = await loadMember(memberId, db);
  let iteration = 1;
  while (iteration <= 3) {
    await db.from('stage_runs').update({ current_member_id: memberId, updated_at: new Date().toISOString() }).eq('project_id', projectId).eq('stage', stage);
    const payload = await assemblePayload(memberId, member.systemPrompt, member.outputTemplate, projectId, stage, db);
    const response = await callAIWithRetry(member.tier, payload.toMessages(member.systemPrompt));
    await record(projectId, stage, memberId, member.tier, response, db);
    void checkSoftLimits(projectId, db); // non-blocking soft limit check (Doc 11 D11)
    const content = (response.choices[0]?.message.content ?? '');
    console.log('[runIc] member:', memberId, 'iter:', iteration, 'response content length:', content.length, 'choices:', response.choices?.length);
    const validation = await schema.validate(memberId, content);
    if (!validation.passed) {
      const { error: sfErr } = await db.from('ic_artifacts').insert({ project_id: projectId, stage, member_id: memberId, group_id: member.groupId, content, iteration_number: iteration, status: 'SCHEMA_FAIL', schema_errors: validation.errors, created_at: new Date().toISOString() });
      if (sfErr) console.error('[runIc] SCHEMA_FAIL insert error:', sfErr.message);
      console.log('[runIc] iter', iteration, 'content length:', content.length, 'errors:', validation.errors);
      iteration++; continue;
    }
    const vpId = getVpIdForStage(stage);
    const vpMember = await loadVpForStage(vpId, db);
    const review = await vp.reviewIcOutput(vpId, vpMember.systemPrompt, memberId, content, groupSummaries, projectId, stage, db);
    if (!review.passed) {
      await db.from('ic_artifacts').insert({ project_id: projectId, stage, member_id: memberId, group_id: member.groupId, content, iteration_number: iteration, status: 'VP_FAIL', vp_notes: review.notes, vp_failure_conditions: review.failureConditions, created_at: new Date().toISOString() });
      iteration++; continue;
    }
    await db.from('ic_artifacts').insert({ project_id: projectId, stage, member_id: memberId, group_id: member.groupId, content, iteration_number: iteration, status: 'ACCEPTED', created_at: new Date().toISOString() });
    return { memberId, content };
  }
  await db.from('ic_artifacts').insert({ project_id: projectId, stage, member_id: memberId, group_id: (await loadMember(memberId, db)).groupId, content: '', iteration_number: 3, status: 'STUCK', created_at: new Date().toISOString() });
  throw new StuckMemberError(memberId, stage, 3);
}

// --- runStage (Doc 7A - main loop) ---
export async function runStage(projectId: string, stage: number, db: SupabaseClient): Promise<void> {
  try {
    // 1. PM pre-stage gate
    await pm.issueProceed(projectId, stage, db);

    // 2. VP Analysis
    const vpId = getVpIdForStage(stage);
    const vpMember = await loadVpForStage(vpId, db);
    const vpAnalysis = await vp.analyse(vpId, vpMember.systemPrompt, projectId, stage, db);
    await db.from('stage_runs').update({ status: 'IC_RUNNING', updated_at: new Date().toISOString() }).eq('project_id', projectId).eq('stage', stage);

    // 3. Execute IC groups sequentially (Doc 7A - never brief all ICs simultaneously)
    if (!vpAnalysis.executionSequence || vpAnalysis.executionSequence.length === 0) {
      throw new Error('VP analysis returned empty executionSequence for stage ' + stage);
    }
    const allGroupSummaries: GroupReviewSummary[] = [];
    for (const group of vpAnalysis.executionSequence) {
      await db.from('stage_runs').update({ current_group: group.id, updated_at: new Date().toISOString() }).eq('project_id', projectId).eq('stage', stage);
      const icResults = await Promise.all(group.members.map((mid: string) => runIc(mid, projectId, stage, allGroupSummaries, db)));
      const groupSummary = await vp.reviewGroup(vpId, vpMember.systemPrompt, group.id, icResults, projectId, stage, db);
      await rtm.updateForGroup(projectId, groupSummary, db);
      allGroupSummaries.push(groupSummary);
    }

    // 4. VP Consolidation
    await db.from('stage_runs').update({ status: 'VP_REVIEWING', updated_at: new Date().toISOString() }).eq('project_id', projectId).eq('stage', stage);
    const consolidation = await vp.consolidate(vpId, vpMember.systemPrompt, projectId, stage, allGroupSummaries, db);

    // CHECKPOINT 1
    await db.from('stage_runs').update({ checkpoint_1_status: 'SHOWN', updated_at: new Date().toISOString() }).eq('project_id', projectId).eq('stage', stage);
    await notifications.sendCheckpoint1(projectId, consolidation, db);

    // 5. Fidelity Check
    await db.from('stage_runs').update({ status: 'FIDELITY_CHECK', updated_at: new Date().toISOString() }).eq('project_id', projectId).eq('stage', stage);
    const fidelityResult = await fidelity.check(projectId, stage, consolidation, allGroupSummaries, db);
    if (!fidelityResult.passed) console.warn('[fidelity] Non-blocking failures: ' + fidelityResult.failedChecks.join(', '));

    // 6. Acceptance Test
    await db.from('stage_runs').update({ status: 'SPEC_ACCEPTANCE_TESTING', updated_at: new Date().toISOString() }).eq('project_id', projectId).eq('stage', stage);
    try { await acceptance.test(projectId, stage, consolidation, db); } catch (e: any) { console.warn('[acceptance] Non-blocking failure: ' + e.message); }


    // 7. IG Call 1 - Mechanical
    await db.from('stage_runs').update({ status: 'IG_CALL_1', updated_at: new Date().toISOString() }).eq('project_id', projectId).eq('stage', stage);
    const ig1Result = await ig.runCall1(projectId, stage, consolidation, db);
    if (ig1Result.hold) {
      await resilience.handleHold(projectId, stage, ig1Result, db);
      await notifications.sendHoldNotification(projectId, stage, ig1Result, db);
      console.log('[ig] Hold on call 1 — skipping call 2, continuing to CoS/PLT');
      const cosOutputH = await cos.run(projectId, stage, consolidation, ig1Result.auditTrail ?? '', db);
      const pltOutputH = await plt.run(projectId, stage, cosOutputH, ig1Result.questionsForFounder ?? [], db);
      await db.from('stage_runs').update({ status: 'AWAITING_FOUNDER', updated_at: new Date().toISOString() }).eq('project_id', projectId).eq('stage', stage);
      if (pltOutputH.hasQuestions) { await notifications.sendQuestionsReady(projectId, pltOutputH, db); }
      else { const { compressStage } = await import('./compression.js'); await compressStage(projectId, stage, consolidation, db); await pm.issueLocked(projectId, stage, db); await notifications.sendStageCompleteNoQuestions(projectId, stage, db); }
      return;
    }

    // 8. IG Call 2 - Reasoning
    await db.from('stage_runs').update({ status: 'IG_CALL_2', updated_at: new Date().toISOString() }).eq('project_id', projectId).eq('stage', stage);
    const ig2Result = await ig.runCall2(projectId, stage, consolidation, ig1Result, db);
    // CHECKPOINT 2
    await db.from('stage_runs').update({ checkpoint_2_status: 'SHOWN', updated_at: new Date().toISOString() }).eq('project_id', projectId).eq('stage', stage);

    // 9. Devil's Advocate (Stages 2, 4, 8 only)
    if (da.DA_STAGES.includes(stage)) {
      await db.from('stage_runs').update({ status: 'DA_REVIEWING', updated_at: new Date().toISOString() }).eq('project_id', projectId).eq('stage', stage);
      await da.run(projectId, stage, ig2Result, consolidation, db);
    }

    // 10. Chief of Staff
    await db.from('stage_runs').update({ status: 'COS_REVIEWING', updated_at: new Date().toISOString() }).eq('project_id', projectId).eq('stage', stage);
    const cosOutput = await cos.run(projectId, stage, consolidation, ig2Result.auditTrail, db);

    // 11. Plain Language Translator
    await db.from('stage_runs').update({ status: 'PLT_TRANSLATING', updated_at: new Date().toISOString() }).eq('project_id', projectId).eq('stage', stage);
    const pltOutput = await plt.run(projectId, stage, cosOutput, ig2Result.questionsForFounder ?? [], db);

    // 12. Await founder input (pipeline pauses here)
    await db.from('stage_runs').update({ status: 'AWAITING_FOUNDER', updated_at: new Date().toISOString() }).eq('project_id', projectId).eq('stage', stage);
    if (pltOutput.hasQuestions) {
      await notifications.sendQuestionsReady(projectId, pltOutput, db);
    } else {
      const { compressStage } = await import('./compression.js');
      await compressStage(projectId, stage, consolidation, db);
      await pm.issueLocked(projectId, stage, db);
      await notifications.sendStageCompleteNoQuestions(projectId, stage, db);
    }
    // Resumes via POST /api/founder/answer -> pm.handleFounderAnswer when all rounds complete

  } catch (err: any) {
    // Provider outage: 503 from OpenRouter -> PROVIDER_OUTAGE status (Doc 8D checklist)
    if (err instanceof ApiError && err.message.includes('503')) {
      await db.from('stage_runs').update({ status: 'PAUSED', pause_reason: 'PROVIDER_OUTAGE', updated_at: new Date().toISOString() }).eq('project_id', projectId).eq('stage', stage);
      await notifications.sendProviderOutage(projectId, stage, db);
      console.log('[pipeline] PROVIDER_OUTAGE - project ' + projectId + ' stage ' + stage);
      return;
    }
    // Rate limit exhausted -> RATE_LIMITED status
    if (err instanceof RateLimitExhaustedError) {
      await db.from('stage_runs').update({ status: 'RATE_LIMITED', updated_at: new Date().toISOString() }).eq('project_id', projectId).eq('stage', stage);
      console.log('[pipeline] RATE_LIMITED - project ' + projectId + ' stage ' + stage);
      return;
    }
    // All other errors re-throw to worker for API_ERROR handling
    throw err;
  }
}
