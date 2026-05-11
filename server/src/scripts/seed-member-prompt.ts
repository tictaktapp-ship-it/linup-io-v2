// server/src/scripts/seed-member-prompt.ts
// Doc 8E - seed script contract
// Supports --system-prompt-file and --output-template-file for large prompts
// Polyfill fetch for environments where native fetch fails (TLS/proxy issues)
import fetch from 'node-fetch';
(globalThis as any).fetch = fetch;
import { createClient } from '@supabase/supabase-js';
import { encryptPrompt } from '../utils/crypto.js';
import { readFileSync } from 'fs';

function getArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

function requireArg(args: string[], flag: string): string {
  const val = getArg(args, flag);
  if (val === undefined) throw new Error('Missing required arg: ' + flag);
  return val;
}

async function main() {
  const args = process.argv.slice(2);
  const memberId        = requireArg(args, '--member-id');
  const title           = requireArg(args, '--title');
  const stage           = parseInt(requireArg(args, '--stage'), 10);
  const tier            = requireArg(args, '--tier') as 'S' | 'M' | 'W';
  const groupId         = requireArg(args, '--group-id');
  const isConditional   = requireArg(args, '--is-conditional') === '1';
  const conditionDomain = getArg(args, '--condition-domain') ?? null;

  const systemPromptFile   = getArg(args, '--system-prompt-file');
  const outputTemplateFile = getArg(args, '--output-template-file');
  const systemPromptInline   = getArg(args, '--system-prompt');
  const outputTemplateInline = getArg(args, '--output-template');

  const systemPrompt   = systemPromptFile   ? readFileSync(systemPromptFile, 'utf8')   : (systemPromptInline   ?? '');
  const outputTemplate = outputTemplateFile ? readFileSync(outputTemplateFile, 'utf8') : (outputTemplateInline ?? '');

  if (!systemPrompt)   { console.error('No system prompt provided'); process.exit(1); }
  if (!outputTemplate) { console.error('No output template provided'); process.exit(1); }
  if (!process.env['ENCRYPTION_KEY']) { console.error('ENCRYPTION_KEY not set'); process.exit(1); }
  if (!process.env['SUPABASE_URL']) { console.error('SUPABASE_URL not set'); process.exit(1); }
  if (!process.env['SUPABASE_SERVICE_ROLE_KEY']) { console.error('SUPABASE_SERVICE_ROLE_KEY not set'); process.exit(1); }

  const encryptedSystem   = encryptPrompt(systemPrompt);
  const encryptedTemplate = encryptPrompt(outputTemplate);

  console.log('member_id:          ' + memberId);
  console.log('system_encrypted:   ' + encryptedSystem.length + ' bytes');
  console.log('template_encrypted: ' + encryptedTemplate.length + ' bytes');

  const db = createClient(process.env['SUPABASE_URL'] as string, process.env['SUPABASE_SERVICE_ROLE_KEY'] as string);

  const { error } = await db.from('member_prompts').upsert({
    member_id: memberId, member_title: title, stage, model_tier: tier, output_schema: {},
    group_id: groupId, is_conditional: isConditional, condition_domain: conditionDomain,
    prompt_system_encrypted: encryptedSystem,
    prompt_template_encrypted: encryptedTemplate,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'member_id' });

  if (error) { console.error('Upsert failed: ' + error.message); process.exit(1); }
  console.log('Seeded: ' + memberId + ' at ' + new Date().toISOString());
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });