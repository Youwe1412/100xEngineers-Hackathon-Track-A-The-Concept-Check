// The client controller. It orchestrates the call sequence only; it never decides
// pedagogical state. The engine inside the Edge Functions owns all understanding
// logic. This hook reads action.type / verifier / result purely to choose the next
// fetch and what to render, and it keeps a single calm vertical thread of turns.

import { useCallback, useRef, useState } from 'react';
import {
  askQuestion,
  closeJudge,
  createSession,
  insertLearnerTurn,
  transcribe,
  verify,
} from '../lib/api.ts';
import { reflectionLead } from '../lib/rungCopy.ts';
import type { Criterion, SoloRung } from '../lib/types.ts';

export const OPENING_PROMPT =
  'Explain what an interface is and why it exists, in your own words, with an example.';

// What is on screen. Recording itself is a visual handled by the recorder hook;
// these phases describe the larger flow.
export type Phase =
  | 'opening' // ready to record the first explanation
  | 'transcribing' // turning speech into text
  | 'verifying' // grading the explanation
  | 'reflecting' // naming the seam, then forming a question
  | 'awaiting_answer' // a single question is open, ready to answer
  | 'judging' // checking whether the gap closed
  | 'diagnosis' // terminal: the finding
  | 'error';

export type TurnKind = 'speech' | 'reflection' | 'question';

export interface Turn {
  id: string;
  role: 'learner' | 'system';
  kind: TurnKind;
  text: string;
}

export type DiagnosisOutcome = 'derived_unprompted' | 'closed' | 'did_not_close';

export interface Diagnosis {
  outcome: DiagnosisOutcome;
  seam: Criterion | null;
  seamSentence: string | null;
  question: string | null;
  highestRung: SoloRung;
}

export interface DiagnosticState {
  phase: Phase;
  thread: Turn[];
  diagnosis: Diagnosis | null;
  busy: boolean;
  error: string | null;
  ready: boolean; // a session exists and the opening can begin
}

let turnSeq = 0;
function makeTurn(role: Turn['role'], kind: TurnKind, text: string): Turn {
  turnSeq += 1;
  return { id: `t${turnSeq}`, role, kind, text };
}

