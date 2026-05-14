import { SupabaseClient } from '@supabase/supabase-js';
import type { VpConsolidation } from './compression.js';
import type { GroupReviewSummary } from './vp.js';
export interface FidelityResult {
    passed: boolean;
    checks: {
        decisionPreservation: boolean;
        contentTraceability: boolean;
        conflictResolutionDoc: boolean;
        requirementCoverage: boolean;
    };
    failedChecks: string[];
    notes: string;
}
export declare class FidelityCheckError extends Error {
    constructor(stage: number, failed: string[]);
}
export declare function check(projectId: string, stage: number, consolidation: VpConsolidation, groupSummaries: GroupReviewSummary[], db: SupabaseClient): Promise<FidelityResult>;
//# sourceMappingURL=fidelity.d.ts.map