// An explicit, unmissable status indicator for every processing phase. Replaces the
// subtle three-dot ThinkingIndicator with a card that clearly communicates:
//   1. What the system is doing right now (functional headline)
//   2. An icon matching the activity
//   3. A progress ring so the user knows it's still working
//   4. A time hint so the user doesn't worry
// Addresses the core feedback: "I was super confused what was going on for first 5 mins."

interface PhaseStatusProps {
  phase: string;
}

interface PhaseInfo {
  headline: string;
  subtitle: string;
  icon: 'mic' | 'search' | 'thought' | 'check' | 'gear';
  timeHint: string;
}

const PHASE_MAP: Record<string, PhaseInfo> = {
  transcribing: {
    headline: 'Transcribing your recording…',
    subtitle: 'Reading your words back',
    icon: 'mic',
    timeHint: 'This usually takes a few seconds',
  },
  verifying: {
    headline: 'Analyzing your explanation…',
    subtitle: 'Looking for the interesting edge',
    icon: 'search',
    timeHint: 'Thinking carefully — just a moment',
  },
  reflecting: {
    headline: 'Preparing a reflection…',
    subtitle: 'Forming one question',
    icon: 'thought',
    timeHint: 'Almost there',
  },
  judging: {
    headline: 'Evaluating your response…',
    subtitle: 'Sitting with your answer',
    icon: 'check',
    timeHint: 'Thinking carefully — just a moment',
  },
};

const DEFAULT_INFO: PhaseInfo = {
  headline: 'Processing…',
  subtitle: 'One moment',
  icon: 'gear',
  timeHint: "This won't take long",
};

export function PhaseStatus({ phase }: PhaseStatusProps) {
  const info = PHASE_MAP[phase] ?? DEFAULT_INFO;

  return (
    <div
      className="animate-status-enter mx-auto w-full max-w-md"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-line bg-surface px-6 py-8 shadow-soft">
        {/* Progress ring + icon */}
        <div className="relative flex h-16 w-16 items-center justify-center">
          {/* Spinning ring */}
          <svg
            className="animate-spin-slow absolute inset-0 h-16 w-16"
            viewBox="0 0 64 64"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="3"
              className="text-line"
            />
            <path
              d="M32 4 a28 28 0 0 1 28 28"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              className="text-accent"
            />
          </svg>
          {/* Phase icon */}
          <PhaseIcon icon={info.icon} />
        </div>

        {/* Headline — the clear functional description */}
        <div className="text-center">
          <p className="text-[1.0625rem] font-medium text-ink">
            {info.headline}
          </p>
          <p className="mt-1.5 text-sm text-muted italic">
            {info.subtitle}
          </p>
        </div>

        {/* Time hint — lowers anxiety */}
        <p className="text-xs text-muted">
          {info.timeHint}
        </p>
      </div>
    </div>
  );
}

function PhaseIcon({ icon }: { icon: PhaseInfo['icon'] }) {
  const cls = "h-6 w-6 text-accent";

  switch (icon) {
    case 'mic':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <line x1="12" y1="18" x2="12" y2="21" />
        </svg>
      );
    case 'search':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
        </svg>
      );
    case 'thought':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <line x1="9" y1="9" x2="15" y2="9" />
          <line x1="9" y1="13" x2="13" y2="13" />
        </svg>
      );
    case 'check':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case 'gear':
    default:
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
  }
}
