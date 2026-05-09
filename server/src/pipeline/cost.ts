import { SupabaseClient } from '@supabase/supabase-js';

// Tier model resolution — configured via env vars, swappable without code changes
// Charter: TIER_S_MODEL = anthropic/claude-opus-4
// Charter: TIER_M_MODEL = anthropic/claude-sonnet-4
// Charter: TIER_W_MODEL = anthropic/claude-haiku-4-5
export function getModel(tier: 'S' | 'M' | 'W'): string {
  const model = {
    S: process.env.TIER_S_MODEL,
    M: process.env.TIER_M_MODEL,
    W: process.env.TIER_W_MODEL,
  }[tier];
  if (!model) throw new Error('Model env var not set for tier: ' + tier);
  return model;
}

// Max tokens by tier (Doc 7B)
export function getMaxTokens(tier: 'S' | 'M' | 'W', override?: number): number {
  if (override) return override;
  return { S: 16384, M: 8192, W: 4096 }[tier];
}

export interface SpendRecord {
  projectId: string;
  stage: number;
  memberId: string;
  tier: 'S' | 'M' | 'W';
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// Record a single AI call to linup_spend_log (Doc 8E step 1, Doc 11 D11)
export async function record(
  projectId: string,
  stage: number,
  memberId: string,
  tier: 'S' | 'M' | 'W',
  openRouterResponse: { usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } },
  db: SupabaseClient
): Promise<void> {
  const usage = openRouterResponse.usage;
  if (!usage) return; // OpenRouter may omit usage on some errors — skip silently

  const spend: SpendRecord = {
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