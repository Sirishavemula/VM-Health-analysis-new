import { useState } from 'react';
import { supabase } from '../lib/supabase.js';

const MIN_PASSWORD_LENGTH = 8;

export default function AuthForm() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isSignUp = mode === 'signup';

  function switchMode(nextMode) {
    setMode(nextMode);
    setError('');
    setNotice('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (isSignUp && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setSubmitting(true);
    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) {
          const serviceDown = !signUpError.status || signUpError.status >= 500;
          setError(
            serviceDown
              ? 'The sign-in service is unavailable right now. Check your connection and try again.'
              : signUpError.message.toLowerCase().includes('already')
                ? 'An account with this email already exists. Try signing in.'
                : 'Could not create your account. Please check your details and try again.',
          );
          return;
        }
        if (!data.session) {
          setNotice('Account created. Sign in with your email and password.');
          switchMode('signin');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          const serviceDown = !signInError.status || signInError.status >= 500;
          setError(
            serviceDown
              ? 'The sign-in service is unavailable right now. Check your connection and try again.'
              : 'Email or password is incorrect.',
          );
        }
      }
    } catch {
      setError('The sign-in service is unavailable right now. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>VM Health Dashboard</h1>
        <p className="auth-subtitle">
          {isSignUp ? 'Create an account to view machine health.' : 'Sign in to view machine health.'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="form-notice">{notice}</p>}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          {isSignUp ? 'Already have an account?' : 'New here?'}{' '}
          <button
            type="button"
            className="link-button"
            onClick={() => switchMode(isSignUp ? 'signin' : 'signup')}
          >
            {isSignUp ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </section>
    </main>
  );
}
