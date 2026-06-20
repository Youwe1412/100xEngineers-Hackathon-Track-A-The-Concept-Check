import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isConfigured } from './lib/supabase.ts';
import { Shell } from './components/Shell.tsx';
import { AuthCard } from './components/AuthCard.tsx';
import { SessionView } from './components/SessionView.tsx';
import { ThinkingIndicator } from './components/ThinkingIndicator.tsx';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!isConfigured) {
    return (
      <Shell>
        <div className="flex flex-1 items-center justify-center">
          <div className="max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-soft">
            <p className="font-serif text-xl text-ink">Almost ready.</p>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
              Copy web/.env.example to web/.env and add your Supabase URL and anon
              key, then reload.
            </p>
          </div>
        </div>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <ThinkingIndicator label="Loading..." />
      </Shell>
    );
  }

  if (!session) {
    return (
      <Shell>
        <AuthCard />
      </Shell>
    );
  }

  return (
    <Shell onSignOut={() => void supabase.auth.signOut()}>
      <SessionView />
    </Shell>
  );
}
