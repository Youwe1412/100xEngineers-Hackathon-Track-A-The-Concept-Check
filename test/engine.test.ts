import { describe, expect, it } from 'vitest';

import {
  applyVerifier,
  computeSeam,
  createSession,
  deriveHighestRung,
  nextAction,
  recordClose,
} from '../src/engine.js';
import { FORBIDDEN_WORDS } from '../src/answerKey.js';
import type { VerifierResult } from '../src/types.js';

// A verifier result with every criterion passing. Spread and override per test.
const allPass: VerifierResult = {
  relational_core: true,
  common_language: true,
  rules: true,
  protocol: true,
  contract: true,
  extended_abstract: false,
};

describe('computeSeam', () => {
  it('returns relational_core as the seam when the WHY fails, even if pillars pass', () => {
    const result = computeSeam({ ...allPass, relational_core: false });
    expect(result.seam).toBe('relational_core');
  });

  it('checks relational_core before any pillar', () => {
    // Both relational_core and protocol fail; relational_core wins because it is
    // first in the ladder.
    const result = computeSeam({
      ...allPass,
      relational_core: false,
      protocol: false,
    });
    expect(result.seam).toBe('relational_core');
  });

  it('returns the failed pillar as the seam when relational_core passes', () => {
    const result = computeSeam({ ...allPass, protocol: false });
    expect(result.seam).toBe('protocol');
  });

  it('returns the first failed pillar in ladder order when several pillars fail', () => {
    const result = computeSeam({
      ...allPass,
      protocol: false,
      rules: false,
    });
    expect(result.seam).toBe('rules');
  });

  it('returns a null seam when nothing fails', () => {
    const result = computeSeam(allPass);
    expect(result.seam).toBeNull();
  });
});

describe('deriveHighestRung', () => {
  it('prestructural when nothing passes', () => {
    expect(
      deriveHighestRung({
        relational_core: false,
        common_language: false,
        rules: false,
        protocol: false,
        contract: false,
      }),
    ).toBe('prestructural');
  });

  it('unistructural when exactly one pillar passes and no WHY', () => {
    expect(
      deriveHighestRung({
        relational_core: false,
        common_language: true,
        rules: false,
        protocol: false,
        contract: false,
      }),
    ).toBe('unistructural');
  });

  it('multistructural when all four pillars pass but the WHY fails', () => {
    expect(
      deriveHighestRung({ ...allPass, relational_core: false }),
    ).toBe('multistructural');
  });

  it('relational when the WHY is derived', () => {
    expect(deriveHighestRung(allPass)).toBe('relational');
  });

  it('extended_abstract when the WHY plus all pillars plus transfer hold', () => {
    expect(
      deriveHighestRung({ ...allPass, extended_abstract: true }),
    ).toBe('extended_abstract');
  });

  it('stays relational when transfer is claimed without all four pillars', () => {
    expect(
      deriveHighestRung({
        ...allPass,
        protocol: false,
        extended_abstract: true,
      }),
    ).toBe('relational');
  });
});

describe('learner who fails relational_core', () => {
  it('sets the seam to relational_core and probes', () => {
    const state = applyVerifier(createSession('s1'), {
      ...allPass,
      relational_core: false,
    });
    expect(state.currentSeam).toBe('relational_core');
    expect(state.rungStatus.relational_core).toBe('failed');
    expect(state.highestRungReached).toBe('multistructural');
    expect(state.isComplete).toBe(false);

    const action = nextAction(state);
    expect(action).toEqual({ type: 'probe', seam: 'relational_core' });
  });
});

describe('learner who passes relational_core but misses a pillar', () => {
  it('sets the seam to the pillar, not relational_core, and probes it', () => {
    const state = applyVerifier(createSession('s2'), {
      ...allPass,
      protocol: false,
    });
    expect(state.currentSeam).toBe('protocol');
    expect(state.rungStatus.relational_core).toBe('passed');
    expect(state.rungStatus.protocol).toBe('failed');
    expect(state.highestRungReached).toBe('relational');

    const action = nextAction(state);
    expect(action).toEqual({ type: 'probe', seam: 'protocol' });
  });
});

describe('real_close on attempt 1', () => {
  it('closes the only failed rung and completes', () => {
    // Learner fails just the WHY; everything else passed.
    const state = applyVerifier(createSession('s3'), {
      ...allPass,
      relational_core: false,
    });
    expect(state.probeAttempts).toBe(0);

    const { state: after, action } = recordClose(state, 'real_close');
    expect(after.rungStatus.relational_core).toBe('closed_after_naming');
    expect(after.currentSeam).toBeNull();
    expect(after.probeAttempts).toBe(0);
    expect(after.isComplete).toBe(true);
    expect(action).toEqual({ type: 'complete_success' });
  });

  it('advances to the next failed rung when more than one rung broke', () => {
    // Fails the WHY and a pillar. Closing the WHY moves the seam to the pillar.
    const state = applyVerifier(createSession('s3b'), {
      ...allPass,
      relational_core: false,
      contract: false,
    });
    expect(state.currentSeam).toBe('relational_core');

    const { state: after, action } = recordClose(state, 'real_close');
    expect(after.rungStatus.relational_core).toBe('closed_after_naming');
    expect(after.currentSeam).toBe('contract');
    expect(after.probeAttempts).toBe(0);
    expect(after.isComplete).toBe(false);
    expect(action).toEqual({ type: 'probe', seam: 'contract' });
  });
});

describe('two fake_closes hit the hard cap', () => {
  it('increments attempts, keeps the seam, then stops unresolved', () => {
    const start = applyVerifier(createSession('s4'), {
      ...allPass,
      relational_core: false,
    });

    const first = recordClose(start, 'fake_close');
    expect(first.state.probeAttempts).toBe(1);
    expect(first.state.currentSeam).toBe('relational_core');
    expect(first.action).toEqual({ type: 'probe', seam: 'relational_core' });

    const second = recordClose(first.state, 'fake_close');
    expect(second.state.probeAttempts).toBe(2);
    expect(second.state.currentSeam).toBe('relational_core');
    expect(second.action).toEqual({
      type: 'stop_unresolved',
      seam: 'relational_core',
    });
  });
});

describe('learner who passes everything', () => {
  it('has no seam, tops out at extended_abstract, and completes', () => {
    const state = applyVerifier(createSession('s5'), {
      ...allPass,
      extended_abstract: true,
    });
    expect(state.currentSeam).toBeNull();
    expect(state.highestRungReached).toBe('extended_abstract');
    expect(state.isComplete).toBe(true);

    const action = nextAction(state);
    expect(action).toEqual({ type: 'complete_success' });
  });
});

describe('purity', () => {
  it('applyVerifier does not mutate the input session', () => {
    const start = createSession('p1');
    const snapshot = JSON.parse(JSON.stringify(start));
    applyVerifier(start, { ...allPass, relational_core: false });
    expect(start).toEqual(snapshot);
  });

  it('recordClose does not mutate the input session', () => {
    const start = applyVerifier(createSession('p2'), {
      ...allPass,
      relational_core: false,
    });
    const snapshot = JSON.parse(JSON.stringify(start));
    recordClose(start, 'real_close');
    recordClose(start, 'fake_close');
    expect(start).toEqual(snapshot);
  });
});

describe('FORBIDDEN_WORDS', () => {
  it('defines a non-empty banned list for every criterion', () => {
    for (const criterion of [
      'relational_core',
      'common_language',
      'rules',
      'protocol',
      'contract',
    ] as const) {
      expect(FORBIDDEN_WORDS[criterion].length).toBeGreaterThan(0);
    }
  });
});
