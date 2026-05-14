import { SupabaseClient } from '@supabase/supabase-js';
export declare function getModel(tier: 'S' | 'M' | 'W'): string;
export declare function getMaxTokens(tier: 'S' | 'M' | 'W', override?: number): number;
export interface SpendRecord {
    projectId: string;
    stage: number;
    memberId: string;
    tier: 'S' | 'M' | 'W';
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}
export declare function record(projectId: string, stage: number, memberId: string, tier: 'S' | 'M' | 'W', openRouterResponse: {
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}, db: SupabaseClient): Promise<void>;
export declare function checkSoftLimits(projectId: string, db: SupabaseClient): Promise<void>;
//# sourceMappingURL=cost.d.ts.map