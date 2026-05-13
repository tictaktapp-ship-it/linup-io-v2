import { SupabaseClient } from '@supabase/supabase-js';
import { callAIWithRetry } from './payload.js';
import type { Message } from './payload.js';
import { record } from './cost.js';

// â”€â”€â”€ Types (Doc 9C) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface IcGroup {
  id: string;          // e.g. '1G', '2A'
  members: string[];   // member IDs in this group
}

export interface VpAnalysisReport {
  stage: number;
  vpId: string;
  featureInventory: string[];
  icRoster: string[];
  dependencyGraph: Record<string, string[]>; // memberId -> depends on []
  conditionalSelections: string[];
  conflictPredictions: string[];
  executionSequence: IcGroup[];
}

export interface GroupReviewSummary {
  groupId: string;
  stage: number;
  status: 'ACCEPTED' | 'RETURNED_FOR_REVISION';
  revisionsCount: number;
  keyDecisions: string[];
  conflictsResolved: string[];
  assumptions: string[];
  reqIdsAddressed: string[];
  forNextGroup: string[];
}

export interface IcReviewResult {
  passed: boolean;
  notes: string;
  failureConditions: string[]; // which of the 8 VP failure conditions triggered
}

// â”€â”€â”€ 8 VP failure conditions (Doc 9C Section 7) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const VP_FAILURE_CONDITIONS = [
  'MISSING_SECTION',
  'PLACEHOLDER_CONTENT',
  'WONT_VIOLATION',
  'UNTRACED_CLAIM',
  'MISSING_REQUIREMENT_REFERENCE',
  'MISSING_SELF_VERIFICATION',
  'UNDISCLOSED_ASSUMPTION',
  'CONFLICT_WITH_PRIOR_GROUP',
] as const;

// â”€â”€â”€ VP Registry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Maps stage number to VP member ID (Tier M)
// VPs are EM-layer members â€” seeded in member_prompts with their stage
const VP_BY_STAGE: Record<number, string> = {
  0:  'L-0-001', // CPO â€” Phase 0
  1:  'L-1-001', // VP Stage 1
  2:  'L-1-002', // VP Stage 2
  3:  'L-1-003', // VP Stage 3
  4:  'L-1-004', // VP Stage 4
  5:  'L-1-001', // VP Stage 5 (re-used per member register)
  6:  'L-1-002',
  7:  'L-1-003',
  8:  'L-1-004',
  9:  'L-1-001',
  10: 'L-1-002',
  11: 'L-1-003',
  12: 'L-1-004',
};

export function getVpIdForStage(stage: number): string {
  const vpId = VP_BY_STAGE[stage];
  if (!vpId) throw new Error('No VP configured for stage: ' + stage);
  return vpId;
}

// â”€â”€â”€ VP Analysis (Phase 1+2+3 combined â€” Doc 9C) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Produces VpAnalysisReport with executionSequence for the stage runner.
export async function analyse(
  vpId: string,
  vpSystemPrompt: string,
  projectId: string,
  stage: number,
  db: SupabaseClient
): Promise<VpAnalysisReport> {
  // Stage 0: return hardcoded execution sequence (deterministic, no AI call needed)
  if (stage === 0) {
    const report: VpAnalysisReport = {
      stage: 0, vpId,
      featureInventory: ['Idea validation', 'Product intake', 'Council review'],
      icRoster: ['P0-0-001','P0-1-001','P0-2-001','P0-2-002','P0-2-003','P0-2-004','P0-2-005','P0-2-006','P0-2-007','P0-2-008','P0-2-009','P0-2-010','P0-2-011','P0-2-012','P0-2-013'],
      dependencyGraph: {}, conditionalSelections: [], conflictPredictions: [],
      executionSequence: [
        { id: 'P0-0', members: ['P0-0-001'] },
        { id: 'P0-1', members: ['P0-1-001'] },
        { id: 'P0-2', members: ['P0-2-001','P0-2-002','P0-2-003','P0-2-004','P0-2-005','P0-2-006','P0-2-007','P0-2-008','P0-2-009','P0-2-010','P0-2-011','P0-2-012','P0-2-013'] },
      ],
    };
    await db.from('vp_analysis_reports').insert({ project_id: projectId, stage, vp_id: vpId, report_json: report, created_at: new Date().toISOString() });
    console.log('[vp] Stage 0 hardcoded sequence — groups: ' + report.executionSequence.length);
    return report;
  }

  const { data: project } = await db.from('projects').select('identity_json').eq('id', projectId).single();
  const { data: abstracts } = await db.from('stage_abstracts').select('abstract_json').eq('project_id', projectId).lt('stage', stage).order('stage');

  const userContent = 'PROJECT: ' + JSON.stringify(project?.identity_json ?? {}) +
    '\n\nPRIOR STAGE ABSTRACTS: ' + JSON.stringify((abstracts ?? []).map((a: any) => a.abstract_json)) +
    '\n\nRun VP Analysis Phase 1 (feature inventory, IC roster, dependency mapping, conditional selection, conflict prediction) and Phase 2 (execution sequence). Output as JSON matching VpAnalysisReport schema.';

  const messages: Message[] = [
    { role: 'system', content: vpSystemPrompt },
    { role: 'user', content: userContent },
  ];

  const response = await callAIWithRetry('M', messages);
  await record(projectId, stage, vpId, 'M', response, db);

  const raw = (response.choices[0]?.message.content ?? '').trim();
  const rawClean = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  const report: VpAnalysisReport = JSON.parse(rawClean);

  // Persist VP Analysis Report
  await db.from('vp_analysis_reports').insert({
    project_id: projectId,
    stage,
    vp_id: vpId,
    report_json: report,
    created_at: new Date().toISOString(),
  });

  console.log('[vp] Analysis complete â€” stage ' + stage + ' groups: ' + report.executionSequence.length);
  return report;
}

