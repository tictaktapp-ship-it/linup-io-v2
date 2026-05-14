import { SupabaseClient } from '@supabase/supabase-js';
import type { GroupReviewSummary } from './vp.js';
export interface RtmEntry {
    reqId: string;
    stage: number;
    groupId: string;
    memberId: string;
    status: 'ADDRESSED' | 'PARTIAL' | 'OPEN';
    notes: string;
}
export declare function updateForGroup(projectId: string, groupSummary: GroupReviewSummary, db: SupabaseClient): Promise<void>;
export declare function getOpenRequirements(projectId: string, db: SupabaseClient): Promise<string[]>;
export declare function markRequirementPartial(projectId: string, reqId: string, stage: number, notes: string, db: SupabaseClient): Promise<void>;
//# sourceMappingURL=rtm.d.ts.map