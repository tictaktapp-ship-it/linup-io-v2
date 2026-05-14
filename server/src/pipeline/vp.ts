import { SupabaseClient } from '@supabase/supabase-js';
import { callAIWithRetry } from './payload.js';
import type { Message } from './payload.js';
import { record } from './cost.js';

// --- Types (Doc 9C) ---
export interface IcGroup {
  id: string;
  members: string[];
}

export interface VpAnalysisReport {
  stage: number;
  vpId: string;
  featureInventory: string[];
  icRoster: string[];
  dependencyGraph: Record<string, string[]>;
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
  failureConditions: string[];
}

// --- 8 VP failure conditions (Doc 9C Section 7) ---
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

// --- VP Registry ---
const VP_BY_STAGE: Record<number, string> = {
  0:  'L-0-001',
  1:  'L-1-001',
  2:  'L-1-002',
  3:  'L-1-003',
  4:  'L-1-004',
  5:  'L-1-001',
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

// --- Robust JSON extractor ---
// Handles AI responses that prepend prose before the JSON block.
function extractJson(raw: string): Record<string, unknown> {
  // Strip markdown fences first
  const clean = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  // Try direct parse
  try { return JSON.parse(clean) as Record<string, unknown>; } catch { /* fall through */ }
  // Try last { ... } block in the full response
  const matches = clean.match(/\{[\s\S]*\}/g);
  if (matches && matches.length > 0) {
    const candidate = matches[matches.length - 1]!;
    try { return JSON.parse(candidate) as Record<string, unknown>; } catch { /* fall through */ }
  }
  // Fallback: try each line starting with '{' from the end
  const lines = clean.split('\n').reverse();
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('{')) {
      try { return JSON.parse(trimmed) as Record<string, unknown>; } catch { continue; }
    }
  }
  console.warn('[vp] Could not extract JSON — raw response:', raw.substring(0, 200));
  return {};
}

// --- VP Analysis (Phase 1+2+3 combined - Doc 9C) ---
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
    '\n\nRun VP Analysis Phase 1 (feature inventory, IC roster, dependency mapping, conditional selection, conflict prediction) and Phase 2 (execution sequence). Output as JSON matching VpAnalysisReport schema. Respond with JSON only — no prose, no markdown fences.';

  const messages: Message[] = [
    { role: 'system', content: vpSystemPrompt },
    { role: 'user', content: userContent },
  ];

  const response = await callAIWithRetry('M', messages);
  await record(projectId, stage, vpId, 'M', response, db);

  const raw = (response.choices[0]?.message.content ?? '').trim();
  const report = extractJson(raw) as unknown as VpAnalysisReport;

  if (!report.executionSequence || report.executionSequence.length === 0) {
    // Fallback: build execution sequence from DB members for this stage
    console.warn('[vp] executionSequence empty — building fallback from member_prompts for stage ' + stage);
    const { data: stageMembers } = await db.from('member_prompts').select('member_id').eq('stage', stage).eq('model_tier', 'W');
    const memberIds = (stageMembers ?? []).map((m: any) => m.member_id as string).filter((id: string) => !id.startsWith('P05-') && !id.startsWith('L-'));
    if (memberIds.length === 0) throw new Error('VP analysis returned empty executionSequence and no IC members found in DB for stage ' + stage);
    report.executionSequence = [{ id: stage + 'A', members: memberIds }];
  }

  await db.from('vp_analysis_reports').insert({
    project_id: projectId, stage, vp_id: vpId, report_json: report, created_at: new Date().toISOString(),
  });

  console.log('[vp] Analysis complete — stage ' + stage + ' groups: ' + report.executionSequence.length);
  return report;
}

