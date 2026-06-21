// The deterministic spine of the Interface Seam Finder.
// Every function here is pure: it takes state plus input and returns a new state
// or a decision. No mutation of inputs, no side effects, no I/O, no LLM calls.
// The model's verdicts are passed IN as plain objects (VerifierResult,
// CloseVerdict); this module never reaches out to one.

import { CRITERION_LADDER, PILLAR_CRITERIA } from './answerKey.ts';
import type {
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

// Build a fresh session. All rungs untested, no seam yet, nothing complete.
// Convenience for tests and later DB or LLM wiring so callers do not hand-build
// state.
export function createSession(sessionId: string): Session {
  return {
    sessionId,
    highestRungReached: 'prestructural',
    rungStatus: {
      relational_core: 'untested',
      common_language: 'untested',
      rules: 'untested',
      protocol: 'untested',
      contract: 'untested',
    },
    currentSeam: null,
    probeAttempts: 0,
    isComplete: false,
  };
}

// Map the Verifier's booleans to the highest SOLO rung the learner reached.
// Exported so the mapping can be tested directly. Each branch is tied to a SOLO
// definition.
export function deriveHighestRung(verifierResult: VerifierResult): SoloRung {
  const pillarsPassed = PILLAR_CRITERIA.filter(
    (pillar) => verifierResult[pillar],
  ).length;
  const allPillars = pillarsPassed === PILLAR_CRITERIA.length;

  if (verifierResult.relational_core) {
    // The learner derived WHY the interface must exist, so they reached at least
    // the relational rung regardless of pillar completeness. extended_abstract
    // only when they also hold all four pillars and transferred the lens to a
    // novel domain or spotted under-specification unprompted.
    if (allPillars && verifierResult.extended_abstract === true) {
      return 'extended_abstract';
    }
    return 'relational';
  }

  // No WHY, so the ceiling is multistructural. More than one pillar in isolation
  // is still a disconnected list, not a derivation.
  if (pillarsPassed >= 2) return 'multistructural';
  // One aspect in isolation ("it connects things").
  if (pillarsPassed === 1) return 'unistructural';
  // Misses the concept entirely ("interface is the screen").
  return 'prestructural';
}

// Find the seam: the FIRST failed criterion in ladder order. relational_core is
// visited before any pillar, so a missing WHY is always the seam first. Returns
// null seam when nothing failed (the learner reached the top). Pure: it reads
// the verifier result only and does not touch a Session.
export function computeSeam(verifierResult: VerifierResult): SeamResult {
  let seam: Criterion | null = null;
  for (const criterion of CRITERION_LADDER) {
    if (!verifierResult[criterion]) {
      seam = criterion;
      break;
    }
  }
  return { highestRungReached: deriveHighestRung(verifierResult), seam };
}

// Decide the rung status to record, preserving a rung the learner already closed
// by naming the gap so a re-verify cannot silently un-close it.
function statusFor(previous: RungState, passed: boolean): RungState {
  if (previous === 'closed_after_naming') return previous;
  return passed ? 'passed' : 'failed';
}

// Fold a verifier result into a session: set the highest rung, mark every rung
// passed or failed, set the current seam, and reset probe attempts for the new
// seam. isComplete is true only when nothing failed. Returns a new Session; the
// input is not mutated.
export function applyVerifier(
  state: Session,
  verifierResult: VerifierResult,
): Session {
  const { highestRungReached, seam } = computeSeam(verifierResult);
  const rungStatus = { ...state.rungStatus };
  for (const criterion of CRITERION_LADDER) {
    rungStatus[criterion] = statusFor(
      state.rungStatus[criterion],
      verifierResult[criterion],
    );
  }
  return {
    ...state,
    highestRungReached,
    rungStatus,
    currentSeam: seam,
    probeAttempts: 0,
    isComplete: seam === null,
  };
}

// Deterministic IF/THEN. The model decides nothing here.
// Expects a post-verify state: either a seam is set, or every rung is resolved.
export function nextAction(state: Session): Action {
  if (state.currentSeam !== null) {
    // HARD CAP: after 2 probes the gap did not close. Stop and log honestly.
    if (state.probeAttempts >= 2) {
      return { type: 'stop_unresolved', seam: state.currentSeam };
    }
    return { type: 'probe', seam: state.currentSeam };
  }
  return { type: 'complete_success' };
}

// Set one rung's status, returning a new Session with a cloned rungStatus.
function setRungStatus(
  state: Session,
  criterion: Criterion,
  status: RungState,
): Session {
  return {
    ...state,
    rungStatus: { ...state.rungStatus, [criterion]: status },
  };
}

// After a rung is resolved, point the seam at the next still-failed rung in
// ladder order, or clear it and mark the session complete when none remain.
function advanceSeam(state: Session): Session {
  const nextSeam =
    CRITERION_LADDER.find(
      (criterion) => state.rungStatus[criterion] === 'failed',
    ) ?? null;
  if (nextSeam === null) {
    return { ...state, currentSeam: null, probeAttempts: 0, isComplete: true };
  }
  return {
    ...state,
    currentSeam: nextSeam,
    probeAttempts: 0,
    isComplete: false,
  };
}

// Record the Verifier's verdict on whether naming the gap let the learner close
// it. Returns the new state plus the recomputed next action so the caller does
// not have to call nextAction again. The input state is not mutated.
export function recordClose(
  state: Session,
  closeVerdict: CloseVerdict,
): CloseOutcome {
  const seam = state.currentSeam;

  // No active seam means nothing to close. Report the standing decision.
  if (seam === null) {
    const unchanged: Session = { ...state };
    return { state: unchanged, action: nextAction(unchanged) };
  }

  if (closeVerdict === 'real_close') {
    // The learner generated a new, correct derivation in their own words. Mark
    // the rung closed, then move on to the next unresolved rung or finish.
    const closed = setRungStatus(state, seam, 'closed_after_naming');
    const advanced = advanceSeam(closed);
    return { state: advanced, action: nextAction(advanced) };
  }

  // fake_close: the gap did not close. Keep the same seam and count the attempt.
  // The hard cap in nextAction turns this into stop_unresolved once it hits 2.
  const next: Session = { ...state, probeAttempts: state.probeAttempts + 1 };
  return { state: next, action: nextAction(next) };
}
