// POST /verify  ({ session_id, turn_id, transcript })
// Grade each criterion in a SEPARATE Groq call (atomic, no halo effect), assemble
// the five booleans into a VerifierResult, run it through the deterministic engine
// (computeSeam -> applyVerifier -> nextAction), persist the new engine state, log
// every verdict to turns.verifier_log, and return the audit object + next action.

import { preflight, json } from '../_shared/cors.ts';
import { getAuthedContext } from '../_shared/supabase.ts';
import { groqChat, parseFinalJson } from '../_shared/groq.ts';
import { verifierSystemPrompt } from '../_shared/prompts.ts';
import { applyVerifier, computeSeam, nextAction } from '../../../src/engine.ts';
import { CRITERION_LADDER, PILLAR_CRITERIA } from '../../../src/answerKey.ts';
import type { Criterion, Session, VerifierResult } from '../../../src/types.ts';

interface CriterionVerdict {
  present: boolean;
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
  const turnId = body?.turn_id;
  const transcript = body?.transcript;
  if (!sessionId || !turnId || typeof transcript !== 'string') {
    return json({ error: 'session_id, turn_id and transcript are required' }, 400);
  }

  // Load the persisted engine state (RLS scopes this to the caller's session).
  const { data: sessionRow, error: loadErr } = await supabase
    .from('sessions')
    .select('state')
    .eq('id', sessionId)
    .single();
  if (loadErr || !sessionRow?.state) {
    return json({ error: 'session_not_found', detail: loadErr?.message }, 404);
  }
  const state = sessionRow.state as Session;

  // One atomic Groq call per criterion, temperature 0. Parse each safely; a parse
  // failure defaults to present:false so a missing verdict cannot fake a pass.
  const log: Record<string, CriterionVerdict> = {};
  for (const criterion of CRITERION_LADDER) {
    let verdict: CriterionVerdict = { present: false, reason: 'parse_failed' };
    try {
      const content = await groqChat({
        system: verifierSystemPrompt(criterion),
        user: transcript,
        temperature: 0,
      });
      const parsed = parseFinalJson<CriterionVerdict>(content);
      if (parsed && typeof parsed.present === 'boolean') {
        verdict = { present: parsed.present, reason: String(parsed.reason ?? '') };
      }
    } catch (err) {
      verdict = { present: false, reason: `groq_error: ${String(err)}` };
    }
    log[criterion] = verdict;
  }

  const verifierResult: VerifierResult = {
    relational_core: log.relational_core.present,
    common_language: log.common_language.present,
    rules: log.rules.present,
    protocol: log.protocol.present,
    contract: log.contract.present,
  };

  // Deterministic spine: the engine, not the model, decides the seam and action.
  const { highestRungReached, seam } = computeSeam(verifierResult);
  const newState = applyVerifier(state, verifierResult);
  const action = nextAction(newState);

  // Persist engine state + denormalised summary columns.
  await supabase
    .from('sessions')
    .update({
      state: newState,
      highest_rung_reached: newState.highestRungReached,
      is_complete: newState.isComplete,
    })
    .eq('id', sessionId);

  // Audit: store all five verdicts on the graded learner turn.
  await supabase.from('turns').update({ verifier_log: log }).eq('id', turnId);

  const pillarsPresent = PILLAR_CRITERIA.filter((p) => verifierResult[p]);
  const pillarsMissing = PILLAR_CRITERIA.filter((p) => !verifierResult[p]);
  // The seam sentence is the failed criterion's own reason: where derivation
  // stopped and recitation began.
  const seamSentence = seam ? log[seam].reason : null;

  return json({
    verifier: {
      relational_core: verifierResult.relational_core,
      pillars_present: pillarsPresent,
      pillars_missing: pillarsMissing,
      highest_rung: highestRungReached,
      seam,
      seam_sentence: seamSentence,
    },
    action,
  });
});
