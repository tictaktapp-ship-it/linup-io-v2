import { SupabaseClient } from '@supabase/supabase-js';
import type { PltOutput } from './plt.js';
import type { IgResult } from './ig.js';
import type { VpConsolidation } from './compression.js';
export declare function sendQuestionsReady(projectId: string, pltOutput: PltOutput, db: SupabaseClient): Promise<void>;
export declare function sendStageCompleteNoQuestions(projectId: string, stage: number, db: SupabaseClient): Promise<void>;
export declare function sendCheckpoint1(projectId: string, consolidation: VpConsolidation, db: SupabaseClient): Promise<void>;
export declare function sendDeadlockNotification(projectId: string, stage: number, igResult: IgResult, db: SupabaseClient): Promise<void>;
export declare function sendProviderOutage(projectId: string, stage: number, db: SupabaseClient): Promise<void>;
export declare function sendErrorRecovered(projectId: string, stage: number, db: SupabaseClient): Promise<void>;
export declare function sendHoldNotification(projectId: string, stage: number, igResult: IgResult, db: SupabaseClient): Promise<void>;
//# sourceMappingURL=notifications.d.ts.map