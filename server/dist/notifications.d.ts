export type NotificationEvent = 'questions_ready' | 'stage_complete' | 'checkpoint_1' | 'deadlock' | 'provider_outage' | 'error_recovered';
interface NotifyPayload {
    event: NotificationEvent;
    userId: string;
    projectId: string;
    projectName?: string;
    stageName?: string;
    extra?: Record<string, string>;
}
export declare function notify(p: NotifyPayload): Promise<void>;
export {};
//# sourceMappingURL=notifications.d.ts.map