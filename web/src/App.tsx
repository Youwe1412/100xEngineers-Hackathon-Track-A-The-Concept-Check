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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f4ef', padding: '2rem' }}>
        <div style={{ maxWidth: '480px', background: '#fcfbf8', border: '1px solid #e6e1d8', borderRadius: '16px', padding: '2rem', textAlign: 'center', boxShadow: '0 1px 2px rgba(30,42,50,0.04), 0 8px 24px rgba(30,42,50,0.06)' }}>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', color: '#1e2a32', margin: 0 }}>Almost ready.</p>
          <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.9rem', color: '#55606b', marginTop: '0.75rem', lineHeight: 1.6 }}>
            Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your Vercel environment variables, then redeploy.
          </p>
        </div>
      </div>
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
