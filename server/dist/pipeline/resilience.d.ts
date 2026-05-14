import { SupabaseClient } from '@supabase/supabase-js';
import type { IgResult } from './ig.js';
export declare const DEADLOCK_THRESHOLD = 3;
export interface HoldRecord {
    projectId: string;
    stage: number;
    holdCount: number;
    deadlocked: boolean;
}
export type CrpTier = 'A' | 'B' | 'C';
export interface CrpRecord {
    projectId: string;
    stage: number;
    tier: CrpTier;
    description: string;
    resolution: string;
    resolvedAt: string;
}
export declare function incrementHoldCount(projectId: string, stage: number, db: SupabaseClient): Promise<number>;
export declare function handleHold(projectId: string, stage: number, igResult: IgResult, db: SupabaseClient): Promise<HoldRecord>;
export declare function recordCrp(record: CrpRecord, db: SupabaseClient): Promise<void>;
export declare function checkWlap(projectId: string, stage: number, db: SupabaseClient): Promise<{
    safeToRerun: boolean;
    completedIcs: string[];
}>;
//# sourceMappingURL=resilience.d.ts.map