export function useDiagnostic() {
  const [state, setState] = useState<DiagnosticState>({
    phase: 'opening',
    thread: [],
    diagnosis: null,
    busy: false,
    error: null,
    ready: false,
  });

  // Live ids. Refs, because the loop reads them across awaits without re-renders.
  const sessionIdRef = useRef<string | null>(null);
  const gapIdRef = useRef<string | null>(null);
  const seamRef = useRef<Criterion | null>(null);
  const questionRef = useRef<string | null>(null);
  const highestRungRef = useRef<SoloRung>('prestructural');
  // The first wall named. Used for the diagnosis headline (the dominant case).
  const primarySeamRef = useRef<Criterion | null>(null);
  const primarySeamSentenceRef = useRef<string | null>(null);

  const patch = useCallback((next: Partial<DiagnosticState>) => {
    setState((prev) => ({ ...prev, ...next }));
  }, []);

  const pushTurn = useCallback((turn: Turn) => {
    setState((prev) => ({ ...prev, thread: [...prev.thread, turn] }));
  }, []);

  const fail = useCallback((message: string) => {
    patch({ phase: 'error', busy: false, error: message });
  }, [patch]);

  // Create the session up front so the opening can begin. Idempotent per mount.
  const begin = useCallback(async () => {
    if (sessionIdRef.current) {
      patch({ ready: true });
      return;
    }
    try {
      const { session_id } = await createSession();
      sessionIdRef.current = session_id;
      patch({ ready: true, phase: 'opening', error: null });
    } catch (err) {
      fail(messageFrom(err));
    }
  }, [patch, fail]);

  // Turn a recorded answer into a transcript and a turn id, pushing it as a
  // learner turn. Used by both the opening and the answers.
  const ingestVoice = useCallback(
    async (blob: Blob): Promise<{ turnId: string; transcript: string }> => {
      const sessionId = sessionIdRef.current as string;
      const { turn_id, transcript } = await transcribe(blob, sessionId);
      pushTurn(makeTurn('learner', 'speech', transcript));
      return { turnId: turn_id, transcript };
    },
    [pushTurn],
  );

  const ingestText = useCallback(
    async (text: string): Promise<{ turnId: string; transcript: string }> => {
      const sessionId = sessionIdRef.current as string;
      const turnId = await insertLearnerTurn(sessionId, text);
      pushTurn(makeTurn('learner', 'speech', text));
      return { turnId, transcript: text };
    },
    [pushTurn],
  );

  // After /verify or /close-judge advances the engine to a new seam (or re-probes
  // the same one), ask a single question and open the next answer.
  const openQuestionFor = useCallback(
    async (seam: Criterion, seamSentence: string | null) => {
      const sessionId = sessionIdRef.current as string;
      const { gap_id, question } = await askQuestion(sessionId, seam, seamSentence);
      gapIdRef.current = gap_id;
      seamRef.current = seam;
      questionRef.current = question;
      pushTurn(makeTurn('system', 'question', question));
      patch({ phase: 'awaiting_answer', busy: false });
    },
    [patch, pushTurn],
  );

  // Submit the opening explanation (voice or typed).
  const submitOpening = useCallback(
    async (input: { blob?: Blob; text?: string }) => {
      if (state.busy) return;
      patch({ busy: true, phase: 'transcribing', error: null });
      try {
        const sessionId = sessionIdRef.current as string;
        const { turnId, transcript } = input.blob
          ? await ingestVoice(input.blob)
          : await ingestText((input.text ?? '').trim());

        patch({ phase: 'verifying' });
        const { verifier, action } = await verify(sessionId, turnId, transcript);
        highestRungRef.current = verifier.highest_rung;

        if (action.type === 'complete_success') {
          finish('derived_unprompted', null, null, null);
          return;
        }
        if (action.type === 'stop_unresolved') {
          // Defensive: cannot happen on the first verify, but handle it honestly.
          finish('did_not_close', action.seam, verifier.seam_sentence, null);
          return;
        }

        // action.type === 'probe': name the seam, then ask one question.
        const seam = action.seam;
        primarySeamRef.current = seam;
        primarySeamSentenceRef.current = verifier.seam_sentence;
        patch({ phase: 'reflecting' });
        pushTurn(
          makeTurn(
            'system',
            'reflection',
            verifier.seam_sentence
              ? `${reflectionLead(seam)} ${verifier.seam_sentence}`
              : reflectionLead(seam),
          ),
        );
        await openQuestionFor(seam, verifier.seam_sentence);
      } catch (err) {
        fail(messageFrom(err));
      }
    },
    [state.busy, patch, ingestVoice, ingestText, pushTurn, openQuestionFor, fail],
  );

  // Submit an answer to the open question (voice or typed).
  const submitAnswer = useCallback(
    async (input: { blob?: Blob; text?: string }) => {
      if (state.busy) return;
      patch({ busy: true, phase: 'transcribing', error: null });
      try {
        const sessionId = sessionIdRef.current as string;
        const { turnId, transcript } = input.blob
          ? await ingestVoice(input.blob)
          : await ingestText((input.text ?? '').trim());

        patch({ phase: 'judging' });
        const { action } = await closeJudge({
          sessionId,
          gapId: gapIdRef.current as string,
          seam: seamRef.current as Criterion,
          question: questionRef.current ?? '',
          secondAttemptTurnId: turnId,
          transcript,
        });

        if (action.type === 'complete_success') {
          finish(
            'closed',
            primarySeamRef.current,
            primarySeamSentenceRef.current,
            questionRef.current,
          );
          return;
        }
        if (action.type === 'stop_unresolved') {
          const seam = action.seam;
          const sentence =
            seam === primarySeamRef.current ? primarySeamSentenceRef.current : null;
          finish('did_not_close', seam, sentence, questionRef.current);
          return;
        }

        // action.type === 'probe': either a new seam after a real close, or another
        // angle on the same seam. The same handler covers both.
        patch({ phase: 'reflecting' });
        const nextSeam = action.seam;
        if (nextSeam !== primarySeamRef.current) {
          // A new edge appeared; name it gently before the next question.
          pushTurn(makeTurn('system', 'reflection', reflectionLead(nextSeam)));
        }
        await openQuestionFor(nextSeam, null);
      } catch (err) {
        fail(messageFrom(err));
      }
    },
    [state.busy, patch, ingestVoice, ingestText, pushTurn, openQuestionFor, fail],
  );

  function finish(
    outcome: DiagnosisOutcome,
    seam: Criterion | null,
    seamSentence: string | null,
    question: string | null,
  ) {
    patch({
      phase: 'diagnosis',
      busy: false,
      diagnosis: {
        outcome,
        seam,
        seamSentence,
        question,
        highestRung: highestRungRef.current,
      },
    });
  }

  return { ...state, begin, submitOpening, submitAnswer };
}

function messageFrom(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Something interrupted the session. Please try again.';
}
