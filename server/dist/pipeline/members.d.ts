import { SupabaseClient } from '@supabase/supabase-js';
export type MemberTier = 'S' | 'M' | 'W';
export interface Member {
    id: string;
    title: string;
    stage: number;
    tier: MemberTier;
    groupId: string;
    isConditional: boolean;
    conditionDomain?: string;
}
export interface MemberWithPrompts extends Member {
    systemPrompt: string;
    outputTemplate: string;
}
export declare function loadMember(memberId: string, db: SupabaseClient): Promise<MemberWithPrompts>;
export declare function loadMembersForStage(stage: number, projectDomain: string | null, db: SupabaseClient): Promise<MemberWithPrompts[]>;
export declare function loadVpForStage(vpId: string, db: SupabaseClient): Promise<MemberWithPrompts>;
//# sourceMappingURL=members.d.ts.map