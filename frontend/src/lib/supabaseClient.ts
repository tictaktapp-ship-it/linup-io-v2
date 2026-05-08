import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: {
        // Use cookies instead of localStorage — prevents XSS token theft
        getItem: (key) => document.cookie.match(`(^|;)\\s*${key}=([^;]+)`)?.pop() ?? null,
        setItem: (key, value) => { document.cookie = `${key}=${value};path=/;SameSite=Lax;Secure`; },
        removeItem: (key) => { document.cookie = `${key}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT`; },
      }
    }
  }
);
