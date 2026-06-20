interface RecordButtonProps {
  isRecording: boolean;
  level: number;
  disabled?: boolean;
  onToggle: () => void;
}

// The single focal control. A large circular mic that toggles recording. While
// recording, a soft halo breathes behind it (listening, not judging). Fully
// keyboard operable; the ARIA label states the current action.
export function RecordButton({
  isRecording,
  level,
  disabled,
  onToggle,
}: RecordButtonProps) {
  return (
    <div className="relative flex items-center justify-center">
      {isRecording ? (
        <span
          className="animate-breathe absolute rounded-full bg-accent-soft"
          aria-hidden="true"
          style={{
            width: 132,
            height: 132,
            transform: `scale(${1 + level * 0.18})`,
          }}
        />
      ) : null}
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={isRecording}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        className={[
          'relative flex h-24 w-24 items-center justify-center rounded-full shadow-soft transition-all duration-200',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isRecording
            ? 'bg-accent text-white'
            : 'border border-line bg-surface text-accent hover:border-accent',
        ].join(' ')}
      >
        {isRecording ? (
          <span className="block h-6 w-6 rounded-md bg-white" aria-hidden="true" />
        ) : (
          <MicIcon />
        )}
      </button>
    </div>
  );
}

function MicIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <line x1="12" y1="18" x2="12" y2="21" />
    </svg>
  );
}
