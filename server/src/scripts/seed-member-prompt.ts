// server/src/scripts/seed-member-prompt.ts
// Doc 8E — seed script contract
import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';
import { encryptPrompt } from '../utils/crypto.js';

function getArg(args: string[], flag: string): string {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) throw new Error('Missing arg: ' + flag);
  const val = args[idx + 1];
  if (val === undefined) throw new Error('Missing value for arg: ' + flag);
  return val;
}

async function main() {
  const args = process.argv.slice(2);
  const memberId        = getArg(args, '--member-id');
  const title           = getArg(args, '--title');
  const stage           = parseInt(getArg(args, '--stage'), 10);
  const tier            = getArg(args, '--tier') as 'S' | 'M' | 'W';
  const groupId         = getArg(args, '--group-id');
  const isConditional   = getArg(args, '--is-conditional') === '1';
  const conditionDomain = args.includes('--condition-domain') ? getArg(args, '--condition-domain') : null;
  const systemPrompt    = getArg(args, '--system-prompt');
  const outputTemplate  = getArg(args, '--output-template');

  if (!process.env['ENCRYPTION_KEY']) { console.error('ENCRYPTION_KEY not set in .env'); process.exit(1); }
  if (!process.env['SUPABASE_URL']) { console.error('SUPABASE_URL not set in .env'); process.exit(1); }
  if (!process.env['SUPABASE_SERVICE_ROLE_KEY']) { console.error('SUPABASE_SERVICE_ROLE_KEY not set in .env'); process.exit(1); }

  const encryptedSystem   = encryptPrompt(systemPrompt);
  const encryptedTemplate = encryptPrompt(outputTemplate);

  console.log('member_id:          ' + memberId);
  console.log('system_encrypted:   ' + encryptedSystem.length + ' bytes');
  console.log('template_encrypted: ' + encryptedTemplate.length + ' bytes');

  const supabaseUrl = process.env['SUPABASE_URL'] as string;
  const serviceKey  = process.env['SUPABASE_SERVICE_ROLE_KEY'] as string;
  const db = createClient(supabaseUrl, serviceKey);

  const { error } = await db.from('member_prompts').upsert({
    member_id: memberId, title, stage, tier,
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