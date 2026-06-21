interface ThinkingIndicatorProps {
  label: string;
}

// A gentle, non-anxious "working" state for initial loading. Three slow dots, never
// a spinner racing. Wrapped in a soft card so it's clearly visible as a status.
export function ThinkingIndicator({ label }: ThinkingIndicatorProps) {
  return (
    <div
      className="flex flex-1 items-center justify-center py-12"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface px-8 py-8 shadow-soft animate-status-enter">
        <span className="flex gap-1.5" aria-hidden="true">
          <span
            className="thinking-dot h-2.5 w-2.5 rounded-full bg-accent"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="thinking-dot h-2.5 w-2.5 rounded-full bg-accent"
            style={{ animationDelay: '200ms' }}
          />
          <span
            className="thinking-dot h-2.5 w-2.5 rounded-full bg-accent"
            style={{ animationDelay: '400ms' }}
          />
        </span>
        <span className="text-[0.95rem] font-medium text-ink">{label}</span>
        <span className="text-xs text-muted">{"This won't take long"}</span>
      </div>
    </div>
  );
}

