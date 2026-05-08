import { createClient } from '@supabase/supabase-js';

export const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // service role — bypasses RLS
);

// Alias used by auth middleware and API routes
export const supabase = db;