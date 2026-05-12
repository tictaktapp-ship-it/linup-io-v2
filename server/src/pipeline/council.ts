import { createClient } from '@supabase/supabase-js';
import { callAIWithRetry } from './payload.js';

// ── Phase 0 Council pipeline (Doc 8D Phase 9, Doc 9E) ────────────────────────
// Implements: Concierge → PIS → Council (13) → Quality Gate → Phase 0.5 (5) → Charter

const db = createClient(
  process.env['SUPABASE_URL'] as string,
  process.env['SUPABASE_SERVICE_ROLE_KEY'] as string
);

// ── Tier routing (Doc Charter — TIER_S/M/W env vars) ─────────────────────────
const TIER_S = 'S' as const;
const TIER_M = 'M' as const;
const TIER_W = 'W' as const;

// ── Council member registry (Doc 9E — P0-2-001 through P0-2-013) ─────────────
const COUNCIL_MEMBERS = [
  { id: 'P0-2-001', title: 'Market Analyst',       tier: TIER_W, focus: 'Market size, timing, demand signals' },
  { id: 'P0-2-002', title: 'Customer Advocate',    tier: TIER_W, focus: 'User need validation, persona fit' },
  { id: 'P0-2-003', title: 'Competitive Analyst',  tier: TIER_W, focus: 'Competitive landscape, differentiation' },
  { id: 'P0-2-004', title: 'Business Strategist',  tier: TIER_W, focus: 'Business model viability, revenue path' },
  { id: 'P0-2-005', title: 'Technical Assessor',   tier: TIER_W, focus: 'Technical feasibility, complexity estimate' },
  { id: 'P0-2-006', title: 'Security Reviewer',    tier: TIER_W, focus: 'Security risk surface, compliance flags' },
  { id: 'P0-2-007', title: 'Ethics Officer',        tier: TIER_W, focus: 'Ethical implications, harm potential' },
  { id: 'P0-2-008', title: 'Financial Analyst',    tier: TIER_W, focus: 'Unit economics, cost structure' },
  { id: 'P0-2-009', title: 'Risk Analyst',         tier: TIER_W, focus: 'Key risks, probability, mitigation' },
  { id: 'P0-2-010', title: 'Innovation Assessor',  tier: TIER_W, focus: 'Novelty, defensibility, timing' },
  { id: 'P0-2-011', title: 'Regulatory Specialist',tier: TIER_W, focus: 'Regulatory requirements, compliance path' },
  { id: 'P0-2-012', title: 'Product Strategist',   tier: TIER_W, focus: 'Product strategy, roadmap viability' },
  { id: 'P0-2-013', title: 'Quality Gate',          tier: TIER_M, focus: 'Synthesises all 12 verdicts → APPROVED / CONDITIONAL / BLOCKED' },
] as const;

