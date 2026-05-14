import { SupabaseClient } from '@supabase/supabase-js';
import type { VpConsolidation } from './compression.js';
export interface IgResult {
    call: 1 | 2;
    hold: boolean;
    holdReason?: string;
    auditTrail: string;
    questionsForFounder?: IgQuestion[];
}
export interface IgQuestion {
    id: string;
    text: string;
    options: {
        label: 'A' | 'B' | 'C' | 'D';
        text: string;
    }[];
    optionDDetail?: string;
}
export declare function runCall1(projectId: string, stage: number, consolidation: VpConsolidation, db: SupabaseClient): Promise<IgResult>;
export declare function runCall2(projectId: string, stage: number, consolidation: VpConsolidation, call1Result: IgResult, db: SupabaseClient): Promise<IgResult>;
//# sourceMappingURL=ig.d.ts.map