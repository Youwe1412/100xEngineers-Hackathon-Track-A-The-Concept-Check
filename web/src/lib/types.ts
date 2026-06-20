// API response types for the frontend. The engine's own types are imported, not
// redefined, so the rendered contract stays honest with the deterministic spine in
// src/. The frontend imports TYPES only; it never imports engine logic.

import type { Action, Criterion, SoloRung, CloseVerdict } from '../../../src/types.ts';

export type { Action, Criterion, SoloRung, CloseVerdict };

// POST /session
export interface SessionResponse {
  session_id: string;
}

// POST /transcribe (multipart)
export interface TranscribeResponse {
  turn_id: string;
  transcript: string;
  audio_path: string;
}

// POST /verify
export interface VerifyResponse {
  verifier: {
    relational_core: boolean;
    pillars_present: Criterion[];
    pillars_missing: Criterion[];
    highest_rung: SoloRung;
    seam: Criterion | null;
    seam_sentence: string | null;
  };
  action: Action;
}

// POST /question
export interface QuestionResponse {
  gap_id: string;
  turn_id: string;
  question: string;
}

// POST /close-judge
export interface CloseJudgeResponse {
  result: CloseVerdict;
  reason: string;
  action: Action;
}
