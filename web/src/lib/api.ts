// Typed wrappers over the five Edge Functions. Every call goes through
// supabase.functions.invoke, which attaches the user JWT (Authorization) and the
// anon key automatically, so RLS scopes all writes to the signed-in user. The Groq
// key never crosses this boundary; only transcripts and verdicts do.

import { supabase } from './supabase.ts';
import type {
  CloseJudgeResponse,
  Criterion,
  QuestionResponse,
  SessionResponse,
  TranscribeResponse,
  VerifyResponse,
} from './types.ts';

// Invoke a function and surface the backend's own { error } / { detail } message
// when a call fails, so the calm error screen can say something true.
async function callFn<T>(
  name: string,
  body: Record<string, unknown> | FormData,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) {
    let detail = error.message;
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const parsed = (await context.clone().json()) as {
          error?: string;
          detail?: string;
        };
        detail = parsed.error ?? parsed.detail ?? detail;
      } catch {
        // keep the original message
      }
    }
    throw new Error(detail);
  }
  if (data == null) {
    throw new Error(`Empty response from ${name}`);
  }
  return data;
}

// POST /session -> a fresh session id with engine state persisted server-side.
export function createSession(): Promise<SessionResponse> {
  return callFn<SessionResponse>('session', {});
}

// POST /transcribe -> upload the recording, get back the raw transcript and turn.
export function transcribe(
  audio: Blob,
  sessionId: string,
): Promise<TranscribeResponse> {
  // The backend checks `audio instanceof File`, so wrap the MediaRecorder Blob.
  const file = new File([audio], 'audio.webm', {
    type: audio.type || 'audio/webm',
  });
  const form = new FormData();
  form.append('audio', file);
  form.append('session_id', sessionId);
  return callFn<TranscribeResponse>('transcribe', form);
}

// POST /verify -> grade the five criteria, run the engine, return seam + action.
export function verify(
  sessionId: string,
  turnId: string,
  transcript: string,
): Promise<VerifyResponse> {
  return callFn<VerifyResponse>('verify', {
    session_id: sessionId,
    turn_id: turnId,
    transcript,
  });
}

// POST /question -> one Socratic question for the seam, plus a new gap id.
export function askQuestion(
  sessionId: string,
  seam: Criterion,
  seamSentence: string | null,
): Promise<QuestionResponse> {
  return callFn<QuestionResponse>('question', {
    session_id: sessionId,
    seam,
    seam_sentence: seamSentence,
  });
}

// POST /close-judge -> real_close vs fake_close on the answer, plus next action.
export function closeJudge(args: {
  sessionId: string;
  gapId: string;
  seam: Criterion;
  question: string;
  secondAttemptTurnId: string | null;
  transcript: string;
}): Promise<CloseJudgeResponse> {
  return callFn<CloseJudgeResponse>('close-judge', {
    session_id: args.sessionId,
    gap_id: args.gapId,
    seam: args.seam,
    question: args.question,
    second_attempt_turn_id: args.secondAttemptTurnId,
    second_attempt_transcript: args.transcript,
  });
}

// Text fallback: insert a learner turn directly (RLS permits owner inserts on
// turns) so a typed answer has the same turn_id contract as a spoken one.
export async function insertLearnerTurn(
  sessionId: string,
  transcript: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('turns')
    .insert({ session_id: sessionId, role: 'learner', transcript })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? 'Could not save your typed answer.');
  }
  return data.id as string;
}
