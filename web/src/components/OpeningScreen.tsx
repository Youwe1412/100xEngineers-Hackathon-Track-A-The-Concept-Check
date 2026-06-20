import { RecorderDock } from './RecorderDock.tsx';
import { OPENING_PROMPT } from '../state/useDiagnostic.ts';

interface OpeningScreenProps {
  busy: boolean;
  onVoice: (blob: Blob) => void;
  onText: (text: string) => void;
}

// A single quiet screen: the prompt to reflect on, then the record control as the
// clear focal point. The microcopy makes thinking out loud, pausing, and restarting
// all explicitly welcome.
export function OpeningScreen({ busy, onVoice, onText }: OpeningScreenProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-12">
      <div className="w-full max-w-xl text-center">
        <p className="text-sm uppercase tracking-[0.18em] text-muted">
          To begin
        </p>
        <h2 className="mt-5 font-serif text-[1.95rem] leading-snug text-ink">
          {OPENING_PROMPT}
        </h2>
        <p className="mx-auto mt-5 max-w-md text-[0.95rem] leading-relaxed text-ink-soft">
          There is no right phrasing to find. Think out loud, pause, double back. The
          pauses and the second tries are the useful part.
        </p>
      </div>

      <div className="mt-12 w-full max-w-md">
        <RecorderDock
          busy={busy}
          hint="Tap to start. Take a breath first if you like."
          onVoice={onVoice}
          onText={onText}
        />
      </div>
    </div>
  );
}
