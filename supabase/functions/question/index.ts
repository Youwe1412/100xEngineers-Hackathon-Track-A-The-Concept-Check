// POST /question  ({ session_id, seam, seam_sentence })
// The Questioner has NO answer key: it receives only the seam rung name and that
// rung's FORBIDDEN_WORDS. Ask exactly one Socratic question (temperature ~0.4),
// store it as a system turn, and open a gaps row for the seam.
// Returns { gap_id, turn_id, question }.

import { preflight, json } from '../_shared/cors.ts';
import { getAuthedContext } from '../_shared/supabase.ts';
import { groqChat } from '../_shared/groq.ts';
import { questionerSystemPrompt, questionerUserPrompt } from '../_shared/prompts.ts';
import { FORBIDDEN_WORDS } from '../../../src/answerKey.ts';
import type { Criterion } from '../../../src/types.ts';

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
  const seam = body?.seam as Criterion | undefined;
  const seamSentence = body?.seam_sentence ?? null;
  if (!sessionId || !seam || !(seam in FORBIDDEN_WORDS)) {
    return json({ error: 'session_id and a valid seam are required' }, 400);
  }

  // The model sees only the gap name and the words it must steer around.
  let question: string;
  try {
    question = await groqChat({
      system: questionerSystemPrompt(),
      user: questionerUserPrompt(seam, FORBIDDEN_WORDS[seam]),
      temperature: 0.4,
    });
    question = question.trim();
  } catch (err) {
    return json({ error: 'questioner_failed', detail: String(err) }, 502);
  }
  if (!question) {
    return json({ error: 'questioner_empty' }, 502);
  }

  // Open the gap for this seam (audit: rung_name + the seam sentence).
  const { data: gap, error: gapErr } = await supabase
    .from('gaps')
    .insert({
      session_id: sessionId,
      rung_name: seam,
      seam_sentence: seamSentence,
    })
    .select('id')
    .single();
  if (gapErr || !gap) {
    return json({ error: 'gap_insert_failed', detail: gapErr?.message }, 500);
  }

  // Store the question as a system turn (no audio).
  const { data: turn, error: turnErr } = await supabase
    .from('turns')
    .insert({ session_id: sessionId, role: 'system', transcript: question })
    .select('id')
    .single();
  if (turnErr || !turn) {
    return json({ error: 'turn_insert_failed', detail: turnErr?.message }, 500);
  }

  return json({ gap_id: gap.id, turn_id: turn.id, question });
});
