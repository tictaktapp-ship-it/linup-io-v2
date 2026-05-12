const fs = require('fs');
const filePath = 'E:\\Linup v2\\frontend\\src\\pages\\app\\CouncilPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');
let ok = true;

function replace(label, from, to) {
  if (!content.includes(from)) { console.error('ERROR: anchor not found: ' + label); ok = false; return; }
  content = content.replace(from, to);
  console.log('OK: ' + label);
}

// 1. Add conditional_questions_rich to CouncilState interface (lines 35-36)
replace('interface',
  '  conditional_questions?: string[];\n  quality_gate?: { verdict: string; assessment: string; blockedReason: string | null };',
  '  conditional_questions?: string[];\n  conditional_questions_rich?: Array<{ question: string; options: string[] }> | null;\n  quality_gate?: { verdict: string; assessment: string; blockedReason: string | null };'
);

// 2. Update the conditional_questions guard to also check rich (line 538)
replace('uiPhase guard',
  '{uiPhase === \'CONDITIONAL\' && councilState?.conditional_questions && (',
  '{uiPhase === \'CONDITIONAL\' && (councilState?.conditional_questions_rich ?? councilState?.conditional_questions) && ('
);

// 3. Replace the .map() call (line 545) to use rich when available
replace('map call',
  '                  {councilState.conditional_questions.map((q, i) => {\n                    const options = generateConditionalOptions(q);\n                    const ans = conditionalAnswers[i] ?? { selected: \'\', freeText: \'\' };',
  '                  {(councilState.conditional_questions_rich ?? councilState.conditional_questions?.map(q => ({ question: q, options: generateConditionalOptions(q) })) ?? []).map((item, i) => {\n                    const q = (item as any).question ?? item;\n                    const options = (item as any).options ?? generateConditionalOptions(q as string);\n                    const ans = conditionalAnswers[i] ?? { selected: \'\', freeText: \'\' };'
);

// 4. Fix disabled check (line 580)
replace('disabled check',
  'disabled={resubmitting || Object.keys(conditionalAnswers).length < (councilState.conditional_questions?.length ?? 0)}',
  'disabled={resubmitting || Object.keys(conditionalAnswers).length < ((councilState.conditional_questions_rich ?? councilState.conditional_questions)?.length ?? 0)}'
);

// 5. Fix guard inside onClick (line 582)
replace('onClick guard',
  'if (!councilState?.conditional_questions) return;',
  'if (!(councilState?.conditional_questions_rich ?? councilState?.conditional_questions)) return;'
);

// 6. Fix answers builder (lines 585-589)
replace('answers builder',
  '                        const answers = councilState.conditional_questions.map((q, i) => ({',
  '                        const _richQ = councilState.conditional_questions_rich ?? councilState.conditional_questions?.map(q => ({ question: q })) ?? [];\n                        const answers = _richQ.map((item, i) => ({');

replace('answers q field',
  '                          question: q,',
  '                          question: typeof item === \'string\' ? item : (item as any).question,');

if (!ok) process.exit(1);

fs.writeFileSync(filePath, content, { encoding: 'utf8' });
console.log('CouncilPage.tsx patched OK — length: ' + content.length);