interface SystemTurnProps {
  kind: 'reflection' | 'question';
  text: string;
}

// The system's voice: a mirror, not a judge. A reflection names the seam in curious
// ochre ("here is the interesting edge"); a question is the single open prompt in
// calm teal. Both sit in soft cards, equal in dignity to the learner's words.
export function SystemTurn({ kind, text }: SystemTurnProps) {
  if (kind === 'reflection') {
    return (
      <article className="animate-fade-up rounded-2xl border border-seam-soft bg-seam-soft/60 p-5">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-seam">
          A reflection
        </p>
        <p className="mt-2 text-[1.0625rem] leading-relaxed text-ink">{text}</p>
      </article>
    );
  }

  return (
    <article className="animate-fade-up rounded-2xl border border-accent-soft bg-accent-soft/50 p-5">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent">
        One question
      </p>
      <p className="mt-2 text-xl leading-snug text-ink">{text}</p>
    </article>
  );
}