// â”€â”€â”€ reviewIcOutput (Doc 9C â€” 8 VP failure conditions) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// VP reviews a single IC output. Binary pass/fail. No VP discretion.
export async function reviewIcOutput(
  vpId: string,
  vpSystemPrompt: string,
  memberId: string,
  icContent: string,
  groupReviewSummaries: GroupReviewSummary[],
  projectId: string,
  stage: number,
  db: SupabaseClient
): Promise<IcReviewResult> {
  // Stage 0: bypass VP IC review — always pass (pipeline flow validation)
  if (stage === 0) {
    console.log('[vp] Stage 0 IC review bypass — auto-pass for', memberId);
    return { passed: true, notes: 'Stage 0 auto-pass', failureConditions: [] };
  }
  const priorSummaries = groupReviewSummaries.map(s => JSON.stringify(s)).join('\n\n');

  const userContent = 'IC OUTPUT FROM ' + memberId + ':\n\n' + icContent +
    '\n\nPRIOR GROUP REVIEW SUMMARIES:\n' + (priorSummaries || 'None yet.') +
    '\n\nApply all 8 VP failure conditions. Output JSON: { passed: boolean, notes: string, failureConditions: string[] }';

  const messages: Message[] = [
    { role: 'system', content: vpSystemPrompt },
    { role: 'user', content: userContent },
  ];

  const response = await callAIWithRetry('M', messages);
  await record(projectId, stage, vpId, 'M', response, db);

  const raw = (response.choices[0]?.message.content ?? '').trim();
  const rawClean = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  return JSON.parse(rawClean) as IcReviewResult;
}

// â”€â”€â”€ reviewGroup (Doc 9C â€” Group Review Summary) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Produces Group Review Summary after all ICs in a group complete.
export async function reviewGroup(
  vpId: string,
  vpSystemPrompt: string,
  groupId: string,
  icContents: { memberId: string; content: string }[],
  projectId: string,
  stage: number,
  db: SupabaseClient
): Promise<GroupReviewSummary> {
  // Stage 0: bypass group review — return auto-accepted summary
  if (stage === 0) {
    console.log('[vp] Stage 0 group review bypass — auto-accept for group', groupId);
    return { groupId, stage, status: 'ACCEPTED', revisionsCount: 0, keyDecisions: [], conflictsResolved: [], assumptions: [], reqIdsAddressed: [], forNextGroup: [] };
  }
  const icBlock = icContents.map(ic => 'MEMBER ' + ic.memberId + ':\n' + ic.content).join('\n\n---\n\n');

  const userContent = 'GROUP ' + groupId + ' IC OUTPUTS:\n\n' + icBlock +
    '\n\nProduce Group Review Summary. Output JSON matching GroupReviewSummary schema exactly.';

  const messages: Message[] = [
    { role: 'system', content: vpSystemPrompt },
    { role: 'user', content: userContent },
  ];

  const response = await callAIWithRetry('M', messages);
  await record(projectId, stage, vpId, 'M', response, db);

  const summary: GroupReviewSummary = JSON.parse((response.choices[0]?.message.content ?? '').trim().replace(/^```(?:json)?\n?/i,'').replace(/\n?```$/i,'').trim());

  await db.from('group_review_summaries').insert({
    project_id: projectId,
    stage,
    group_id: groupId,
    summary_json: summary,
    created_at: new Date().toISOString(),
  });

  return summary;
}

// â”€â”€â”€ consolidate (Doc 7A + 9C) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// VP consolidates all group outputs into stage consolidation.
// Max 2 attempts before PM is notified (Doc 9C Fidelity Check).
export async function consolidate(
  vpId: string,
  vpSystemPrompt: string,
  projectId: string,
  stage: number,
  groupSummaries: GroupReviewSummary[],
  db: SupabaseClient
): Promise<import('./compression.js').VpConsolidation> {
  const summaryBlock = groupSummaries.map(s => JSON.stringify(s)).join('\n\n');

  const userContent = 'GROUP REVIEW SUMMARIES:\n\n' + summaryBlock +
    '\n\nProduce VP Consolidation. Output JSON matching VpConsolidation schema: ' +
    '{ stage, stageName, bindingConstraints: string[], keyDecisions: string[], allAssumptions: string[], founderDecisions: string[] }';

  const messages: Message[] = [
    { role: 'system', content: vpSystemPrompt },
    { role: 'user', content: userContent },
  ];

  const response = await callAIWithRetry('M', messages);
  await record(projectId, stage, vpId, 'M', response, db);

  const consolidation = JSON.parse((response.choices[0]?.message.content ?? '').trim().replace(/^```(?:json)?\n?/i,'').replace(/\n?```$/i,'').trim());

  await db.from('stage_consolidations').insert({
    project_id: projectId,
    stage,
    consolidation_json: consolidation,
    created_at: new Date().toISOString(),
  });

  console.log('[vp] Consolidation stored â€” stage ' + stage);
  return consolidation;
}