import { useEffect, useState } from 'react';
import { useRecorder } from '../lib/useRecorder.ts';
import { RecordButton } from './RecordButton.tsx';
import { Waveform } from './Waveform.tsx';
import { TextFallback } from './TextFallback.tsx';

interface RecorderDockProps {
  busy: boolean;
  // The microcopy under the control, lowering the pressure to perform.
  hint: string;
  onVoice: (blob: Blob) => void;
  onText: (text: string) => void;
}

// The shared input. Voice is primary: one big control, a breathing waveform, calm
// microcopy. A quiet "type instead" link reveals the text fallback. If the mic is
// unavailable, it falls back to text on its own.
export function RecorderDock({ busy, hint, onVoice, onText }: RecorderDockProps) {
  const recorder = useRecorder();
  const [typing, setTyping] = useState(false);
  const [debug, setDebug] = useState<string | null>(null);

  // No microphone support: go straight to text, never strand the learner.
  useEffect(() => {
    if (!recorder.supported) setTyping(true);
  }, [recorder.supported]);

  // TEMP DIAGNOSTIC: decode the recorded clip and report real audio duration +
  // peak amplitude. Peak ~0 means the mic captured silence (the cause of the
  // phantom "you"); a healthy peak means audio is fine and the bug is downstream.
  async function probe(blob: Blob) {
    const line = (msg: string) => {
      setDebug(msg);
      // eslint-disable-next-line no-console
      console.log('[mic probe]', msg);
    };
    try {
      const buf = await blob.arrayBuffer();
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctor();
      const decoded = await ctx.decodeAudioData(buf.slice(0));
      let peak = 0;
      for (let c = 0; c < decoded.numberOfChannels; c += 1) {
        const data = decoded.getChannelData(c);
        for (let i = 0; i < data.length; i += 1) {
          const v = Math.abs(data[i]);
          if (v > peak) peak = v;
        }
      }
      ctx.close().catch(() => {});
      line(
        `size ${(blob.size / 1024).toFixed(1)}KB · ${decoded.duration.toFixed(2)}s · peak ${peak.toFixed(3)} · ${blob.type || 'no-type'}`,
      );
    } catch (err) {
      line(`size ${(blob.size / 1024).toFixed(1)}KB · decode FAILED: ${String(err)} · ${blob.type || 'no-type'}`);
    }
  }

  async function handleToggle() {
    if (busy) return;
    if (recorder.isRecording) {
      const blob = await recorder.stop();
      await probe(blob);
      if (blob.size > 0) onVoice(blob);
    } else {
      setDebug(null);
      await recorder.start();
    }
  }

  if (typing) {
    return (
      <div className="flex flex-col items-stretch gap-4">
        <TextFallback
          busy={busy}
          onSubmit={onText}
          onCancel={() => recorder.supported && setTyping(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <Waveform level={recorder.level} active={recorder.isRecording} />
      <RecordButton
        isRecording={recorder.isRecording}
        level={recorder.level}
        disabled={busy}
        onToggle={handleToggle}
      />
      <div className="flex min-h-[1.5rem] flex-col items-center gap-1 text-center">
        <p className="text-sm text-ink-soft" aria-live="polite">
          {recorder.isRecording ? 'Listening. Tap to finish.' : hint}
        </p>
        {recorder.error ? (
          <p className="text-sm text-seam" role="alert">
            {recorder.error}
          </p>
        ) : null}
        {debug ? (
          <p className="font-mono text-xs text-muted" aria-live="polite">
            {debug}
          </p>
        ) : null}
      </div>
      {!recorder.isRecording ? (
        <button
          type="button"
          onClick={() => setTyping(true)}
          className="text-sm text-muted underline-offset-4 transition-colors hover:text-ink-soft hover:underline"
        >
          Type instead
        </button>
      ) : null}
    </div>
  );
}
