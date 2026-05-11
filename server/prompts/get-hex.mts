import { encryptPrompt } from './src/utils/crypto.js';
import { readFileSync } from 'fs';
const sys = readFileSync('prompts/S1-2-029-system.txt', 'utf8');
const tpl = readFileSync('prompts/S1-2-029-template.txt', 'utf8');
const encSys = encryptPrompt(sys);
const encTpl = encryptPrompt(tpl);
console.log('SYS_HEX:' + encSys.toString('hex'));
console.log('TPL_HEX:' + encTpl.toString('hex'));