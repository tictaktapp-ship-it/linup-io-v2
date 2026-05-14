import { SupabaseClient } from '@supabase/supabase-js';
export interface IcGroup {
    id: string;
    members: string[];
}
export interface VpAnalysisReport {
    stage: number;
    vpId: string;
    featureInventory: string[];
    icRoster: string[];
    dependencyGraph: Record<string, string[]>;
    conditionalSelections: string[];
    conflictPredictions: string[];
    executionSequence: IcGroup[];
}
export interface GroupReviewSummary {
    groupId: string;
    stage: number;
    status: 'ACCEPTED' | 'RETURNED_FOR_REVISION';
    revisionsCount: number;
    keyDecisions: string[];
    conflictsResolved: string[];
    assumptions: string[];
    reqIdsAddressed: string[];
    forNextGroup: string[];
}
export interface IcReviewResult {
    passed: boolean;
    notes: string;
    failureConditions: string[];
}
export declare function getVpIdForStage(stage: number): string;
export declare function analyse(vpId: string, vpSystemPrompt: string, projectId: string, stage: number, db: SupabaseClient): Promise<VpAnalysisReport>;
export declare function reviewIcOutput(vpId: string, vpSystemPrompt: string, memberId: string, icContent: string, groupReviewSummaries: GroupReviewSummary[], projectId: string, stage: number, db: SupabaseClient): Promise<IcReviewResult>;
export declare function reviewGroup(vpId: string, vpSystemPrompt: string, groupId: string, icContents: {
    memberId: string;
    content: string;
}[], projectId: string, stage: number, db: SupabaseClient): Promise<GroupReviewSummary>;
export declare function consolidate(vpId: string, vpSystemPrompt: string, projectId: string, stage: number, groupSummaries: GroupReviewSummary[], db: SupabaseClient): Promise<import('./compression.js').VpConsolidation>;
//# sourceMappingURL=vp.d.ts.map