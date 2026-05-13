const fs = require('fs');
const path = 'E:\\Linup v2\\server\\src\\pipeline\\schema.ts';
let content = fs.readFileSync(path, 'utf8');

// Add Stage 0 bypass at top of validate()
const oldValidate = `export async function validate(memberId: string, content: string): Promise<ValidationResult> {
  const errors: string[] = [];

  // 1. Empty output check
  if (!content || content.trim().length === 0) {
    return { passed: false, errors: ['Output is empty'] };
  }`;

const newValidate = `export async function validate(memberId: string, content: string): Promise<ValidationResult> {
  const errors: string[] = [];

  // Stage 0 bypass: skip schema validation for P0-* members (pipeline flow validation)
  if (memberId.startsWith('P0-')) {
    if (!content || content.trim().length === 0) {
      return { passed: false, errors: ['Output is empty'] };
    }
    console.log('[schema] Stage 0 bypass for', memberId, '— auto-pass, length:', content.length);
    return { passed: true, errors: [] };
  }

  // 1. Empty output check
  if (!content || content.trim().length === 0) {
    return { passed: false, errors: ['Output is empty'] };
  }`;

if (!content.includes(oldValidate)) { console.error('ERROR: anchor not found'); process.exit(1); }
content = content.replace(oldValidate, newValidate);
fs.writeFileSync(path, content, 'utf8');
console.log('OK: Stage 0 schema bypass added for P0-* members');