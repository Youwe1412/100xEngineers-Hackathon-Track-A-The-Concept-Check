import { createClient } from '@supabase/supabase-js';

// The browser client. It carries auth and storage, and (via functions.invoke)
// attaches the user JWT + anon key to every Edge Function call. Both values are
// public and protected by Row Level Security. No server secret lives here.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anonKey);

if (!isConfigured) {
  // A clear, non-fatal hint during development. The app renders a calm setup
  // notice rather than crashing.
  console.warn(
    'Supabase is not configured. Copy web/.env.example to web/.env and fill in ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  );
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
