import { SupabaseClient } from '@supabase/supabase-js';
import { callAIWithRetry } from './payload.js';
import type { Message } from './payload.js';

// â”€â”€â”€ Errors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export class CompressionValidationError extends Error {
  constructor(missing: string[]) { super('Compression missing constraints: ' + missing.join(', ')); }
}
export class CompressionSizeError extends Error {
  constructor(count: number) { super('Compression output too large: ' + count + ' words (max 500)'); }
}
export class CompressionError extends Error {
  constructor(stage: number, reason: string) { super('Compression failed for stage ' + stage + ': ' + reason); }
}

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface StageAbstract {
  stage: number;
  stageName: string;
  bindingConstraints: string[];
  keyDecisions: string[];
  assumptions: string[];
  founderDecisions: string[];
  wordCount: number;
}

export interface VpConsolidation {
  stage: number;
  stageName: string;
  bindingConstraints: string[];
  keyDecisions: string[];
  allAssumptions: string[];
  founderDecisions: string[];
}

// â”€â”€â”€ Compression system prompt (Doc 7B) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const COMPRESSION_SYSTEM_PROMPT = 'You are a Stage Compression Specialist. Produce a concise, structured abstract ' +
  'of this pipeline stage. Output must be valid JSON matching the StageAbstract schema exactly. ' +
  'Every binding constraint must appear verbatim - never paraphrased. Total <= 500 words. ' +
  'Do not summarise, interpret, or improve constraints. Extract and preserve them. ' +
  'Output ONLY the JSON object â€” no markdown, no preamble, no explanation.';

// â”€â”€â”€ buildCompressionPrompt (Doc 7B) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Receives ONLY: binding constraints, key decisions, assumptions, founder decisions
// NOT: full IC outputs, full VP narrative, full group review prose
function buildCompressionPrompt(consolidation: VpConsolidation, rejectionReason?: string): Message[] {
  const userContent = JSON.stringify({
    stage: consolidation.stage,
    stageName: consolidation.stageName,
    bindingConstraints: consolidation.bindingConstraints,
    keyDecisions: consolidation.keyDecisions,
    assumptions: consolidation.allAssumptions,
    founderDecisions: consolidation.founderDecisions,
  }) + (rejectionReason ? '\n\nPREVIOUS ATTEMPT REJECTED: ' + rejectionReason + '\nCorrect the above issues.' : '');

  return [
    { role: 'system', content: COMPRESSION_SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ];
}

// â”€â”€â”€ Word count helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// â”€â”€â”€ validateAbstractCompleteness â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function validateAbstractCompleteness(
  abstract: StageAbstract,
  consolidation: VpConsolidation
): { passed: boolean; missingConstraints: string[] } {
  const missing: string[] = [];

  // Every binding constraint from consolidation must appear verbatim in abstract
  for (const constraint of consolidation.bindingConstraints) {
    const found = abstract.bindingConstraints.some((c: any) => String(c).trim() === String(constraint).trim());
    if (!found) missing.push(constraint);
  }

  return { passed: missing.length === 0, missingConstraints: missing };
}

// â”€â”€â”€ compressStage (Doc 7B) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Called by PM after founder answers all questions, before LOCKED is issued.
// Re-runs once with rejection reason on failure; throws CompressionError on second failure.
export async function compressStage(
  projectId: string,
  stage: number,
  consolidation: VpConsolidation,
  db: SupabaseClient
): Promise<void> {
  // Stage 0: bypass compression — store minimal abstract
  if (stage === 0) {
    const minimal = { stage: 0, stageName: 'Phase 0 — Idea Validation', summary: 'Idea validated and ready for Council review.', keyDecisions: [], bindingConstraints: [], assumptions: [], openItems: [] };
    await db.from('stage_abstracts').upsert({ project_id: projectId, stage, abstract_json: minimal, created_at: new Date().toISOString() });
    console.log('[compression] Stage 0 bypass — stored minimal abstract');
    return minimal as any;
  }

  let rejectionReason: string | undefined;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const messages = buildCompressionPrompt(consolidation, rejectionReason);
    const response = await callAIWithRetry('W', messages);
    const raw = (response.choices[0]?.message.content ?? '').trim();
    const rawClean2 = raw.replace(/^[\s\S]*?(?=\{)/, '').replace(/\n?```$/i, '').trim();

    let abstract: StageAbstract;
    try {
      abstract = JSON.parse(rawClean2);
    } catch (e) {
      rejectionReason = 'Output was not valid JSON. Raw output: ' + raw.slice(0, 200);
      if (attempt === 2) throw new CompressionError(stage, rejectionReason);
      continue;
    }

    // Size check
    const wc = wordCount(raw);
    if (wc > 500) {
      rejectionReason = 'Output was ' + wc + ' words â€” must be <= 500. Reduce without losing constraints.';
      if (attempt === 2) throw new CompressionSizeError(wc);
      continue;
    }

    // Completeness check
    const validation = validateAbstractCompleteness(abstract, consolidation);
    if (!validation.passed) {
      rejectionReason = 'Missing binding constraints: ' + validation.missingConstraints.join(' | ');
      if (attempt === 2) throw new CompressionValidationError(validation.missingConstraints);
      continue;
    }

    // Set word count on abstract before storing
    abstract.wordCount = wc;

    const { error } = await db.from('stage_abstracts').insert({
      project_id: projectId,
      stage,
      abstract_json: abstract,
      created_at: new Date().toISOString(),
    });
    if (error) throw new CompressionError(stage, 'DB insert failed: ' + error.message);

    console.log('[compression] Stage ' + stage + ' abstract stored. Words: ' + wc);
    return;
  }
}