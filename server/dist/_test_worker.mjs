import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'set' : 'MISSING');
console.log('SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set (length ' + process.env.SUPABASE_SERVICE_ROLE_KEY.length + ')' : 'MISSING');

const { data, error } = await db
  .from('stage_runs')
  .select('id, project_id, stage, status')
  .eq('status', 'PENDING')
  .order('created_at', { ascending: true })
  .limit(1)
  .single();

console.log('data:', JSON.stringify(data));
console.log('error:', JSON.stringify(error));