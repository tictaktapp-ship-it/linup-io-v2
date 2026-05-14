import { SupabaseClient } from '@supabase/supabase-js';
export declare class RateLimitExhaustedError extends Error {
    constructor(tier: string);
}
export declare class ApiError extends Error {
    constructor(status: number, tier: string);
}
export declare class PayloadSizeError extends Error {
    constructor(label: string, count: number);
}
export interface Message {
    role: string;
    content: string;
}
export interface OpenRouterResponse {
    choices: {
        message: {
            content: string;
        };
    }[];
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}
export declare function callAI(tier: 'S' | 'M' | 'W', messages: Message[], maxTokensOverride?: number): Promise<OpenRouterResponse>;
export declare function callAIWithRetry(tier: 'S' | 'M' | 'W', messages: Message[], maxTokensOverride?: number): Promise<OpenRouterResponse>;
interface PayloadParts {
    start: string;
    middle: string;
    end: string;
    finalReminder: string;
}
export declare class Payload {
    private parts;
    constructor(parts: PayloadParts);
    get tier1WordCount(): number;
    get totalWordCount(): number;
    toMessages(systemPrompt: string): Message[];
}
export declare function assemblePayload(memberId: string, systemPrompt: string, outputTemplate: string, projectId: string, stage: number, db: SupabaseClient): Promise<Payload>;
export declare function fetchContextPulls(memberId: string, projectId: string, stage: number, db: SupabaseClient): Promise<string[]>;
export {};
//# sourceMappingURL=payload.d.ts.map