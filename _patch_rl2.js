const fs = require('fs');
const filePath = 'E:\\Linup v2\\server\\src\\pipeline\\council.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Patch handleConditionalResubmit - find enrichedBrief by unique anchor
const anchor1 = "    founder_conditional_answers: answersText,\n    resubmitted_at: new Date().toISOString(),\n  };\n  // Re-run the full council with the enriched brief\n  await confirmIdeaBrief(projectId, enrichedBrief);";

if (!content.includes(anchor1)) {
  // Try to find what is actually there
  const idx = content.indexOf('founder_conditional_answers: answersText');
  console.log('founder_conditional_answers at index:', idx);
  if (idx > 0) console.log('Context:', JSON.stringify(content.substring(idx - 10, idx + 200)));
  console.log('ERROR: anchor1 not found');
  process.exit(1);
}

content = content.replace(anchor1,
  `    founder_conditional_answers: answersText,
    resubmission_count: ((existingBrief['resubmission_count'] as number) ?? 0) + 1,
    force_approve: (((existingBrief['resubmission_count'] as number) ?? 0) + 1) >= 2,
    resubmitted_at: new Date().toISOString(),
  };
  // Re-run the full council with the enriched brief
  await confirmIdeaBrief(projectId, enrichedBrief);`
);
console.log('OK: enrichedBrief patched');

// 2. Patch buildQualityGatePrompt - add forceApprove check
const anchor2 = "  const founderAnswers = ideaBrief['founder_conditional_answers'] as string | undefined;\n  const resubmissionSection = founderAnswers";

if (!content.includes(anchor2)) {
  console.error('ERROR: anchor2 not found');
  process.exit(1);
}

content = content.replace(anchor2,
  `  const founderAnswers = ideaBrief['founder_conditional_answers'] as string | undefined;
  const forceApprove = ideaBrief['force_approve'] as boolean | undefined;
  const resubmissionCount = (ideaBrief['resubmission_count'] as number) ?? 0;
  const resubmissionSection = forceApprove
    ? \`\\nFINAL ROUND MANDATE: This founder has completed \${resubmissionCount} rounds of conditional questions. You MUST return QUALITY_GATE_VERDICT: APPROVED. Do NOT return CONDITIONAL. Put any remaining gaps in RESEARCH_BRIEF for the engineering team.\\n\`
    : founderAnswers`
);
console.log('OK: buildQualityGatePrompt patched with forceApprove');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done. force_approve present:', content.includes('force_approve'));