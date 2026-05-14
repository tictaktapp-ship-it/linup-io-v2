// --- SchemaValidator (Doc 8E step 4, Doc 7A IC execution) ---
// Automated structural validation of IC output — no LLM call.
// Called per IC iteration before VP review.

export interface ValidationResult {
  passed: boolean;
  errors: string[];
}

// Required structural markers — TEMPORARILY DISABLED until IC prompts include these sections
// const UNIVERSAL_REQUIRED_SECTIONS = [
//   'SELF-VERIFICATION',
//   'CONSTRAINT VERIFICATION',
//   'SELF-ASSESSMENT',
//   'Confidence:',
// ];

// Minimum word count for a non-trivial IC output
const MIN_WORD_COUNT = 50;

// Member-specific required sections (keyed by member ID prefix or full ID)
const MEMBER_REQUIRED_SECTIONS: Record<string, string[]> = {
  // Stage 1 examples — populated as prompts are seeded
  // 'S1-2-029': ['FOCUS AREAS', 'CONSTRAINTS'],
};

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// --- validate ---
export async function validate(memberId: string, content: string): Promise<ValidationResult> {
  // Stage 0, Phase 0.5, and VP/EM layer members auto-pass schema
  if (memberId.startsWith('P0-') || memberId.startsWith('P05-') || memberId.startsWith('L-')) {
    if (!content || content.trim().length === 0) return { passed: false, errors: ['Output is empty'] };
    console.log('[schema] Auto-pass for', memberId, '- length:', content.length);
    return { passed: true, errors: [] };
  }

  const errors: string[] = [];

  // 1. Empty output check
  if (!content || content.trim().length === 0) {
    return { passed: false, errors: ['Output is empty'] };
  }

  // 2. Minimum length check
  const wc = wordCount(content);
  if (wc < MIN_WORD_COUNT) {
    errors.push('Output too short: ' + wc + ' words (minimum ' + MIN_WORD_COUNT + ')');
  }

  // 3. Universal required sections — TEMPORARILY DISABLED
  // IC prompts do not yet include SELF-VERIFICATION/CONSTRAINT VERIFICATION/SELF-ASSESSMENT/Confidence:
  // Re-enable once IC prompts are updated to produce these sections.

  // 4. Member-specific required sections
  const memberSections = getMemberRequiredSections(memberId);
  for (const section of memberSections) {
    if (!content.includes(section)) {
      errors.push('Missing member-specific section: ' + section);
    }
  }

  return { passed: errors.length === 0, errors };
}

// --- getMemberRequiredSections ---
function getMemberRequiredSections(memberId: string): string[] {
  if (MEMBER_REQUIRED_SECTIONS[memberId]) return MEMBER_REQUIRED_SECTIONS[memberId];
  const stagePrefix = memberId.split('-')[0];
  return MEMBER_REQUIRED_SECTIONS[stagePrefix as string] ?? [];
}

// --- registerMemberSections ---
export function registerMemberSections(memberId: string, sections: string[]): void {
  MEMBER_REQUIRED_SECTIONS[memberId] = sections;
}