// --- reviewIcOutput (Doc 9C - 8 VP failure conditions) ---
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
  // Stage 0: bypass VP IC review — council pipeline handles Stage 0
  if (stage === 0) {
    console.log('[vp] Stage 0 IC review bypass — auto-pass for', memberId);
    return { passed: true, notes: 'Stage 0 auto-pass', failureConditions: [] };
  }
  const priorSummaries = groupReviewSummaries.map(s => JSON.stringify(s)).join('\n\n');

  const userContent = 'IC OUTPUT FROM ' + memberId + ':\n\n' + icContent +
    '\n\nPRIOR GROUP REVIEW SUMMARIES:\n' + (priorSummaries || 'None yet.') +
    '\n\nApply all 8 VP failure conditions. Output JSON only — no prose, no markdown: { passed: boolean, notes: string, failureConditions: string[] }';

  const messages: Message[] = [
    { role: 'system', content: vpSystemPrompt },
    { role: 'user', content: userContent },
  ];

  const response = await callAIWithRetry('M', messages);
  await record(projectId, stage, vpId, 'M', response, db);

  const raw = (response.choices[0]?.message.content ?? '').trim();
  return extractJson(raw) as unknown as IcReviewResult;
}

// --- reviewGroup (Doc 9C - Group Review Summary) ---
export async function reviewGroup(
  vpId: string,
  vpSystemPrompt: string,
  groupId: string,
  icContents: { memberId: string; content: string }[],
  projectId: string,
  stage: number,
  db: SupabaseClient
): Promise<GroupReviewSummary> {
  // Stage 0: bypass group review — council pipeline handles Stage 0
  if (stage === 0) {
    console.log('[vp] Stage 0 group review bypass — auto-accept for group', groupId);
    return { groupId, stage, status: 'ACCEPTED', revisionsCount: 0, keyDecisions: [], conflictsResolved: [], assumptions: [], reqIdsAddressed: [], forNextGroup: [] };
  }
  const icBlock = icContents.map(ic => 'MEMBER ' + ic.memberId + ':\n' + ic.content).join('\n\n---\n\n');

  const userContent = 'GROUP ' + groupId + ' IC OUTPUTS:\n\n' + icBlock +
    '\n\nProduce Group Review Summary. Output JSON only — no prose, no markdown — matching GroupReviewSummary schema exactly.';

  const messages: Message[] = [
    { role: 'system', content: vpSystemPrompt },
    { role: 'user', content: userContent },
  ];

  const response = await callAIWithRetry('M', messages);
  await record(projectId, stage, vpId, 'M', response, db);

  const raw = (response.choices[0]?.message.content ?? '').trim();
  const summary = extractJson(raw) as unknown as GroupReviewSummary;

  await db.from('group_review_summaries').insert({
    project_id: projectId, stage, group_id: groupId, summary_json: summary, created_at: new Date().toISOString(),
  });

  return summary;
}

// --- consolidate (Doc 7A + 9C) ---
export async function consolidate(
  vpId: string,
  vpSystemPrompt: string,
  projectId: string,
  stage: number,
  groupSummaries: GroupReviewSummary[],
  db: SupabaseClient
): Promise<import('./compression.js').VpConsolidation> {
  // Stage 0: bypass VP consolidation — council pipeline handles Stage 0
  if (stage === 0) {
    const consolidation = { stage: 0, stageName: 'Phase 0 — Foundation', bindingConstraints: [], keyDecisions: ['Idea validated and ready for Council review'], allAssumptions: ['Project has sufficient information to proceed'], founderDecisions: [] };
    await db.from('stage_consolidations').insert({ project_id: projectId, stage, consolidation_json: consolidation, created_at: new Date().toISOString() });
    console.log('[vp] Stage 0 consolidation bypass — stored hardcoded');
    return consolidation as any;
  }

  const summaryBlock = groupSummaries.map(s => JSON.stringify(s)).join('\n\n');

  const userContent = 'GROUP REVIEW SUMMARIES:\n\n' + summaryBlock +
    '\n\nProduce VP Consolidation. Output JSON only — no prose, no markdown — matching VpConsolidation schema: ' +
    '{ stage, stageName, bindingConstraints: string[], keyDecisions: string[], allAssumptions: string[], founderDecisions: string[] }';

  const messages: Message[] = [
    { role: 'system', content: vpSystemPrompt },
    { role: 'user', content: userContent },
  ];

  const response = await callAIWithRetry('M', messages);
  await record(projectId, stage, vpId, 'M', response, db);

  const raw = (response.choices[0]?.message.content ?? '').trim();
  const consolidation = extractJson(raw);

  await db.from('stage_consolidations').insert({
    project_id: projectId, stage, consolidation_json: consolidation, created_at: new Date().toISOString(),
  });

  console.log('[vp] Consolidation stored — stage ' + stage);
  return consolidation as any;
}
