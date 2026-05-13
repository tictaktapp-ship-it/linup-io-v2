const fs = require('fs');
const path = 'E:\\Linup v2\\server\\src\\pipeline\\vp.ts';
let content = fs.readFileSync(path, 'utf8');

// Fix JSON parsing to strip markdown fences
content = content.replace(
  `  const raw = (response.choices[0]?.message.content ?? '').trim();
  const report: VpAnalysisReport = JSON.parse(raw);`,
  `  const rawContent = (response.choices[0]?.message.content ?? '').trim();
  // Strip markdown code fences if present
  const raw = rawContent.replace(/^\`\`\`(?:json)?\\n?/i, '').replace(/\\n?\`\`\`$/i, '').trim();
  const report: VpAnalysisReport = JSON.parse(raw);`
);

if (!content.includes('Strip markdown code fences')) {
  console.error('ERROR: patch not applied'); process.exit(1);
}
fs.writeFileSync(path, content, 'utf8');
console.log('OK: vp.ts strips markdown fences before JSON parse');