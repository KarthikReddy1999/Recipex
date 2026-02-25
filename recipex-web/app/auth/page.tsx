'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [accountLabel, setAccountLabel] = useState<string | null>(null);
  const [redirectTarget, setRedirectTarget] = useState('/my-recipes');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const value = new URLSearchParams(window.location.search).get('redirect');
    if (!value) {
      setRedirectTarget('/my-recipes');
      return;
    }
    setRedirectTarget(value.startsWith('/') ? value : '/my-recipes');
  }, []);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let active = true;

    const loadSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user || null;
      if (!active) return;
      setIsSignedIn(Boolean(user));
      setAccountLabel(user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || null);
      if (user) {
        router.replace(redirectTarget);
      }
    };

    void loadSession();

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      setIsSignedIn(Boolean(user));
      setAccountLabel(user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || null);
      if (user) {
        router.replace(redirectTarget);
      }
    });

    return () => {
      active = false;
      authSubscription.subscription.unsubscribe();
    };
  }, [redirectTarget, router]);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setLoading(true);
      setMessage('');
      const supabase = createBrowserSupabaseClient();
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();
      if (!normalizedEmail) {
        setMessage('Enter your email.');
        return;
      }
      if (!normalizedPassword) {
        setMessage('Enter your password.');
        return;
      }
      if (mode === 'sign-up') {
        if (normalizedPassword.length < 6) {
          setMessage('Password must be at least 6 characters.');
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: normalizedPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(
              redirectTarget
            )}`
          }
        });
        if (error) {
          setMessage(error.message);
          return;
        }

        if (data.session) {
          setMessage('Account created and signed in.');
          return;
        }

        const identities = data.user?.identities ?? [];
        if (identities.length === 0) {
          setMessage(
            'An account already exists for this email. Use Sign in or Continue with Google.'
          );
          setMode('sign-in');
          return;
        }

        setMessage('Account created. Check your email inbox to verify, then sign in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: normalizedPassword
        });
        if (error) {
          if (error.message.toLowerCase().includes('email not confirmed')) {
            setMessage('Email not confirmed yet. Verify from your inbox, then sign in.');
            return;
          }
          if (error.message.toLowerCase().includes('invalid login credentials')) {
            setMessage(
              'Invalid credentials. This email may be Google-only, unconfirmed, or password is wrong. Try Continue with Google, Reset Password, or Resend Verification.'
            );
          } else {
            setMessage(error.message);
          }
        } else {
          setMessage('Signed in successfully.');
        }
      }
    } catch (authError) {
      setMessage(authError instanceof Error ? authError.message : 'Unexpected auth error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setMessage('');
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(redirectTarget)}`
        }
      });
      if (error) {
        setMessage(error.message);
      }
    } catch (authError) {
      setMessage(authError instanceof Error ? authError.message : 'Google sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      setLoading(true);
      setMessage('');
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        setMessage('Enter your email first, then click Reset password.');
        return;
      }

      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent('/account')}`
      });

      setMessage(
        error
          ? error.message
          : 'If this email exists, a reset link has been sent. Check inbox/spam.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setLoading(true);
      setMessage('');
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        setMessage('Enter your email first, then click Resend verification.');
        return;
      }

      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: normalizedEmail
      });

      setMessage(
        error
          ? error.message
          : 'If signup is pending, verification email has been resent. Check inbox/spam.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signOut();
    setMessage(error ? error.message : 'Signed out.');
  };

  const title = useMemo(() => (mode === 'sign-up' ? 'Create Account' : 'Sign In'), [mode]);

  if (isSignedIn) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="mb-4 text-3xl font-bold">Signed In</h1>
        <div className="glass-card space-y-3 p-5">
          <p className="text-sm text-slate-700">Signed in as {accountLabel || 'user'}.</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/my-recipes"
              className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Open My Recipes
            </Link>
            <Link
              href="/discover"
              className="inline-flex rounded-lg border border-slate-300 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900"
            >
              Discover
            </Link>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="inline-flex rounded-lg border border-slate-300 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900"
            >
              Sign out
            </button>
          </div>
          {message ? <p className="text-sm text-slate-700">{message}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-3xl font-bold">{title}</h1>
      <form onSubmit={handleSignIn} className="glass-card space-y-3 p-5">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          placeholder="Email"
          className="w-full rounded-lg border border-white/40 bg-white/40 p-3"
        />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          placeholder="Password"
          className="w-full rounded-lg border border-white/40 bg-white/40 p-3"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-slate-900 p-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Please wait...' : mode === 'sign-up' ? 'Create account' : 'Sign in'}
        </button>
        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          disabled={loading}
          className="w-full rounded-lg border border-slate-300 bg-white/70 p-3 text-sm font-semibold text-slate-900 disabled:opacity-60"
        >
          Continue with Google
        </button>
        <div className="flex items-center justify-between text-sm text-slate-700">
          <button
            type="button"
            onClick={() => setMode(mode === 'sign-up' ? 'sign-in' : 'sign-up')}
            className="underline"
          >
            {mode === 'sign-up' ? 'Already have an account? Sign in' : 'New here? Create account'}
          </button>
          <span />
        </div>
        <div className="flex items-center justify-between text-sm text-slate-700">
          <button
            type="button"
            onClick={() => void handleForgotPassword()}
            disabled={loading}
            className="underline disabled:opacity-60"
          >
            Reset password
          </button>
          <button
            type="button"
            onClick={() => void handleResendVerification()}
            disabled={loading}
            className="underline disabled:opacity-60"
          >
            Resend verification
          </button>
        </div>
        {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      </form>
    </div>
  );
}
