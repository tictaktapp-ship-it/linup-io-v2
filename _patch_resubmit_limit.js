const fs = require('fs');
const filePath = 'E:\\Linup v2\\server\\src\\pipeline\\council.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update handleConditionalResubmit to track resubmission count
content = content.replace(
  `  const enrichedBrief: Record<string, unknown> = {
    ...existingBrief,
    founder_conditional_answers: answersText,
    resubmitted_at: new Date().toISOString(),
  };
  // Re-run the full council with the enriched brief
  await confirmIdeaBrief(projectId, enrichedBrief);`,
  `  const currentCount = (existingBrief['resubmission_count'] as number) ?? 0;
  const newCount = currentCount + 1;

  const enrichedBrief: Record<string, unknown> = {
    ...existingBrief,
    founder_conditional_answers: answersText,
    resubmission_count: newCount,
    // After 2 resubmissions, force the Quality Gate to approve
    force_approve: newCount >= 2,
    resubmitted_at: new Date().toISOString(),
  };
  // Re-run the full council with the enriched brief
  await confirmIdeaBrief(projectId, enrichedBrief);`
);

// 2. Update buildQualityGatePrompt to respect force_approve flag
content = content.replace(
  `  const founderAnswers = ideaBrief['founder_conditional_answers'] as string | undefined;
  const resubmissionSection = founderAnswers
    ? \`\\nRESUBMISSION CONTEXT:
This is a resubmission. The founder has already received CONDITIONAL questions from a previous Council run and has now provided answers. Their answers are included in the Idea Brief above under "founder_conditional_answers".

CRITICAL RESUBMISSION RULES:
- You MUST read the founder's answers before evaluating the specialist verdicts
- If the founder's answers genuinely address the conditions raised, you MUST return APPROVED or at most one remaining CONDITIONAL question
- Do NOT repeat questions the founder has already answered
- Only return CONDITIONAL if there are genuinely NEW unresolved direction questions not addressed by the founder's answers\\n\`
    : '';`,
  `  const founderAnswers = ideaBrief['founder_conditional_answers'] as string | undefined;
  const forceApprove = ideaBrief['force_approve'] as boolean | undefined;
  const resubmissionCount = (ideaBrief['resubmission_count'] as number) ?? 0;

  const resubmissionSection = forceApprove
    ? \`\\nFINAL ROUND MANDATE:
This founder has now gone through \${resubmissionCount} rounds of conditional questions. This is the FINAL review.
You MUST return QUALITY_GATE_VERDICT: APPROVED regardless of any remaining gaps.
Any unresolved questions must go into RESEARCH_BRIEF for the engineering team to handle during the build.
The founder has provided sufficient direction. It is now the engineering team's job to fill in the gaps.
Do NOT return CONDITIONAL. Do NOT ask more questions. APPROVE and move forward.\\n\`
    : founderAnswers
    ? \`\\nRESUBMISSION CONTEXT:
This is a resubmission. The founder has already received CONDITIONAL questions from a previous Council run and has now provided answers. Their answers are included in the Idea Brief above under "founder_conditional_answers".

CRITICAL RESUBMISSION RULES:
- You MUST read the founder's answers before evaluating the specialist verdicts
- If the founder's answers genuinely address the conditions raised, you MUST return APPROVED or at most one remaining CONDITIONAL question
- Do NOT repeat questions the founder has already answered
- Only return CONDITIONAL if there are genuinely NEW unresolved direction questions not addressed by the founder's answers\\n\`
    : '';`
);

if (!content.includes('force_approve')) {
  console.error('ERROR: patches not applied'); process.exit(1);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('OK: resubmission limit added. Force approve after 2 rounds.');