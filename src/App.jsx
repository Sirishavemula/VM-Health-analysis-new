import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase.js';
import AuthForm from './components/AuthForm.jsx';
import Dashboard from './components/Dashboard.jsx';

export default function App() {
  const [session, setSession] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      (async () => {
        setSession(nextSession);
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

  if (!sessionReady) {
    return <div className="page-loading">Loading...</div>;
  }

  if (!session) {
    return <AuthForm />;
  }

  return <Dashboard onSignOut={handleSignOut} userEmail={session.user.email} />;
}
