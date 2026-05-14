import { SupabaseClient } from '@supabase/supabase-js';
import type { VpConsolidation } from './compression.js';
export interface CosOutput {
    stage: number;
    check1_scopeIntegrity: {
        passed: boolean;
        notes: string;
    };
    check2_decisionConsistency: {
        passed: boolean;
        notes: string;
    };
    check3_assumptionLog: {
        passed: boolean;
        notes: string;
    };
    check4_openItems: {
        passed: boolean;
        notes: string;
        openItems: string[];
    };
    check5_founderReadiness: {
        passed: boolean;
        notes: string;
    };
    check6_handoverPackage: {
        passed: boolean;
        notes: string;
    };
    overallReady: boolean;
    summaryForPlt: string;
}
export declare function run(projectId: string, stage: number, consolidation: VpConsolidation, igAuditTrail: string, db: SupabaseClient): Promise<CosOutput>;
//# sourceMappingURL=cos.d.ts.map