import { SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
// Tier model resolution — configured via env vars, swappable without code changes
// Charter: TIER_S_MODEL = anthropic/claude-opus-4
// Charter: TIER_M_MODEL = anthropic/claude-sonnet-4
// Charter: TIER_W_MODEL = anthropic/claude-haiku-4-5
export function getModel(tier) {
    const model = {
        S: process.env.TIER_S_MODEL,
        M: process.env.TIER_M_MODEL,
        W: process.env.TIER_W_MODEL,
    }[tier];
    if (!model)
        throw new Error('Model env var not set for tier: ' + tier);
    return model;
}
// Max tokens by tier (Doc 7B)
export function getMaxTokens(tier, override) {
    if (override)
        return override;
    return { S: 16384, M: 8192, W: 4096 }[tier];
}
// Record a single AI call to linup_spend_log (Doc 8E step 1, Doc 11 D11)
export async function record(projectId, stage, memberId, tier, openRouterResponse, db) {
    const usage = openRouterResponse.usage;
    if (!usage)
        return; // OpenRouter may omit usage on some errors — skip silently
    const spend = {
        projectId,
        stage,
        memberId,
        tier,
        model: getModel(tier),
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
    };
    const { error } = await db.from('linup_spend_log').insert({
        project_id: spend.projectId,
        stage: spend.stage,
        member_id: spend.memberId,
        tier: spend.tier,
        model: spend.model,
        prompt_tokens: spend.promptTokens,
        completion_tokens: spend.completionTokens,
        total_tokens: spend.totalTokens,
        recorded_at: new Date().toISOString(),
    });
    if (error) {
        // Non-fatal — log but do not throw. Cost tracking must not break pipeline.
        console.error('[cost] Failed to record spend:', error.message);
    }
}
// --- Soft limiter (Doc 11 D11) ---
// Checks spend thresholds after each AI call. Internal alert only — no user impact.
const resend = new Resend(process.env.RESEND_API_KEY);
export async function checkSoftLimits(projectId, db) {
    const alertEmail = process.env.SOFT_LIMIT_ALERT_EMAIL;
    if (!alertEmail)
        return;
    // Check 1: single project total cost > £30
    const { data: projectSpend } = await db
        .from('linup_spend_log')
        .select('cost_gbp')
        .eq('project_id', projectId);
    const projectTotal = (projectSpend ?? []).reduce((sum, r) => sum + (r.cost_gbp ?? 0), 0);
    if (projectTotal > 30) {
        await resend.emails.send({
            from: 'LINUP Alerts <alerts@linup.io>',
            to: alertEmail,
            subject: '[LINUP] Soft limit: project spend > £30',
            html: '<p>Project <strong>' + projectId + '</strong> has accumulated £' + projectTotal.toFixed(2) + ' in OpenRouter costs.</p>',
        }).catch(() => { }); // non-fatal
    }
}
//# sourceMappingURL=cost.js.map