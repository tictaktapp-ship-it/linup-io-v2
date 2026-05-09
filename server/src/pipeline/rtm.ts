import { SupabaseClient } from '@supabase/supabase-js';
import type { GroupReviewSummary } from './vp.js';

// â”€â”€â”€ RTM (Requirements Traceability Matrix) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TypeScript DB ops only â€” no LLM call (Doc 8E step 14, Doc 7A)

export interface RtmEntry {
  reqId: string;           // e.g. REQ-001
  stage: number;
  groupId: string;
  memberId: string;
  status: 'ADDRESSED' | 'PARTIAL' | 'OPEN';
  notes: string;
}

// â”€â”€â”€ updateForGroup (Doc 7A) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Called after each group review summary. Upserts REQ-IDs from the summary into the RTM.
export async function updateForGroup(
  projectId: string,
  groupSummary: GroupReviewSummary,
  db: SupabaseClient
): Promise<void> {
  if (!groupSummary.reqIdsAddressed || groupSummary.reqIdsAddressed.length === 0) {
    console.log('[rtm] No REQ-IDs in group ' + groupSummary.groupId + ' â€” skipping RTM update');
    return;
  }

  const entries = groupSummary.reqIdsAddressed.map((reqId: string) => ({
    project_id: projectId,
    req_id: reqId,
    stage: groupSummary.stage,
    group_id: groupSummary.groupId,
    status: 'ADDRESSED',
    notes: 'Addressed in Group ' + groupSummary.groupId + ' review',
    updated_at: new Date().toISOString(),
  }));

  const { error } = await db.from('rtm_entries').upsert(entries, { onConflict: 'project_id,req_id,stage' });
  if (error) {
    console.error('[rtm] Failed to upsert entries for group ' + groupSummary.groupId + ': ' + error.message);
  } else {
    console.log('[rtm] Updated ' + entries.length + ' REQ-IDs for group ' + groupSummary.groupId + ' stage ' + groupSummary.stage);
  }
}

// â”€â”€â”€ getOpenRequirements â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Returns all REQ-IDs for a project that are still OPEN (not yet addressed).
export async function getOpenRequirements(projectId: string, db: SupabaseClient): Promise<string[]> {
  const { data } = await db.from('rtm_entries').select('req_id').eq('project_id', projectId).eq('status', 'OPEN');
  return (data ?? []).map((r: any) => r.req_id);
}

// â”€â”€â”€ markRequirementPartial â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Used when Acceptance Tester returns PARTIALLY_SATISFIED for a requirement.
export async function markRequirementPartial(projectId: string, reqId: string, stage: number, notes: string, db: SupabaseClient): Promise<void> {
  await db.from('rtm_entries').upsert({
    project_id: projectId,
    req_id: reqId,
    stage,
    status: 'PARTIAL',
    notes,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'project_id,req_id,stage' });
  console.log('[rtm] Marked PARTIAL: ' + reqId + ' stage ' + stage);
}