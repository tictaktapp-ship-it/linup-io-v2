import { createClient } from '@supabase/supabase-js';
import { runStage } from './pipeline/index.js';

// --- Worker (Doc 8E - background pipeline job runner) ---
// Polls stage_runs for status PENDING, claims them, calls runStage.
// Two-step claim: SELECT oldest PENDING row, then UPDATE by id.
// (Supabase JS client does not support .limit() on UPDATE operations)

const POLL_INTERVAL_MS = 5000;
const MAX_CONCURRENT = 1;

const db = createClient(
  process.env['SUPABASE_URL'] as string,
  process.env['SUPABASE_SERVICE_ROLE_KEY'] as string
);

let running = 0;

async function claimAndRun(): Promise<void> {
  if (running >= MAX_CONCURRENT) return;

  // Step 1: Find oldest PENDING stage run
  const { data: candidate, error: findError } = await db
    .from('stage_runs')
    .select('id, project_id, stage')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (findError || !candidate) return;

  // Step 2: Claim it by id (guard against race condition)
  const { error: claimError } = await db
    .from('stage_runs')
    .update({ status: 'PROCEEDING', updated_at: new Date().toISOString() })
    .eq('id', candidate.id)
    .eq('status', 'PENDING');

  if (claimError) return;

  running++;
  const { project_id: projectId, stage } = candidate;
  console.log('[worker] Claimed stage_run - project ' + projectId + ' stage ' + stage);

  try {
    await runStage(projectId, stage, db);
    console.log('[worker] Stage complete - project ' + projectId + ' stage ' + stage);
  } catch (err: any) {
    console.error('[worker] Stage failed - project ' + projectId + ' stage ' + stage + ': ' + err.message);
    await db.from('stage_runs').update({
      status: 'API_ERROR',
      updated_at: new Date().toISOString(),
    }).eq('project_id', projectId).eq('stage', stage);
  } finally {
    running--;
  }
}

async function poll(): Promise<void> {
  try {
    await claimAndRun();
  } catch (err: any) {
    console.error('[worker] Poll error: ' + err.message);
  }
  setTimeout(poll, POLL_INTERVAL_MS);
}

console.log('[worker] Starting - poll interval: ' + POLL_INTERVAL_MS + 'ms');
poll();

export function startWorker(): void {
  setInterval(claimAndRun, POLL_INTERVAL_MS);
  claimAndRun();
}
