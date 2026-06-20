import { useEffect, useRef } from 'react';
import { useDiagnostic, OPENING_PROMPT } from '../state/useDiagnostic.ts';
import { OpeningScreen } from './OpeningScreen.tsx';
import { DialogueThread } from './DialogueThread.tsx';
import { RecorderDock } from './RecorderDock.tsx';
import { ThinkingIndicator } from './ThinkingIndicator.tsx';
import { DiagnosisCard } from './DiagnosisCard.tsx';

// Maps the controller's Phase to one focal element. Never shows the learner more
// than the single current step (progressive disclosure).
export function SessionView() {
  const d = useDiagnostic();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void d.begin();
    // d.begin is stable; run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (d.phase === 'error') {
    return (
      <section className="flex flex-1 flex-col items-center justify-center py-12 text-center">
        <p className="font-serif text-xl text-ink">Something interrupted us.</p>
        <p className="mt-3 max-w-sm text-[0.95rem] leading-relaxed text-ink-soft">
          {d.error}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-7 rounded-lg border border-line bg-bg px-5 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent"
        >
          Begin again
        </button>
      </section>
    );
  }

  if (d.phase === 'diagnosis' && d.diagnosis) {
    return (
      <DiagnosisCard
        diagnosis={d.diagnosis}
        onRestart={() => window.location.reload()}
      />
    );
  }

  if (!d.ready) {
    return <ThinkingIndicator label="Preparing a quiet space..." />;
  }

  // Before the first turn: the opening screen is the whole space.
  if (d.thread.length === 0) {
    return (
      <OpeningScreen
        busy={d.busy}
        onVoice={(blob) => void d.submitOpening({ blob })}
        onText={(text) => void d.submitOpening({ text })}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col pt-4">
      <p className="mb-8 border-l-2 border-line pl-4 text-sm leading-relaxed text-muted">
        {OPENING_PROMPT}
      </p>

      <DialogueThread turns={d.thread} />

      <div className="mt-12">
        {d.phase === 'awaiting_answer' ? (
          <RecorderDock
            busy={d.busy}
            hint="Answer in your own words. There is no hurry."
            onVoice={(blob) => void d.submitAnswer({ blob })}
            onText={(text) => void d.submitAnswer({ text })}
          />
        ) : (
          <ThinkingIndicator label={busyLabel(d.phase)} />
        )}
      </div>
    </div>
  );
}

function busyLabel(phase: string): string {
  switch (phase) {
    case 'transcribing':
      return 'Reading your words back...';
    case 'verifying':
      return 'Looking for the seam...';
    case 'reflecting':
      return 'Forming one question...';
    case 'judging':
      return 'Sitting with your answer...';
    default:
      return 'One moment...';
  }
}
