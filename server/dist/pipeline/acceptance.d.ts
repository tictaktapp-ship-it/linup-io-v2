import { SupabaseClient } from '@supabase/supabase-js';
import type { VpConsolidation } from './compression.js';
export type AcceptanceStatus = 'SATISFIED' | 'PARTIALLY_SATISFIED' | 'NOT_SATISFIED';
export interface AcceptanceCriterionResult {
    criterion: string;
    status: AcceptanceStatus;
    notes: string;
}
export interface AcceptanceResult {
    passed: boolean;
    blockedBy: string[];
    assumptions: string[];
    criteria: AcceptanceCriterionResult[];
}
export declare class AcceptanceBlockedError extends Error {
    constructor(stage: number, blockedBy: string[]);
}
export declare function test(projectId: string, stage: number, consolidation: VpConsolidation, db: SupabaseClient): Promise<AcceptanceResult>;
//# sourceMappingURL=acceptance.d.ts.map