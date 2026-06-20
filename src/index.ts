// Public API for the Interface Concept Checker deterministic engine.
// Pure logic only. Wire this to a DB and an LLM at a higher layer.

export {
  ANSWER_KEY,
  CRITERION_LADDER,
  FORBIDDEN_WORDS,
  PILLAR_CRITERIA,
  SOLO_LADDER,
} from './answerKey.ts';

export {
  applyVerifier,
  computeSeam,
  createSession,
  deriveHighestRung,
  nextAction,
  recordClose,
} from './engine.ts';

export type {
  Action,
  CloseOutcome,
  CloseVerdict,
  Criterion,
  RungState,
  SeamResult,
  Session,
  SoloRung,
  VerifierResult,
} from './types.ts';
