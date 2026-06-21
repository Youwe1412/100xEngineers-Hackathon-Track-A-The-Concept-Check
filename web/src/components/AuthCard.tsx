import { useState } from 'react';
import { supabase } from '../lib/supabase.ts';

type Mode = 'signin' | 'signup';

// One quiet centered card. The product's purpose is stated honestly, with no
// pressure. Email and password keep the whole diagnostic in a single sitting.
export function AuthCard() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (signUpError) throw signUpError;
        // If email confirmation is on, there is no session yet.
        if (!data.session) {
          setNotice('Check your email to confirm, then sign in.');
          setMode('signin');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign you in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 shadow-soft">
        <h1 className="font-serif text-2xl leading-tight text-ink">
          The Seam Finder
        </h1>
        <p className="mt-1 text-xs uppercase tracking-wider text-muted font-medium">
          By Yuvrajsinh Gohil
        </p>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
          Find out whether you truly understand a concept, or just recognize the
          words.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm text-ink-soft">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-line bg-bg px-3.5 py-2.5 text-ink outline-none transition-colors focus:border-accent"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm text-ink-soft">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-line bg-bg px-3.5 py-2.5 text-ink outline-none transition-colors focus:border-accent"
            />
          </div>

          {error ? (
            <p className="text-sm text-seam" role="alert">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="text-sm text-accent" role="status">
              {notice}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            {busy
              ? 'One moment...'
              : mode === 'signin'
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'));
            setError(null);
            setNotice(null);
          }}
          className="mt-5 w-full text-center text-sm text-muted transition-colors hover:text-ink-soft"
        >
          {mode === 'signin'
            ? 'New here? Create an account'
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
