import { useState } from 'react';

interface TextFallbackProps {
  busy: boolean;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

// The "type instead" path. Same dignity as speaking; the typed words become the
// learner's turn and follow the identical diagnostic flow.
export function TextFallback({ busy, onSubmit, onCancel }: TextFallbackProps) {
  const [text, setText] = useState('');
  const trimmed = text.trim();

  return (
    <div className="w-full">
      <label htmlFor="answer-text" className="sr-only">
        Type your answer
      </label>
      <textarea
        id="answer-text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={5}
        autoFocus
        placeholder="Take your time. Think out loud here."
        className="w-full resize-y rounded-xl border border-line bg-surface px-4 py-3 font-serif text-[1.0625rem] leading-relaxed text-ink outline-none transition-colors focus:border-accent"
      />
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-muted transition-colors hover:text-ink-soft"
        >
          Speak instead
        </button>
        <button
          type="button"
          disabled={busy || trimmed.length === 0}
          onClick={() => onSubmit(trimmed)}
          className="rounded-lg bg-accent px-5 py-2 font-medium text-white transition-opacity hover:opacity-95 disabled:opacity-50"
        >
          {busy ? 'One moment...' : 'Share this'}
        </button>
      </div>
    </div>
  );
}
