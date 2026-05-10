import { createClient } from '@supabase/supabase-js';
import { runStage } from './pipeline/index.js';

// ─── Worker (Doc 8E — background pipeline job runner) ────────────────────────
// Polls stage_runs for status QUEUED, calls runStage, handles errors.
// Runs as a separate process alongside the API server.

const POLL_INTERVAL_MS = 5000; // 5 seconds
const MAX_CONCURRENT = 1;      // one stage at a time per worker instance

const db = createClient(
  process.env['SUPABASE_URL'] as string,
  process.env['SUPABASE_SERVICE_ROLE_KEY'] as string
);

let running = 0;

async function claimAndRun(): Promise<void> {
  if (running >= MAX_CONCURRENT) return;

  // Claim one QUEUED stage run atomically
  const { data: claimed, error } = await db
    .from('stage_runs')
    .update({ status: 'RUNNING', worker_claimed_at: new Date().toISOString() })
    .eq('status', 'QUEUED')
    .order('created_at', { ascending: true })
    .limit(1)
    .select('id, project_id, stage')
    .single();

  if (error || !claimed) return; // nothing to claim

  running++;
  const { project_id: projectId, stage } = claimed;
  console.log('[worker] Claimed stage_run — project ' + projectId + ' stage ' + stage);

  try {
    await runStage(projectId, stage, db);
    console.log('[worker] Stage complete — project ' + projectId + ' stage ' + stage);
  } catch (err: any) {
    console.error('[worker] Stage failed — project ' + projectId + ' stage ' + stage + ': ' + err.message);
    await db.from('stage_runs').update({
      status: 'ERROR',
      error_message: err.message,
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

console.log('[worker] Starting — poll interval: ' + POLL_INTERVAL_MS + 'ms');
poll();