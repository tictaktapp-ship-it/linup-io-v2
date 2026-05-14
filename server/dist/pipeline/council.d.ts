export declare function handleConciergeMessage(input: {
    projectId: string;
    message: string;
    exchangeCount: number;
}): Promise<{
    reply: string;
    handoffToPis: boolean;
}>;
export declare function handlePisMessage(input: {
    projectId: string;
    projectName: string;
    message: string;
    history: Array<{
        role: string;
        content: string;
    }>;
}): Promise<{
    reply: string;
    ideaBrief: Record<string, unknown> | null;
    briefComplete: boolean;
}>;
export declare function confirmIdeaBrief(projectId: string, ideaBrief: Record<string, unknown>): Promise<void>;
export declare function getCouncilStatus(projectId: string): Promise<{
    phase: string;
    members: Record<string, unknown>;
    verdict: string | null;
    conditionalQuestions: string[] | null;
    qualityGate: Record<string, unknown> | null;
}>;
export declare function getPhase05Status(projectId: string): Promise<{
    phase: string;
    members: Record<string, unknown>;
    featureCharter: string | null;
}>;
export declare function confirmFeatureCharter(projectId: string): Promise<void>;
export declare function handleConditionalResubmit(projectId: string, answers: Array<{
    question: string;
    selectedOption: string;
    freeText: string;
}>): Promise<void>;
//# sourceMappingURL=council.d.ts.map