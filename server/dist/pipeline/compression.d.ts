import { SupabaseClient } from '@supabase/supabase-js';
export declare class CompressionValidationError extends Error {
    constructor(missing: string[]);
}
export declare class CompressionSizeError extends Error {
    constructor(count: number);
}
export declare class CompressionError extends Error {
    constructor(stage: number, reason: string);
}
export interface StageAbstract {
    stage: number;
    stageName: string;
    bindingConstraints: string[];
    keyDecisions: string[];
    assumptions: string[];
    founderDecisions: string[];
    wordCount: number;
}
export interface VpConsolidation {
    stage: number;
    stageName: string;
    bindingConstraints: string[];
    keyDecisions: string[];
    allAssumptions: string[];
    founderDecisions: string[];
}
export declare function compressStage(projectId: string, stage: number, consolidation: VpConsolidation, db: SupabaseClient): Promise<void>;
//# sourceMappingURL=compression.d.ts.map