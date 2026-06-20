interface WaveformProps {
  level: number; // 0..1 live RMS
  active: boolean;
}

// A calm row of bars that breathe with the voice. This signals "listening", never
// loudness scoring. At rest the bars settle to a quiet baseline.
const WEIGHTS = [0.45, 0.7, 1, 0.85, 0.6, 0.9, 0.5];

export function Waveform({ level, active }: WaveformProps) {
  return (
    <div
      className="flex h-8 items-center justify-center gap-1.5"
      aria-hidden="true"
    >
      {WEIGHTS.map((weight, index) => {
        const height = active ? 12 + level * 26 * weight : 6;
        return (
          <span
            key={index}
            className="w-1 rounded-full bg-accent transition-all duration-150 ease-out"
            style={{ height: `${height}px`, opacity: active ? 0.55 + level * 0.4 : 0.3 }}
          />
        );
      })}
    </div>
  );
}
