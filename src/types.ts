// Shared types for the Interface Concept Checker deterministic engine.
// Pure type declarations only. No runtime logic, no imports of any framework.

// The SOLO taxonomy rungs, ordered low to high. See SOLO_LADDER in answerKey.ts.
export type SoloRung =
  | 'prestructural'
  | 'unistructural'
  | 'multistructural'
  | 'relational'
  | 'extended_abstract';

// The five things the Verifier scores. relational_core is the WHY; the other
// four are the pillars the agreement is made of. Seam checking visits these in
// the order defined by CRITERION_LADDER, with relational_core first.
export type Criterion =
  | 'relational_core'
  | 'common_language'
  | 'rules'
  | 'protocol'
  | 'contract';

// Per-rung status inside a Session.
export type RungState = 'untested' | 'passed' | 'failed' | 'closed_after_naming';

// The Verifier's per-criterion booleans, passed IN to this module as a plain
// object. true means the learner satisfied that criterion. extended_abstract is
// optional and only lifts highestRungReached to the top; it is not a seam.
export interface VerifierResult {
  relational_core: boolean;
  common_language: boolean;
  rules: boolean;
  protocol: boolean;
  contract: boolean;
  extended_abstract?: boolean;
}

// The deterministic state object. The state machine is the spine; the model
// decides nothing here.
export interface Session {
  sessionId: string;
  highestRungReached: SoloRung;
  rungStatus: Record<Criterion, RungState>;
  currentSeam: Criterion | null;
  probeAttempts: number;
  isComplete: boolean;
}

// What computeSeam returns: where the learner topped out, and the first failed
// rung (or null if nothing failed).
export interface SeamResult {
  highestRungReached: SoloRung;
  seam: Criterion | null;
}

// The deterministic decision emitted by nextAction.
export type Action =
  | { type: 'complete_success' }
  | { type: 'probe'; seam: Criterion }
  | { type: 'stop_unresolved'; seam: Criterion };

// The Verifier's verdict on whether naming the gap let the learner close it.
export type CloseVerdict = 'real_close' | 'fake_close';

// recordClose returns both the new state and the recomputed next action so the
// caller does not have to call nextAction again.
export interface CloseOutcome {
  state: Session;
  action: Action;
}
