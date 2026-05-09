import { SupabaseClient } from '@supabase/supabase-js';
import { getModel, getMaxTokens } from './cost.js';

// â”€â”€â”€ Errors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export class RateLimitExhaustedError extends Error {
  constructor(tier: string) { super('Rate limit retries exhausted for tier: ' + tier); }
}
export class ApiError extends Error {
  constructor(status: number, tier: string) { super('OpenRouter API error ' + status + ' for tier: ' + tier); }
}
export class PayloadSizeError extends Error {
  constructor(label: string, count: number) { super('Payload size exceeded (' + label + '): ' + count + ' words'); }
}

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface Message { role: string; content: string; }

export interface OpenRouterResponse {
  choices: { message: { content: string } }[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

// â”€â”€â”€ callAI (Doc 7B) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function callAI(
  tier: 'S' | 'M' | 'W',
  messages: Message[],
  maxTokensOverride?: number
): Promise<OpenRouterResponse> {
  const model = getModel(tier);
  const maxTokens = getMaxTokens(tier, maxTokensOverride);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
      'HTTP-Referer': 'https://linup.io',
      'X-Title': 'LINUP',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  });

  if (!response.ok) throw new ApiError(response.status, tier);
  return response.json() as Promise<OpenRouterResponse>;
}

// â”€â”€â”€ MOCK responses (dev only â€” MOCK_AI=true) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getMockResponse(tier: 'S' | 'M' | 'W'): OpenRouterResponse {
  return {
    choices: [{ message: { content: '[MOCK] Tier ' + tier + ' canned response.' } }],
    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
  };
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// â”€â”€â”€ callAIWithRetry (Doc 7B) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Covers infrastructure failures only â€” IC quality retries are in index.ts
export async function callAIWithRetry(
  tier: 'S' | 'M' | 'W',
  messages: Message[],
  maxTokensOverride?: number
): Promise<OpenRouterResponse> {
  if (process.env.MOCK_AI === 'true') return getMockResponse(tier);

  const MAX_RATE_LIMIT_RETRIES = 3;
  const MAX_SERVER_ERROR_RETRIES = 2;
  let rateLimitAttempts = 0;
  let serverErrorAttempts = 0;
  const timeoutMs = tier === 'S' ? 300_000 : 120_000;
  const model = getModel(tier);
  const maxTokens = getMaxTokens(tier, maxTokensOverride);

  while (true) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
        'HTTP-Referer': 'https://linup.io',
        'X-Title': 'LINUP',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
    });

    if (response.ok) return response.json() as Promise<OpenRouterResponse>;

    if (response.status === 429) {
      rateLimitAttempts++;
      if (rateLimitAttempts > MAX_RATE_LIMIT_RETRIES) throw new RateLimitExhaustedError(tier);
      await sleep(Math.pow(2, rateLimitAttempts) * 1000);
      continue;
    }

    if (response.status >= 500) {
      serverErrorAttempts++;
      if (serverErrorAttempts > MAX_SERVER_ERROR_RETRIES) throw new ApiError(response.status, tier);
      await sleep(3000);
      continue;
    }

    throw new ApiError(response.status, tier);
  }
}

// â”€â”€â”€ Payload types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface PayloadParts {
  start: string;   // brief + output format
  middle: string;  // abstracts + context pulls
  end: string;     // project identity + founder decisions
  finalReminder: string; // one-sentence critical constraint
}

export class Payload {
  private parts: PayloadParts;

  constructor(parts: PayloadParts) { this.parts = parts; }

  get tier1WordCount(): number {
    return wordCount(this.parts.start + ' ' + this.parts.end);
  }

  get totalWordCount(): number {
    const all = this.parts.start + ' ' + this.parts.middle + ' ' + this.parts.end + ' ' + this.parts.finalReminder;
    return wordCount(all);
  }

  toMessages(systemPrompt: string): Message[] {
    const userContent = [
      this.parts.start,
      this.parts.middle,
      this.parts.end,
      this.parts.finalReminder,
    ].filter(Boolean).join('\n\n');
    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];
  }
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// â”€â”€â”€ assemblePayload (Doc 7B) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function assemblePayload(
  memberId: string,
  systemPrompt: string,
  outputTemplate: string,
  projectId: string,
  stage: number,
  db: SupabaseClient
): Promise<Payload> {
  const { data: project } = await db.from('projects').select('identity_json, founder_decisions_json').eq('id', projectId).single();
  const { data: abstracts } = await db.from('stage_abstracts').select('abstract_json').eq('project_id', projectId).lt('stage', stage).order('stage');
  const { data: founderDecisions } = await db.from('founder_answers').select('question, answer').eq('project_id', projectId).order('created_at');

  const contextPulls = await fetchContextPulls(memberId, projectId, stage, db);

  const abstractsText = (abstracts ?? []).map((a: any) => JSON.stringify(a.abstract_json)).join('\n\n');
  const founderDecisionsText = (founderDecisions ?? []).map((d: any) => 'Q: ' + d.question + '\nA: ' + d.answer).join('\n\n');
  const projectIdentityText = project ? JSON.stringify(project.identity_json) : '';

  const payload = new Payload({
    start: outputTemplate,
    middle: abstractsText + (contextPulls.length ? '\n\n' + contextPulls.join('\n\n') : ''),
    end: projectIdentityText + '\n\n' + founderDecisionsText,
    finalReminder: '',
  });

  if (payload.tier1WordCount > 7200) throw new PayloadSizeError('Tier 1', payload.tier1WordCount);
  if (payload.totalWordCount > 12000) throw new PayloadSizeError('Total', payload.totalWordCount);

  return payload;
}

// â”€â”€â”€ fetchContextPulls (Doc 7B) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Member-specific sparse retrieval from prior stage archives
export async function fetchContextPulls(
  memberId: string,
  projectId: string,
  stage: number,
  db: SupabaseClient
): Promise<string[]> {
  // Context pull definitions are stored per-member in member_prompts.context_pulls_json
  const { data: memberRow } = await db.from('member_prompts').select('context_pulls_json').eq('member_id', memberId).single();
  if (!memberRow?.context_pulls_json) return [];

  const pulls: { stage: number; sectionId: string }[] = memberRow.context_pulls_json;
  const results: string[] = [];

  for (const pull of pulls) {
    if (pull.stage >= stage) continue; // only pull from completed stages
    const { data: section } = await db
      .from('stage_archive_sections')
      .select('content')
      .eq('project_id', projectId)
      .eq('stage', pull.stage)
      .eq('section_id', pull.sectionId)
      .single();
    if (section?.content) results.push(section.content);
  }

  return results;
}