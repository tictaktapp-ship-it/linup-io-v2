import { SupabaseClient } from '@supabase/supabase-js';
import { decryptPrompt } from '../utils/crypto.js';

// â”€â”€â”€ Member types (Doc 8E + Charter) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export type MemberTier = 'S' | 'M' | 'W';

export interface Member {
  id: string;           // e.g. 'S1-2-029', 'L-1-001'
  title: string;
  stage: number;
  tier: MemberTier;
  groupId: string;      // e.g. '1G', '2A'
  isConditional: boolean;
  conditionDomain?: string;
}

export interface MemberWithPrompts extends Member {
  systemPrompt: string;    // decrypted at runtime
  outputTemplate: string;  // decrypted at runtime
}

// â”€â”€â”€ loadMember (Doc 8E seed script contract) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Fetches and decrypts prompts for a single member from member_prompts table.
// Prompts are AES-256-GCM encrypted via encryptPrompt() at seed time.
export async function loadMember(memberId: string, db: SupabaseClient): Promise<MemberWithPrompts> {
  const { data, error } = await db
    .from('member_prompts')
    .select('member_id, member_title, stage, model_tier, group_id, is_conditional, condition_domain, prompt_system_encrypted, prompt_template_encrypted')
    .eq('member_id', memberId)
    .single();

  if (error || !data) throw new Error('Member not found in member_prompts: ' + memberId);

  const systemPrompt = decryptPrompt(data.prompt_system_encrypted);
  const outputTemplate = decryptPrompt(data.prompt_template_encrypted);

  return {
    id: data.member_id,
    title: data.member_title,
    stage: data.stage,
    tier: data.model_tier as MemberTier,
    groupId: data.group_id,
    isConditional: data.is_conditional === true,
    conditionDomain: data.condition_domain ?? undefined,
    systemPrompt,
    outputTemplate,
  };
}

// â”€â”€â”€ loadMembersForStage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Loads all IC members for a given stage (excludes VP/EM layer â€” handled separately).
// Optionally filters by domain for conditional members.
export async function loadMembersForStage(stage: number, projectDomain: string | null, db: SupabaseClient): Promise<MemberWithPrompts[]> {
  let query = db.from('member_prompts')
    .select('member_id, title, stage, tier, group_id, is_conditional, condition_domain, prompt_system_encrypted, prompt_template_encrypted')
    .eq('stage', stage)
    .eq('tier', 'W'); // ICs only â€” VPs are Tier M and loaded separately

  const { data, error } = await query;
  if (error) throw new Error('Failed to load members for stage ' + stage + ': ' + error.message);

  const members = (data ?? []).filter((m: any) => {
    if (!m.is_conditional) return true;
    if (!projectDomain) return false; // conditional member requires domain
    return m.condition_domain === projectDomain;
  });

  return members.map((m: any) => ({
    id: m.member_id,
    title: m.title,
    stage: m.stage,
    tier: m.tier as MemberTier,
    groupId: m.group_id,
    isConditional: m.is_conditional === true,
    conditionDomain: m.condition_domain ?? undefined,
    systemPrompt: decryptPrompt(m.prompt_system_encrypted),
    outputTemplate: decryptPrompt(m.prompt_template_encrypted),
  }));
}

// â”€â”€â”€ loadVpForStage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Loads the VP (Tier M) member for a given stage.
export async function loadVpForStage(vpId: string, db: SupabaseClient): Promise<MemberWithPrompts> {
  return loadMember(vpId, db);
}