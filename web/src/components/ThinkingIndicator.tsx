interface ThinkingIndicatorProps {
  label: string;
}

// A gentle, non-anxious "working" state. Three slow dots, never a spinner racing.
export function ThinkingIndicator({ label }: ThinkingIndicatorProps) {
  return (
    <div
      className="flex items-center justify-center gap-3 py-8"
      role="status"
      aria-live="polite"
    >
      <span className="flex gap-1.5" aria-hidden="true">
        <span
          className="thinking-dot h-2 w-2 rounded-full bg-accent"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="thinking-dot h-2 w-2 rounded-full bg-accent"
          style={{ animationDelay: '200ms' }}
        />
        <span
          className="thinking-dot h-2 w-2 rounded-full bg-accent"
          style={{ animationDelay: '400ms' }}
        />
      </span>
      <span className="text-sm text-ink-soft">{label}</span>
    </div>
  );
}
