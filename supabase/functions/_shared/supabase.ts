// User-scoped Supabase client built from the caller's Authorization header.
// Every DB write and storage upload goes through THIS client so RLS enforces
// ownership (sessions.user_id = auth.uid(), audio bucket keyed on the uid prefix).
// The service role key is never used here.

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export interface AuthedContext {
  supabase: SupabaseClient;
  uid: string;
}

// Build a request-scoped client and resolve the caller. Throws on missing/invalid
// auth so handlers can map it to a 401.
export async function getAuthedContext(req: Request): Promise<AuthedContext> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Response('Missing Authorization header', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Response('Invalid or expired token', { status: 401 });
  }

  return { supabase, uid: user.id };
}
