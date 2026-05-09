// â”€â”€â”€ SchemaValidator (Doc 8E step 4, Doc 7A IC execution) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Automated structural validation of IC output â€” no LLM call.
// Called per IC iteration before VP review.

export interface ValidationResult {
  passed: boolean;
  errors: string[];
}

// Required structural markers present in every IC output
const UNIVERSAL_REQUIRED_SECTIONS = [
  'SELF-VERIFICATION',
  'CONSTRAINT VERIFICATION',
  'SELF-ASSESSMENT',
  'Confidence:',
];

// Minimum word count for a non-trivial IC output
const MIN_WORD_COUNT = 50;

// Member-specific required sections (keyed by member ID prefix or full ID)
// Extend this map as prompts are seeded per stage
const MEMBER_REQUIRED_SECTIONS: Record<string, string[]> = {
  // Stage 1 examples â€” populated as prompts are seeded
  // 'S1-2-029': ['FOCUS AREAS', 'CONSTRAINTS'],
};

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// â”€â”€â”€ validate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function validate(memberId: string, content: string): Promise<ValidationResult> {
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

  // 3. Universal required sections
  for (const section of UNIVERSAL_REQUIRED_SECTIONS) {
    if (!content.includes(section)) {
      errors.push('Missing required section: ' + section);
    }
  }

  // 4. Member-specific required sections
  const memberSections = getMemberRequiredSections(memberId);
  for (const section of memberSections) {
    if (!content.includes(section)) {
      errors.push('Missing member-specific section: ' + section);
    }
  }

  // 5. Self-assessment must be COMPLETE or PARTIAL â€” not blank
  const selfAssessmentMatch = content.match(/SELF-ASSESSMENT:\s*(COMPLETE|PARTIAL|[^\n]+)/);
  if (selfAssessmentMatch && selfAssessmentMatch[1] !== undefined) {
    const value = selfAssessmentMatch[1].trim();
    if (value !== 'COMPLETE' && value !== 'PARTIAL') {
      errors.push('SELF-ASSESSMENT must be COMPLETE or PARTIAL, got: ' + value);
    }
  }

  // 6. Confidence must be HIGH, MEDIUM, or LOW
  const confidenceMatch = content.match(/Confidence:\s*(HIGH|MEDIUM|LOW|[^\n]+)/);
  if (confidenceMatch && confidenceMatch[1] !== undefined) {
    const value = confidenceMatch[1].trim();
    if (!['HIGH', 'MEDIUM', 'LOW'].includes(value)) {
      errors.push('Confidence must be HIGH, MEDIUM, or LOW, got: ' + value);
    }
  }

  return { passed: errors.length === 0, errors };
}

// â”€â”€â”€ getMemberRequiredSections â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Returns member-specific required sections.
// Checks full member ID first, then stage prefix (e.g. 'S1' for stage 1 members)
function getMemberRequiredSections(memberId: string): string[] {
  if (MEMBER_REQUIRED_SECTIONS[memberId]) return MEMBER_REQUIRED_SECTIONS[memberId];
  // Check stage-level prefix (e.g. S1, S2)
  const stagePrefix = memberId.split('-')[0];
  return MEMBER_REQUIRED_SECTIONS[stagePrefix as string] ?? [];
}

// â”€â”€â”€ registerMemberSections â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Called during prompt seeding to register member-specific required sections.
// Allows schema validation to be extended per stage without code changes.
export function registerMemberSections(memberId: string, sections: string[]): void {
  MEMBER_REQUIRED_SECTIONS[memberId] = sections;
}