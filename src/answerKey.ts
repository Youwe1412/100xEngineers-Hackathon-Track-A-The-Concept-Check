// Hardcoded reference data for the Interface Seam Finder.
// This is the fixed answer key, the SOLO ladder, the seam-check order, and the
// per-rung forbidden words. All frozen so callers cannot mutate it at runtime.

import type { Criterion, SoloRung } from './types.ts';

// The fixed answer key for the concept "interface".
export const ANSWER_KEY = {
  concept: 'interface',
  relational_core:
    "Two systems that work in fundamentally different ways cannot naturally parse each other's output; without a shared agreement, one system's output is just noise to the other. The interface is that agreement, and it exists to make coordination possible.",
  pillars: {
    common_language: 'A shared form both sides can read and parse.',
    rules: 'The boundaries of what is allowed versus forbidden.',
    protocol: 'The agreed sequence of steps for the exchange.',
    contract: 'The agreed meaning of the exchange and what it points to.',
  },
  failure_mode:
    'Under-specification: one side assumes shared context that was never actually agreed on.',
  surface_trap:
    'Naming the object (screen, knob, endpoint, envelope) as the interface instead of the agreement underneath it.',
} as const;

// The SOLO taxonomy ladder, ordered low to high.
export const SOLO_LADDER: readonly SoloRung[] = [
  'prestructural', // misses the concept ("interface is the screen")
  'unistructural', // one aspect in isolation ("it connects things")
  'multistructural', // names the four pillars but as a disconnected list
  'relational', // derives WHY it must exist (the relational_core)
  'extended_abstract', // transfers the lens / spots under-specification unprompted
] as const;

// The order in which computeSeam checks criteria. relational_core is checked
// BEFORE the individual pillars, so a missing WHY is always the seam first.
export const CRITERION_LADDER: readonly Criterion[] = [
  'relational_core',
  'common_language',
  'rules',
  'protocol',
  'contract',
] as const;

// The four pillar criteria, broken out for highest-rung derivation.
export const PILLAR_CRITERIA: readonly Criterion[] = [
  'common_language',
  'rules',
  'protocol',
  'contract',
] as const;

// Canonical terms the Questioner is banned from using when probing each rung.
// Naming the answer word would hand the learner the close instead of letting
// them generate it, so the Questioner must steer around these. Consumed later
// by the Questioner; defined here as fixed data.
export const FORBIDDEN_WORDS: Record<Criterion, readonly string[]> = {
  relational_core: [
    'agreement',
    'coordinate',
    'coordination',
    'noise',
    'two systems',
    'parse',
    'shared',
  ],
  common_language: ['common language', 'shared form', 'read', 'parse'],
  rules: ['rules', 'allowed', 'forbidden', 'boundaries'],
  protocol: ['protocol', 'sequence', 'steps', 'order'],
  contract: ['contract', 'meaning', 'points to', 'agreed meaning'],
} as const;

// Freeze nested structures so the hardcoded data cannot be mutated at runtime.
Object.freeze(ANSWER_KEY);
Object.freeze(ANSWER_KEY.pillars);
Object.freeze(SOLO_LADDER);
Object.freeze(CRITERION_LADDER);
Object.freeze(PILLAR_CRITERIA);
Object.freeze(FORBIDDEN_WORDS);
for (const words of Object.values(FORBIDDEN_WORDS)) {
  Object.freeze(words);
}
