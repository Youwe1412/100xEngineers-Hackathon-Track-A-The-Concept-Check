import type { Diagnosis } from '../state/useDiagnostic.ts';
import { rungSentence, seamLabel } from '../lib/rungCopy.ts';

interface DiagnosisCardProps {
  diagnosis: Diagnosis;
  onRestart: () => void;
}

// The resolution. A finding about understanding, never a grade. No number, no
// pass/fail, no red. A non-close is framed as the edge of current understanding,
// an invitation to push exactly there next time.
export function DiagnosisCard({ diagnosis, onRestart }: DiagnosisCardProps) {
  const { outcome, seam, seamSentence, question, highestRung } = diagnosis;

  const headline =
    outcome === 'derived_unprompted'
      ? 'You derived it from first principles, unprompted.'
      : outcome === 'closed'
        ? 'You found the edge and reasoned past it in your own words.'
        : 'Here is the edge of your current understanding.';

  // The seam, in words. Prefer the verifier's own sentence; otherwise name the rung.
  const edge =
    seamSentence ?? (seam ? `This sat at ${seamLabel[seam]}.` : null);

  return (
    <section className="animate-fade-up flex flex-1 flex-col items-center justify-center py-10">
      <div className="w-full max-w-xl rounded-2xl border border-line bg-surface p-8 shadow-soft">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
          A finding, not a score
        </p>
        <h2 className="mt-4 font-serif text-[1.6rem] leading-snug text-ink">
          {headline}
        </h2>

        <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-soft">
          {rungSentence[highestRung]}
        </p>

        {outcome !== 'derived_unprompted' && edge ? (
          <div className="mt-7 rounded-xl border border-seam-soft bg-seam-soft/50 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-seam">
              Where the words became a label
            </p>
            <p className="mt-2 text-[1.0625rem] leading-relaxed text-ink">{edge}</p>
          </div>
        ) : null}

        {question ? (
          <div className="mt-4 rounded-xl border border-accent-soft bg-accent-soft/40 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent">
              The question that was used
            </p>
            <p className="mt-2 text-[1.0625rem] leading-relaxed text-ink">
              {question}
            </p>
          </div>
        ) : null}

        {outcome === 'did_not_close' ? (
          <p className="mt-6 text-[0.95rem] leading-relaxed text-ink-soft">
            This is an invitation, not a failure. The next time you meet this idea,
            this is the exact place to push.
          </p>
        ) : null}

        <button
          type="button"
          onClick={onRestart}
          className="mt-8 rounded-lg border border-line bg-bg px-5 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent"
        >
          Begin again
        </button>
      </div>
    </section>
  );
}
