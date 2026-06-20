// POST /session
// Create a sessions row (RLS sets user_id = auth.uid()), initialise the engine
// Session via createSession(), and persist it to sessions.state. Returns the id.

import { preflight, json } from '../_shared/cors.ts';
import { getAuthedContext } from '../_shared/supabase.ts';
import { createSession } from '../../../src/engine.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let ctx;
  try {
    ctx = await getAuthedContext(req);
  } catch (resp) {
    return resp as Response;
  }
  const { supabase } = ctx;

  // Insert first so the DB mints the id, then build engine state around it.
  const { data: row, error: insertErr } = await supabase
    .from('sessions')
    .insert({ highest_rung_reached: 'prestructural', is_complete: false })
    .select('id')
    .single();

  if (insertErr || !row) {
    return json({ error: 'session_insert_failed', detail: insertErr?.message }, 500);
  }

  const state = createSession(row.id);
  const { error: stateErr } = await supabase
    .from('sessions')
    .update({ state })
    .eq('id', row.id);

  if (stateErr) {
    return json({ error: 'session_state_failed', detail: stateErr.message }, 500);
  }

  return json({ session_id: row.id });
});
