import type { ReactNode } from 'react';

interface ShellProps {
  children: ReactNode;
  onSignOut?: () => void;
}

// A calm, centered reading column. One product mark, quiet chrome, generous space.
export function Shell({ children, onSignOut }: ShellProps) {
  return (
    <div className="min-h-full flex flex-col">
      <header className="w-full">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-5">
          <span className="text-sm font-medium tracking-wide text-ink-soft">
            Concept Check
          </span>
          {onSignOut ? (
            <button
              type="button"
              onClick={onSignOut}
              className="text-sm text-muted transition-colors hover:text-ink-soft"
            >
              Sign out
            </button>
          ) : null}
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-24">
        {children}
      </main>
    </div>
  );
}