// ── Phase 0.5 member registry (Doc 9E — sequential) ──────────────────────────
const PHASE05_MEMBERS = [
  { id: 'P05-1-001', title: 'Idea Innovator',           tier: TIER_M, description: 'Feature Universe Map (min 30 features)' },
  { id: 'P05-1-002', title: 'Scope Strategist',         tier: TIER_M, description: 'SHOULD / COULD / WOULD / WON\'T decisions' },
  { id: 'P05-2-001', title: 'MVP Definer',              tier: TIER_M, description: 'Draws the minimum viable product line' },
  { id: 'P05-2-002', title: 'V2+ Roadmap Planner',      tier: TIER_W, description: 'Themes future phases' },
  { id: 'P05-2-003', title: 'Feature Charter Reviewer', tier: TIER_M, description: 'Completeness gate before handoff' },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getCouncilState(projectId: string): Promise<Record<string, unknown>> {
  const { data } = await db
    .from('projects')
    .select('council_state')
    .eq('id', projectId)
    .single();
  return (data?.council_state as Record<string, unknown>) ?? {};
}

async function saveCouncilState(projectId: string, state: Record<string, unknown>): Promise<void> {
  await db
    .from('projects')
    .update({ council_state: state, updated_at: new Date().toISOString() })
    .eq('id', projectId);
}

function buildMessages(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  userMessage: string
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  return [
    { role: 'system', content: systemPrompt },
    ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user', content: userMessage },
  ];
}

// ── Concierge (P0-0-001) ─────────────────────────────────────────────────────
// Doc 11 D16: warm, confident, never corporate. Max 3 exchanges.
// Exchange 3 always hands off to PIS regardless of content.

const CONCIERGE_SYSTEM = `You are the Onboarding Concierge for LINUP — an AI engineering department that specifies software products for non-technical founders.

Your role is to welcome the founder, set expectations clearly, and prepare them to share their idea with the Product Intake Specialist. You never discuss or analyse the idea itself.

TONE: Warm, confident, peer-to-peer. Never corporate or technical. Speak as someone who understands the excitement of building something new.

RULES:
- Maximum 3 exchanges total (including this one)
- Exchange 1: Welcome + explain what LINUP does and what Phase 0 involves
- Exchange 2: Answer any process question directly in plain English, then redirect to the idea
- Exchange 3: Hand off to the Product Intake Specialist warmly — this is always your final message
- Never ask about or comment on the founder's idea — that is the PIS's job
- Keep responses concise — 3-5 sentences maximum
- Never use jargon

When it is time to hand off (exchange 3 or whenever the founder is ready), end your message with exactly: [HANDOFF_TO_PIS]`;

export async function handleConciergeMessage(input: {
  projectId: string;
  message: string;
  exchangeCount: number;
}): Promise<{ reply: string; handoffToPis: boolean }> {
  const { message, exchangeCount } = input;

  // Exchange 3+ always triggers handoff
  const isHandoffExchange = exchangeCount >= 2;

  const userMsg = isHandoffExchange
    ? message + '\n\n[System: This is exchange 3. You must hand off to the Product Intake Specialist now.]'
    : message;

  const messages = buildMessages(CONCIERGE_SYSTEM, [], userMsg);
  const response = await callAIWithRetry('M', messages as any);
  let reply = response.choices[0]?.message.content ?? '';

  const handoffToPis = reply.includes('[HANDOFF_TO_PIS]') || isHandoffExchange;
  reply = reply.replace('[HANDOFF_TO_PIS]', '').trim();

  return { reply, handoffToPis };
}

// ── Product Intake Specialist (P0-1-001) ──────────────────────────────────────
// Doc 9E: conversational, one question at a time, never jargon, never technical.
// Extracts: problem, primary user, constraints, domain signals, unique insight.
// Returns the Idea Brief as structured JSON when complete.

const PIS_SYSTEM = `You are Sarah Chen, Product Intake Specialist at LINUP.

LINUP is an AI engineering department that takes a founder's idea and produces a complete, production-ready software specification. Your job is to run the intake conversation that starts this process.

When starting a new conversation, always introduce yourself like this:
"Hi, I'm Sarah Chen — I'm the Product Intake Specialist here at LINUP. My job is to have a proper conversation with you about what you want to build, so I can put together a clear Idea Brief that goes to our 13-member review Council. I'll ask you one question at a time — no forms, no jargon, just a proper chat. Let's start with the most important thing: what problem are you trying to solve?"

TONE: Warm, direct, peer-to-peer. You genuinely care about understanding their idea. Ask one question at a time. Reflect back what you hear. Validate good answers specifically. Never use technical jargon. Never ask about implementation.

YOU NEED TO EXTRACT:
1. The problem being solved (not the solution)
2. The primary user (who specifically, not "everyone")
3. Any constraints (budget, timeline, existing tools, regulatory context)
4. Domain signals (industry, geography, compliance requirements)
5. The founder's unique insight — why they are the right person to solve this, or why now

RULES:
- Always introduce yourself on the first message
- One question per message — never ask two things at once
- Reference the project name naturally in conversation
- Reflect back what you hear: "So it sounds like the core problem is..."
- Validate specifically: "That's a really clear user definition — that'll help a lot"
- When you have enough to produce a solid brief (usually 5-8 exchanges), produce the Idea Brief
- Never ask about technical implementation, stack, or architecture
- Never suggest features or solutions

When you have enough information, end your message with a JSON block in this exact format:
<idea_brief>
{
  "problem": "...",
  "primary_user": "...",
  "domain": "...",
  "constraints": "...",
  "unique_insight": "...",
  "summary": "..."
}
</idea_brief>

Only produce the idea_brief block when you genuinely have enough information. Do not produce it prematurely.`;

export async function handlePisMessage(input: {
  projectId: string;
  projectName: string;
  message: string;
  history: Array<{ role: string; content: string }>;
}): Promise<{ reply: string; ideaBrief: Record<string, unknown> | null; briefComplete: boolean }> {
  const { projectName, message, history } = input;

  const contextMsg = history.length === 0
    ? `The founder's project is called "${projectName}". This is the very first message — introduce yourself as Sarah Chen, then ask your opening question.`
    : message;

  const messages = buildMessages(PIS_SYSTEM, history, contextMsg);
  const response = await callAIWithRetry('M', messages as any);
  const content = response.choices[0]?.message.content ?? '';

  // Extract Idea Brief if present
  const briefMatch = content.match(/<idea_brief>([\s\S]*?)<\/idea_brief>/);
  let ideaBrief: Record<string, unknown> | null = null;
  let reply = content;

  if (briefMatch) {
    try {
      ideaBrief = JSON.parse(briefMatch[1]!.trim());
      // Remove the raw JSON block from the displayed reply
      reply = content.replace(/<idea_brief>[\s\S]*?<\/idea_brief>/, '').trim();
    } catch {
      // Malformed JSON — continue without brief
    }
  }

  return { reply, ideaBrief, briefComplete: ideaBrief !== null };
}

// ── Council Run (P0-2-001 through P0-2-013) ───────────────────────────────────
// 12 specialists run in parallel, Quality Gate (P0-2-013) runs last.
// Each result written to council_state as it completes (Realtime fires).

function buildCouncilMemberPrompt(
  member: typeof COUNCIL_MEMBERS[number],
  ideaBrief: Record<string, unknown>
): string {
  return `You are the ${member.title} on the LINUP Council — an independent validation team for software product ideas.

YOUR FOCUS: ${member.focus}

You are reviewing an Idea Brief submitted by a founder. Your job is to give an honest, expert verdict from your specialist perspective.

IDEA BRIEF:
${JSON.stringify(ideaBrief, null, 2)}

Your role is to PREPARE this idea for development, not to gatekeep it. Every idea has gaps — your job is to identify them so the engineering team can address them, not to stop the founder.

Produce your review in this exact format:
VERDICT: APPROVED | CONDITIONAL
CONFIDENCE: HIGH | MEDIUM | LOW
SUMMARY: [2-3 sentences — your overall assessment from your specialist perspective]
KEY_FINDINGS:
- [Finding 1]
- [Finding 2]
- [Finding 3 if needed]
CONDITIONS: [If CONDITIONAL: what the founder needs to confirm their direction on (1-2 questions max). If APPROVED: NONE]
RESEARCH_BRIEF: [1-3 specific things the LINUP engineering team should investigate or validate during the build — compliance requirements, market assumptions, technical risks etc. Always provide this.]

VERDICT GUIDANCE:
- APPROVED: The idea is viable and directionally sound. Use this even if there are unknowns — put them in RESEARCH_BRIEF.
- CONDITIONAL: Only use this if there is a genuine ambiguity about the founder's INTENT or DIRECTION that would materially change what gets built. Not for knowledge gaps — those go in RESEARCH_BRIEF.
- NEVER recommend stopping or blocking. Your job is to move ideas forward with the right preparation.`;
}

function buildQualityGatePrompt(
  ideaBrief: Record<string, unknown>,
  memberResults: Array<{ id: string; title: string; verdict: string; summary: string; conditions: string; blocker: string }>
): string {
  const resultsText = memberResults.map(r =>
    `${r.title} (${r.id}): ${r.verdict}\n${r.summary}${r.conditions !== 'NONE' ? '\nConditions: ' + r.conditions : ''}${r.blocker !== 'NONE' ? '\nBlocker: ' + r.blocker : ''}`
  ).join('\n\n---\n\n');

  // Detect resubmission — founder has answered the conditional questions
  const founderAnswers = ideaBrief['founder_conditional_answers'] as string | undefined;
  const resubmissionSection = founderAnswers
    ? `\nRESUBMISSION CONTEXT:
This is a resubmission. The founder has already received CONDITIONAL questions from a previous Council run and has now provided answers. Their answers are included in the Idea Brief above under "founder_conditional_answers".

CRITICAL RESUBMISSION RULES:
- You MUST read the founder's answers before evaluating the specialist verdicts
- If the founder's answers genuinely address the conditions raised, you MUST return APPROVED or at most one remaining CONDITIONAL question
- Do NOT repeat questions the founder has already answered
- Only return CONDITIONAL if there are genuinely NEW unresolved issues not addressed by the founder's answers
- Only return CONDITIONAL if there are genuinely NEW unresolved direction questions not addressed by the founder's answers\n`
    : '';

  return `You are the Quality Gate — the final synthesiser on the LINUP Council.
You have received verdicts from 12 specialist reviewers on an Idea Brief. Your job is to synthesise their verdicts into a single Quality Gate decision.
${resubmissionSection}
IDEA BRIEF:
${JSON.stringify(ideaBrief, null, 2)}

SPECIALIST VERDICTS:
${resultsText}

YOUR ROLE: You are preparing this idea for development, not gatekeeping it. The council exists to ensure the engineering team has what it needs to build correctly — not to stop founders. Every idea that reaches you has already been validated enough to proceed. Your job is to determine whether the founder needs to clarify their direction first (CONDITIONAL) or whether the team can proceed immediately (APPROVED).

DECISION RULES:
- APPROVED: The idea is directionally clear enough to proceed to feature discovery. Unknowns and risks are documented in the research brief for the engineering team to address during the build.
- CONDITIONAL: The founder needs to clarify their intended direction on 1-3 specific points that would materially change what gets built. Not for knowledge gaps — those are the engineering team's job.
- NEVER output BLOCKED. If you feel strongly about a risk, document it in CONCERNS and RESEARCH_BRIEF instead.

Produce your synthesis in this exact format:
QUALITY_GATE_VERDICT: APPROVED | CONDITIONAL
OVERALL_ASSESSMENT: [3-4 sentences — positive framing of what this idea is and why it has merit, followed by what the team will need to address]
STRENGTHS:
- [Top 2-3 genuine strengths]
CONCERNS:
- [Top 2-3 risks or unknowns — framed as things the engineering team will investigate, not reasons to stop]
RESEARCH_BRIEF:
- [Top 3-5 specific things the LINUP team should research or validate during the build — regulatory requirements, competitor analysis, technical feasibility questions, market assumptions etc.]
CONDITIONAL_QUESTIONS: [If CONDITIONAL: up to 3 founder direction questions, one per line starting with Q:. If APPROVED: NONE]`;
}
function parseCouncilMemberResult(content: string): {
  verdict: string;
  confidence: string;
  summary: string;
  keyFindings: string[];
  conditions: string;
  blocker: string;
} {
  const extract = (label: string) => {
    const match = content.match(new RegExp(label + ':\\s*([^\\n]+)'));
    return match ? match[1]!.trim() : '';
  };

  const findingsMatch = content.match(/KEY_FINDINGS:\n([\s\S]*?)(?=CONDITIONS:|BLOCKER:|$)/);
  const findings = findingsMatch
    ? findingsMatch[1]!.split('\n').map(l => l.replace(/^-\s*/, '').trim()).filter(Boolean)
    : [];

  return {
    verdict: extract('VERDICT'),
    confidence: extract('CONFIDENCE'),
    summary: extract('SUMMARY'),
    keyFindings: findings,
    conditions: extract('CONDITIONS'),
    blocker: extract('BLOCKER'),
  };
}

// Per-project write lock — prevents concurrent getCouncilState/saveCouncilState
// interleaving that causes member results to overwrite each other.
const _councilLocks = new Map<string, Promise<void>>();

async function withCouncilLock<T>(projectId: string, fn: () => Promise<T>): Promise<T> {
  // Chain this operation onto the existing lock for this project
  const prev = _councilLocks.get(projectId) ?? Promise.resolve();
  let releaseLock!: () => void;
  const next = new Promise<void>(resolve => { releaseLock = resolve; });
  _councilLocks.set(projectId, prev.then(() => next));
  await prev;
  try {
    return await fn();
  } finally {
    releaseLock();
  }
}

export async function confirmIdeaBrief(
  projectId: string,
  ideaBrief: Record<string, unknown>
): Promise<void> {
  // Initialise council_state with all 13 members as PENDING
  const initialState: Record<string, unknown> = {
    phase: 'COUNCIL_RUNNING',
    idea_brief: ideaBrief,
    started_at: new Date().toISOString(),
    members: Object.fromEntries(
      COUNCIL_MEMBERS.map(m => [m.id, { status: 'PENDING', title: m.title }])
    ),
    quality_gate: null,
    conditional_questions: null,
    verdict: null,
  };
  await saveCouncilState(projectId, initialState);

  // Run 12 specialists in parallel (Quality Gate runs last)
  const specialists = COUNCIL_MEMBERS.slice(0, 12);
  const specialistResults: Array<{
    id: string;
    title: string;
    verdict: string;
    summary: string;
    conditions: string;
    blocker: string;
  }> = [];

  await Promise.all(
    specialists.map(async (member) => {
      try {
        // Mark as RUNNING (serialised)
        await withCouncilLock(projectId, async () => {
          const state = await getCouncilState(projectId);
          const members = state['members'] as Record<string, unknown>;
          members[member.id] = { ...members[member.id] as object, status: 'RUNNING' };
          await saveCouncilState(projectId, { ...state, members });
        });

        const prompt = buildCouncilMemberPrompt(member, ideaBrief);
        const messages = [
          { role: 'system' as const, content: 'You are a specialist reviewer on the LINUP Council.' },
          { role: 'user' as const, content: prompt },
        ];
        const response = await callAIWithRetry(member.tier as 'S' | 'M' | 'W', messages as any);
        const aiContent = response.choices[0]?.message.content ?? '';
        const parsed = parseCouncilMemberResult(aiContent);

        // Mark as COMPLETE and save result (serialised)
        await withCouncilLock(projectId, async () => {
          const state2 = await getCouncilState(projectId);
          const members2 = state2['members'] as Record<string, unknown>;
          members2[member.id] = {
            status: 'COMPLETE',
            title: member.title,
            ...parsed,
          };
          await saveCouncilState(projectId, { ...state2, members: members2 });
        });

        specialistResults.push({
          id: member.id,
          title: member.title,
          verdict: parsed.verdict,
          summary: parsed.summary,
          conditions: parsed.conditions,
          blocker: parsed.blocker,
        });
      } catch (err: any) {
        await withCouncilLock(projectId, async () => {
          const state = await getCouncilState(projectId);
          const members = state['members'] as Record<string, unknown>;
          members[member.id] = { ...members[member.id] as object, status: 'ERROR', error: (err as Error).message };
          await saveCouncilState(projectId, { ...state, members });
        });
      }
    })
  );

  // Quality Gate (P0-2-013) runs after all 12 specialists
  const qgMember = COUNCIL_MEMBERS[12]; // P0-2-013
  try {
    const state = await getCouncilState(projectId);
    const members = state['members'] as Record<string, unknown>;
    members[qgMember.id] = { ...members[qgMember.id] as object, status: 'RUNNING' };
    await saveCouncilState(projectId, { ...state, members });

    const qgPrompt = buildQualityGatePrompt(ideaBrief, specialistResults);
    const messages = [
      { role: 'system' as const, content: 'You are the Quality Gate synthesiser on the LINUP Council.' },
      { role: 'user' as const, content: qgPrompt },
    ];
    const response = await callAIWithRetry('M', messages as any);
    const content = response.choices[0]?.message.content ?? '';

    const verdictMatch = content.match(/QUALITY_GATE_VERDICT:\s*(\w+)/);
    const assessmentMatch = content.match(/OVERALL_ASSESSMENT:\s*([^\n]+(?:\n(?!STRENGTHS:|CONCERNS:)[^\n]+)*)/);
    const condQMatch = content.match(/CONDITIONAL_QUESTIONS:\s*([\s\S]*?)(?=BLOCKED_REASON:|$)/);
    const blockedMatch = content.match(/BLOCKED_REASON:\s*([^\n]+)/);

    const verdict = verdictMatch ? verdictMatch[1]!.trim() : 'CONDITIONAL';
    const assessment = assessmentMatch ? assessmentMatch[1]!.trim() : '';
    const conditionalQuestions = condQMatch && !condQMatch[1]!.includes('NONE')
      ? condQMatch[1]!.split('\n').map(l => l.replace(/^Q:\s*/, '').trim()).filter(Boolean)
      : [];
    const blockedReason = blockedMatch && !blockedMatch[1]!.includes('NONE') ? blockedMatch[1]!.trim() : null;

    // BLOCKED is no longer a valid verdict — treat it as CONDITIONAL if AI returns it anyway
    const normalisedVerdict = (verdict === 'BLOCKED') ? 'CONDITIONAL' : verdict;
    const finalPhase = normalisedVerdict === 'APPROVED'
      ? 'PHASE05_STARTING'
      : 'AWAITING_FOUNDER_CONDITIONAL';

    const state2 = await getCouncilState(projectId);
    const members2 = state2['members'] as Record<string, unknown>;
    members2[qgMember.id] = { status: 'COMPLETE', title: qgMember.title, verdict, assessment };

    // Enrich conditional questions: rewrite into founder-friendly language with specific options
    let conditionalQuestionsRich = null;
    if (conditionalQuestions.length > 0) {
      try {
        const enrichPrompt = [
          'You are helping a non-technical founder answer questions from an expert council review of their product idea.',
          '',
          'The council has raised ' + conditionalQuestions.length + ' conditional question(s).',
          '',
          'ORIGINAL COUNCIL QUESTIONS:',
          conditionalQuestions.map((q, i) => (i + 1) + '. ' + q).join('\n'),
          '',
          'FOUNDER IDEA BRIEF:',
          JSON.stringify(ideaBrief, null, 2),
          '',
          'Rewrite each question so that:',
          '1. It is in plain conversational English a non-technical founder can understand',
          '2. It asks about the founder\'s intent, direction, and plan — not technical proof',
          '3. It is encouraging, not interrogative',
          '4. LINUP will handle the research — the founder just needs to confirm their direction',
          '',
          'For each question generate exactly 4 answer options that are:',
          '- Specific to THIS question and THIS idea (not generic)',
          '- Written from the founder perspective (I have / I plan to / I intend to / I haven\'t yet)',
          '- Ordered from most to least prepared',
          '- Realistic options a real founder might actually choose',
          '',
          'Respond ONLY with a JSON array. No markdown, no explanation, no backticks.',
          'Format:',
          '[{"question":"...","options":["...","...","...","..."]}]',
        ].join('\n');

        const enrichMessages = [
          { role: 'system', content: 'You are a product communication specialist. Output only valid JSON arrays.' },
          { role: 'user', content: enrichPrompt },
        ];
        const enrichResponse = await callAIWithRetry('M', enrichMessages);
        const enrichRaw = (enrichResponse.choices[0]?.message?.content ?? '').trim();
        const enrichClean = enrichRaw.replace(/^[`]{0,3}json|[`]{0,3}$/g, '').trim();
        conditionalQuestionsRich = JSON.parse(enrichClean);
      } catch (enrichErr) {
        console.error('Question enrichment failed (non-fatal):', enrichErr);
        conditionalQuestionsRich = null;
      }
    }

    await saveCouncilState(projectId, {
      ...state2,
      members: members2,
      phase: finalPhase,
      verdict: normalisedVerdict,
      quality_gate: { verdict: normalisedVerdict, assessment, blockedReason: null },
      conditional_questions: conditionalQuestions.length > 0 ? conditionalQuestions : null,
      conditional_questions_rich: conditionalQuestionsRich,
      completed_at: new Date().toISOString(),
    });

    // If APPROVED → immediately begin Phase 0.5
    if (normalisedVerdict === 'APPROVED') {
      await runPhase05(projectId, ideaBrief);
    }
  } catch (err: any) {
    const state = await getCouncilState(projectId);
    const members = state['members'] as Record<string, unknown>;
    members[qgMember.id] = { ...members[qgMember.id] as object, status: 'ERROR', error: err.message };
    await saveCouncilState(projectId, { ...state, members, phase: 'COUNCIL_ERROR' });
  }
}

// ── Phase 0.5 (P05-1-001 → P05-2-003, sequential) ────────────────────────────
// Idea Innovator → Scope Strategist → MVP Definer → V2+ Planner → Charter Reviewer
// Each runs only after the previous completes. Output feeds next member.

function buildPhase05Prompt(
  member: typeof PHASE05_MEMBERS[number],
  ideaBrief: Record<string, unknown>,
  previousOutputs: Record<string, string>
): string {
  const prevText = Object.entries(previousOutputs)
    .map(([id, output]) => `=== ${id} OUTPUT ===\n${output}`)
    .join('\n\n');

  return `You are the ${member.title} in LINUP's Phase 0.5 Feature Discovery process.

YOUR MANDATE: ${member.description}

IDEA BRIEF (validated by 13-member Council — APPROVED):
${JSON.stringify(ideaBrief, null, 2)}

${prevText ? 'PREVIOUS PHASE 0.5 OUTPUTS:\n' + prevText : ''}

Produce your complete output now. Be thorough and specific — this feeds directly into the engineering specification.`;
}

async function runPhase05(
  projectId: string,
  ideaBrief: Record<string, unknown>
): Promise<void> {
  const state = await getCouncilState(projectId);
  const phase05State: Record<string, unknown> = {
    phase: 'PHASE05_RUNNING',
    members: Object.fromEntries(
      PHASE05_MEMBERS.map(m => [m.id, { status: 'PENDING', title: m.title }])
    ),
    outputs: {},
    feature_charter: null,
  };

  await saveCouncilState(projectId, {
    ...state,
    phase05: phase05State,
    phase: 'PHASE05_RUNNING',
  });

  const previousOutputs: Record<string, string> = {};

  for (const member of PHASE05_MEMBERS) {
    try {
      // Mark RUNNING
      const s = await getCouncilState(projectId);
      const p05 = s['phase05'] as Record<string, unknown>;
      const members = p05['members'] as Record<string, unknown>;
      members[member.id] = { ...members[member.id] as object, status: 'RUNNING' };
      await saveCouncilState(projectId, { ...s, phase05: { ...p05, members } });

      const prompt = buildPhase05Prompt(member, ideaBrief, previousOutputs);
      const messages = [
        { role: 'system' as const, content: 'You are a specialist in the LINUP Phase 0.5 Feature Discovery team.' },
        { role: 'user' as const, content: prompt },
      ];
      const response = await callAIWithRetry(member.tier as 'S' | 'M' | 'W', messages as any);
      const output = response.choices[0]?.message.content ?? '';

      previousOutputs[member.id] = output;

      // Mark COMPLETE
      const s2 = await getCouncilState(projectId);
      const p05b = s2['phase05'] as Record<string, unknown>;
      const members2 = p05b['members'] as Record<string, unknown>;
      members2[member.id] = { status: 'COMPLETE', title: member.title };
      const outputs = { ...(p05b['outputs'] as Record<string, unknown>), [member.id]: output };

      // If this is the Charter Reviewer (last), mark charter complete
      const isLast = member.id === 'P05-2-003';
      await saveCouncilState(projectId, {
        ...s2,
        phase: isLast ? 'AWAITING_CHARTER_CONFIRMATION' : 'PHASE05_RUNNING',
        phase05: {
          ...p05b,
          members: members2,
          outputs,
          feature_charter: isLast ? output : p05b['feature_charter'],
          phase: isLast ? 'COMPLETE' : 'RUNNING',
        },
      });
    } catch (err: any) {
      const s = await getCouncilState(projectId);
      const p05 = s['phase05'] as Record<string, unknown>;
      const members = p05['members'] as Record<string, unknown>;
      members[member.id] = { status: 'ERROR', error: err.message };
      await saveCouncilState(projectId, {
        ...s,
        phase: 'PHASE05_ERROR',
        phase05: { ...p05, members },
      });
      throw err;
    }
  }
}

// ── Status queries ─────────────────────────────────────────────────────────────

export async function getCouncilStatus(projectId: string): Promise<{
  phase: string;
  members: Record<string, unknown>;
  verdict: string | null;
  conditionalQuestions: string[] | null;
  qualityGate: Record<string, unknown> | null;
}> {
  const state = await getCouncilState(projectId);
  return {
    phase: (state['phase'] as string) ?? 'NOT_STARTED',
    members: (state['members'] as Record<string, unknown>) ?? {},
    verdict: (state['verdict'] as string) ?? null,
    conditionalQuestions: (state['conditional_questions'] as string[]) ?? null,
    qualityGate: (state['quality_gate'] as Record<string, unknown>) ?? null,
  };
}

export async function getPhase05Status(projectId: string): Promise<{
  phase: string;
  members: Record<string, unknown>;
  featureCharter: string | null;
}> {
  const state = await getCouncilState(projectId);
  const phase05 = (state['phase05'] as Record<string, unknown>) ?? {};
  return {
    phase: (state['phase'] as string) ?? 'NOT_STARTED',
    members: (phase05['members'] as Record<string, unknown>) ?? {},
    featureCharter: (phase05['feature_charter'] as string) ?? null,
  };
}

// ── Confirm Feature Charter → queue Stage 1 ───────────────────────────────────
// Per Doc 8D Phase 9: "[Confirm charter →] → Stage 1 begins"
// Sets stage_runs[stage=1].status = 'QUEUED' — worker picks it up automatically.

export async function confirmFeatureCharter(projectId: string): Promise<void> {
  const state = await getCouncilState(projectId);

  if (state['phase'] !== 'AWAITING_CHARTER_CONFIRMATION') {
    throw new Error('Charter not ready for confirmation — current phase: ' + state['phase']);
  }

  // Mark council complete
  await saveCouncilState(projectId, {
    ...state,
    phase: 'COMPLETE',
    charter_confirmed_at: new Date().toISOString(),
  });

  // Mark Stage 0 (Phase 0) as locked on projects row
  await db
    .from('projects')
    .update({
      current_stage: 1,
      status: 'RUNNING',
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  // Lock stage_run for stage 0 and queue stage 1
  await db
    .from('stage_runs')
    .update({ status: 'LOCKED', completed_at: new Date().toISOString() })
    .eq('project_id', projectId)
    .eq('stage', 0);

  await db
    .from('stage_runs')
    .update({ status: 'QUEUED', updated_at: new Date().toISOString() })
    .eq('project_id', projectId)
    .eq('stage', 1);
}
// -- Conditional resubmit (founder answers conditional questions) --------------
// Merges answers into the existing idea_brief, resets council state, re-runs.
export async function handleConditionalResubmit(
  projectId: string,
  answers: Array<{ question: string; selectedOption: string; freeText: string }>
): Promise<void> {
  const state = await getCouncilState(projectId);

  if (state['phase'] !== 'AWAITING_FOUNDER_CONDITIONAL') {
    throw new Error('Not in conditional phase — current phase: ' + state['phase']);
  }

  const existingBrief = (state['idea_brief'] as Record<string, unknown>) ?? {};

  // Build an enriched brief that appends the founder's answers
  const answersText = answers
    .map((a, i) => `Q${i + 1}: ${a.question}\nAnswer: ${a.selectedOption}${a.freeText ? '\nDetail: ' + a.freeText : ''}`)
    .join('\n\n');

  const enrichedBrief: Record<string, unknown> = {
    ...existingBrief,
    founder_conditional_answers: answersText,
    resubmitted_at: new Date().toISOString(),
  };

  // Re-run the full council with the enriched brief
  await confirmIdeaBrief(projectId, enrichedBrief);
}