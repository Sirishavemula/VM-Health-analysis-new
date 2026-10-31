import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from './lib/supabase.js';
import AuthForm from './components/AuthForm.jsx';
import Dashboard from './components/Dashboard.jsx';

export default function App() {
  const [session, setSession] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          setSessionError('Cannot reach the sign-in service right now. Check your connection and refresh the page.');
        }
        setSession(data?.session ?? null);
      })
      .catch(() => {
        setSessionError('Cannot reach the sign-in service right now. Check your connection and refresh the page.');
      })
      .finally(() => setSessionReady(true));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      (async () => {
        setSession(nextSession);
        setSessionError('');
      })();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      window.alert('Could not sign out. Please try again.');
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="page-message">
        <section className="card">
          <h1>Dashboard not connected</h1>
          <p className="muted">
            The connection to the database is missing. The dashboard cannot load data until the
            database address and public key are set for this project.
          </p>
        </section>
      </main>
    );
  }

  if (!sessionReady) {
    return <div className="page-loading">Loading...</div>;
  }

  if (sessionError) {
    return (
      <main className="page-message">
        <section className="card">
          <h1>Backend unavailable</h1>
          <p className="form-error" role="alert">{sessionError}</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return <AuthForm />;
  }

  return <Dashboard onSignOut={handleSignOut} userEmail={session.user.email} />;
}
