import { SupabaseClient } from '@supabase/supabase-js';
import type { VpConsolidation } from './compression.js';
import type { IgResult } from './ig.js';
export declare const DA_STAGES: number[];
export interface DaResult {
    stage: number;
    challengesRaised: string[];
    assumptionsChallenged: string[];
    recommendedAdjustments: string[];
    severityFlags: {
        item: string;
        severity: 'HIGH' | 'MEDIUM' | 'LOW';
    }[];
    overallVerdict: 'PROCEED' | 'PROCEED_WITH_CAUTION' | 'ESCALATE';
    notes: string;
}
export declare function run(projectId: string, stage: number, ig2Result: IgResult, consolidation: VpConsolidation, db: SupabaseClient): Promise<DaResult>;
//# sourceMappingURL=da.d.ts.map