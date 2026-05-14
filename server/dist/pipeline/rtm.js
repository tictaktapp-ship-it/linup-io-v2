import { SupabaseClient } from '@supabase/supabase-js';
// â”€â”€â”€ updateForGroup (Doc 7A) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Called after each group review summary. Upserts REQ-IDs from the summary into the RTM.
export async function updateForGroup(projectId, groupSummary, db) {
    if (!groupSummary.reqIdsAddressed || groupSummary.reqIdsAddressed.length === 0) {
        console.log('[rtm] No REQ-IDs in group ' + groupSummary.groupId + ' â€” skipping RTM update');
        return;
    }
    const entries = groupSummary.reqIdsAddressed.map((reqId) => ({
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
    }
    else {
        console.log('[rtm] Updated ' + entries.length + ' REQ-IDs for group ' + groupSummary.groupId + ' stage ' + groupSummary.stage);
    }
}
// â”€â”€â”€ getOpenRequirements â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Returns all REQ-IDs for a project that are still OPEN (not yet addressed).
export async function getOpenRequirements(projectId, db) {
    const { data } = await db.from('rtm_entries').select('req_id').eq('project_id', projectId).eq('status', 'OPEN');
    return (data ?? []).map((r) => r.req_id);
}
// â”€â”€â”€ markRequirementPartial â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Used when Acceptance Tester returns PARTIALLY_SATISFIED for a requirement.
export async function markRequirementPartial(projectId, reqId, stage, notes, db) {
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
//# sourceMappingURL=rtm.js.map