// Humane, plain-language phrasing for the engine's findings. NEVER a score, never a
// grade, never pass/fail language. These read as observations a thoughtful mentor
// might offer, framed so the learner can sit with them without defensiveness.

import type { Criterion, SoloRung } from './types.ts';

// What the highest SOLO rung reached means, in the learner's terms.
export const rungSentence: Record<SoloRung, string> = {
  prestructural:
    'Right now the word points at an object, not at the idea underneath it.',
  unistructural: 'You are holding one piece of it, on its own.',
  multistructural:
    'You can name several parts, though they sit as a list rather than a reason.',
  relational: 'You can say why an interface must exist.',
  extended_abstract:
    'You can carry the idea into new situations and see where it would break.',
};

// What each seam (the place understanding became a label) is really about. Used in
// the reflection turn and the diagnosis, in language that invites rather than alarms.
export const seamLabel: Record<Criterion, string> = {
  relational_core: 'why an interface must exist at all',
  common_language: 'the shared form both sides can actually read',
  rules: 'what the exchange allows and what it forbids',
  protocol: 'the agreed order the exchange has to follow',
  contract: 'the agreed meaning of what is exchanged',
};

// The opening line of a reflection turn, naming the edge with curiosity.
export function reflectionLead(seam: Criterion): string {
  return `Here is the interesting edge: ${seamLabel[seam]}.`;
}
