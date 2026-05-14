import { SupabaseClient } from '@supabase/supabase-js';
import type { CosOutput } from './cos.js';
import type { IgQuestion } from './ig.js';
export interface PltOutput {
    stage: number;
    stageSummaryForFounder: string;
    whatHappenedThisStage: string;
    keyDecisionsPlain: string[];
    assumptionsPlain: string[];
    questionsForFounder: IgQuestion[];
    hasQuestions: boolean;
    openItemsForFounder: string[];
}
export declare function run(projectId: string, stage: number, cosOutput: CosOutput, igQuestionsForFounder: IgQuestion[], db: SupabaseClient): Promise<PltOutput>;
//# sourceMappingURL=plt.d.ts.map