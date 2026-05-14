import { SupabaseClient } from '@supabase/supabase-js';
export declare class StuckMemberError extends Error {
    constructor(memberId: string, stage: number, iterations: number);
}
export declare function runStage(projectId: string, stage: number, db: SupabaseClient): Promise<void>;
//# sourceMappingURL=index.d.ts.map