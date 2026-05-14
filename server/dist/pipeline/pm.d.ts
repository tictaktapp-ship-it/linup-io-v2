import { SupabaseClient } from '@supabase/supabase-js';
import type { VpConsolidation } from './compression.js';
export declare class PmGateError extends Error {
    constructor(msg: string);
}
export declare function getStageName(stage: number): string;
export declare function issueProceed(projectId: string, stage: number, db: SupabaseClient): Promise<void>;
export declare function issueLocked(projectId: string, stage: number, db: SupabaseClient): Promise<void>;
export declare function handleFounderAnswer(projectId: string, stage: number, questionId: string, answer: string, consolidation: VpConsolidation, db: SupabaseClient): Promise<{
    locked: boolean;
}>;
//# sourceMappingURL=pm.d.ts.map