const fs = require('fs');

const filePath = 'E:\\Linup v2\\frontend\\src\\pages\\app\\CouncilPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add conditional_questions_rich to CouncilState interface
const oldInterface = `  conditional_questions?: string[];
  quality_gate?: { verdict: string; assessment: string; blockedReason: string | null };`;

const newInterface = `  conditional_questions?: string[];
  conditional_questions_rich?: Array<{ question: string; options: string[] }> | null;
  quality_gate?: { verdict: string; assessment: string; blockedReason: string | null };`;

if (!content.includes(oldInterface)) {
  console.error('ERROR: CouncilState interface anchor not found'); process.exit(1);
}
content = content.replace(oldInterface, newInterface);

// 2. Replace the conditional questions map block to use rich questions when available
const oldMap = `                  {councilState.conditional_questions.map((q, i) => {
                    const options = generateConditionalOptions(q);
                    const ans = conditionalAnswers[i] ?? { selected: '', freeText: '' };`;

const newMap = `                  {(councilState.conditional_questions_rich ?? councilState.conditional_questions?.map(q => ({ question: q, options: generateConditionalOptions(q) })) ?? []).map((item, i) => {
                    const q = typeof item === 'string' ? item : item.question;
                    const options = typeof item === 'string' ? generateConditionalOptions(item) : item.options;
                    const ans = conditionalAnswers[i] ?? { selected: '', freeText: '' };`;

if (!content.includes(oldMap)) {
  console.error('ERROR: conditional map anchor not found'); process.exit(1);
}
content = content.replace(oldMap, newMap);

// 3. Update the question display and submit button to use q and item correctly
// The question text display currently uses {i + 1}. {q} — that still works since q is now the question string

// 4. Fix the submit button disabled check and answers builder to use rich length
const oldDisabled = `disabled={resubmitting || Object.keys(conditionalAnswers).length < (councilState.conditional_questions?.length ?? 0)}`;
const newDisabled = `disabled={resubmitting || Object.keys(conditionalAnswers).length < ((councilState.conditional_questions_rich ?? councilState.conditional_questions)?.length ?? 0)}`;

if (!content.includes(oldDisabled)) {
  console.error('ERROR: disabled anchor not found'); process.exit(1);
}
content = content.replace(oldDisabled, newDisabled);

// 5. Fix the answers builder in the onClick to use rich questions for question text
const oldAnswers = `                        const answers = councilState.conditional_questions.map((q, i) => ({
                          question: q,
                          selectedOption: conditionalAnswers[i]?.selected ?? '',
                          freeText: conditionalAnswers[i]?.freeText ?? '',
                        }));`;

const newAnswers = `                        const richQ = councilState.conditional_questions_rich ?? councilState.conditional_questions?.map(q => ({ question: q })) ?? [];
                        const answers = richQ.map((item, i) => ({
                          question: typeof item === 'string' ? item : item.question,
                          selectedOption: conditionalAnswers[i]?.selected ?? '',
                          freeText: conditionalAnswers[i]?.freeText ?? '',
                        }));`;

if (!content.includes(oldAnswers)) {
  console.error('ERROR: answers builder anchor not found'); process.exit(1);
}
content = content.replace(oldAnswers, newAnswers);

fs.writeFileSync(filePath, content, { encoding: 'utf8' });
console.log('CouncilPage.tsx patched OK');