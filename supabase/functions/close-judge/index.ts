// POST /close-judge
//   ({ session_id, gap_id, seam, question, second_attempt_turn_id,
//     second_attempt_transcript })
// Decide real_close vs fake_close on the second attempt (temperature 0), record a
// closes row linked to the gap, then feed the verdict to the deterministic engine
// (recordClose) which advances the seam or counts the attempt. The 2-attempt hard
// cap lives in the engine (probeAttempts >= 2 -> stop_unresolved); no counter here.
// Returns { result, reason, action }.

import { preflight, json } from '../_shared/cors.ts';
import { getAuthedContext } from '../_shared/supabase.ts';
import { groqChat, parseFinalJson } from '../_shared/groq.ts';
import { closeJudgeSystemPrompt, closeJudgeUserPrompt } from '../_shared/prompts.ts';
import { recordClose } from '../../../src/engine.ts';
import type { CloseVerdict, Session } from '../../../src/types.ts';

interface JudgeVerdict {
  result: CloseVerdict;
  reason: string;
}

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

  const body = await req.json().catch(() => null);
  const sessionId = body?.session_id;
  const gapId = body?.gap_id;
  const seam = body?.seam;
  const question = body?.question;
  const secondAttemptTurnId = body?.second_attempt_turn_id ?? null;
  const transcript = body?.second_attempt_transcript;
  if (!sessionId || !gapId || !seam || typeof transcript !== 'string') {
    return json(
      { error: 'session_id, gap_id, seam and second_attempt_transcript are required' },
      400,
    );
  }

  // Load persisted engine state (RLS-scoped).
  const { data: sessionRow, error: loadErr } = await supabase
    .from('sessions')
    .select('state')
    .eq('id', sessionId)
    .single();
  if (loadErr || !sessionRow?.state) {
    return json({ error: 'session_not_found', detail: loadErr?.message }, 404);
  }
  const state = sessionRow.state as Session;

  // Judge the close. Parse failure defaults to fake_close so a broken verdict can
  // never falsely advance the learner.
  let verdict: JudgeVerdict = { result: 'fake_close', reason: 'parse_failed' };
  try {
    const content = await groqChat({
      system: closeJudgeSystemPrompt,
      user: closeJudgeUserPrompt(seam, question ?? '', transcript),
      temperature: 0,
    });
    const parsed = parseFinalJson<JudgeVerdict>(content);
    if (parsed && (parsed.result === 'real_close' || parsed.result === 'fake_close')) {
      verdict = { result: parsed.result, reason: String(parsed.reason ?? '') };
    }
  } catch (err) {
    verdict = { result: 'fake_close', reason: `groq_error: ${String(err)}` };
  }

  // Audit: persist the verdict + reason linked to the gap.
  const { error: closeErr } = await supabase.from('closes').insert({
    gap_id: gapId,
    second_attempt_turn_id: secondAttemptTurnId,
    result: verdict.result,
    reason: verdict.reason,
  });
  if (closeErr) {
    return json({ error: 'close_insert_failed', detail: closeErr.message }, 500);
  }

  // Deterministic transition.
  const { state: newState, action } = recordClose(state, verdict.result);
  await supabase
    .from('sessions')
    .update({
      state: newState,
      highest_rung_reached: newState.highestRungReached,
      is_complete: newState.isComplete,
    })
    .eq('id', sessionId);

  return json({ result: verdict.result, reason: verdict.reason, action });
});
