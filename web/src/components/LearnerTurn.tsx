interface LearnerTurnProps {
  text: string;
}

// The learner's own words, set in serif so their thinking feels weighty and worth
// re-reading. The transcript IS the record. Equal in dignity to the system's voice.
export function LearnerTurn({ text }: LearnerTurnProps) {
  return (
    <article className="animate-fade-up">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
        Your words
      </p>
      <p className="mt-2 whitespace-pre-wrap font-serif text-[1.0625rem] leading-relaxed text-ink">
        {text}
      </p>
    </article>
  );
}
