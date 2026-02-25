'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildClientApiUrl } from '@/lib/api-url';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/GlassCard';
import { UserAvatar } from '@/components/ui/UserAvatar';

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let active = true;

    const load = async () => {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!active) return;
      if (!session) {
        setIsSignedIn(false);
        setLoading(false);
        return;
      }

      const user = session.user;
      setIsSignedIn(true);
      setEmail(user.email || '');
      setNewEmail(user.email || '');
      setDisplayName(user.user_metadata?.full_name || user.user_metadata?.name || '');
      setAvatarUrl((user.user_metadata?.avatar_url as string | undefined) || null);

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (!active) return;
      if (profile?.name) {
        setDisplayName(profile.name);
      }
      if (profile?.avatar_url) {
        setAvatarUrl(profile.avatar_url);
      }
      setLoading(false);
    };

    void load();

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session) {
        setIsSignedIn(false);
        setEmail('');
      }
    });

    return () => {
      active = false;
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  const updateProfile = async () => {
    setBusy(true);
    setStatus('');
    const supabase = createBrowserSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      setStatus('Please sign in again.');
      setBusy(false);
      return;
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: displayName }
    });
    if (authError) {
      setStatus(authError.message);
      setBusy(false);
      return;
    }

    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        name: displayName,
        avatar_url: user.user_metadata?.avatar_url || null
      },
      { onConflict: 'id' }
    );

    setStatus(profileError ? profileError.message : 'Profile updated.');
    setBusy(false);
  };

  const updateEmail = async () => {
    setBusy(true);
    setStatus('');
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setStatus(error ? error.message : 'Email update requested. Check your inbox to confirm.');
    setBusy(false);
  };

  const updatePassword = async () => {
    setBusy(true);
    setStatus('');
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setStatus(error ? error.message : 'Password updated.');
    if (!error) {
      setNewPassword('');
    }
    setBusy(false);
  };

  const signOut = async () => {
    setBusy(true);
    setStatus('');
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      setStatus(error.message);
      setBusy(false);
      return;
    }
    router.replace('/auth');
  };

  const deleteAccount = async () => {
    if (deleteConfirmText.trim() !== 'DELETE') {
      setStatus('Type DELETE to confirm account deletion.');
      return;
    }

    setBusy(true);
    setStatus('');
    const supabase = createBrowserSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setStatus('Please sign in again.');
      setBusy(false);
      return;
    }

    try {
      const response = await fetch(buildClientApiUrl('/api/account'), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus((data as { error?: string }).error || 'Account deletion failed.');
        setBusy(false);
        return;
      }

      await supabase.auth.signOut();
      router.replace('/auth');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Account deletion failed.');
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Account</h1>
        <GlassCard className="p-6">Loading account...</GlassCard>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Account</h1>
        <GlassCard className="space-y-3 p-6">
          <p className="text-[color:var(--text-secondary)]">Sign in to view and manage your account.</p>
          <Link href="/auth?redirect=%2Faccount" className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Sign In
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Account</h1>

      <GlassCard className="space-y-4 p-6">
        <div className="flex items-center gap-3">
          <UserAvatar name={displayName} email={email} avatarUrl={avatarUrl} size="lg" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Signed in as</p>
            <p className="text-base font-semibold text-slate-900">{displayName || email}</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Email</p>
          <p className="text-base font-medium text-slate-900">{email}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700" htmlFor="displayName">
            Username
          </label>
          <input
            id="displayName"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="w-full rounded-lg border border-white/40 bg-white/50 p-3"
          />
          <button
            type="button"
            onClick={() => void updateProfile()}
            disabled={busy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Update Username
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700" htmlFor="newEmail">
            Change Email
          </label>
          <input
            id="newEmail"
            type="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            className="w-full rounded-lg border border-white/40 bg-white/50 p-3"
          />
          <button
            type="button"
            onClick={() => void updateEmail()}
            disabled={busy}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Update Email
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700" htmlFor="newPassword">
            Change Password
          </label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="w-full rounded-lg border border-white/40 bg-white/50 p-3"
          />
          <button
            type="button"
            onClick={() => void updatePassword()}
            disabled={busy || newPassword.length < 6}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Update Password
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={busy}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Sign Out
          </button>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50/70 p-4">
          <p className="text-sm font-semibold text-red-800">Danger Zone</p>
          <p className="mt-1 text-sm text-red-700">
            Delete your account permanently. This removes profile and saved data.
          </p>
          {!deleteConfirmOpen ? (
            <button
              type="button"
              onClick={() => {
                setDeleteConfirmOpen(true);
                setDeleteConfirmText('');
                setStatus('');
              }}
              disabled={busy}
              className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Delete Account
            </button>
          ) : (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-800">
                Type DELETE to confirm
              </p>
              <input
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value)}
                placeholder="DELETE"
                className="w-full rounded-lg border border-red-300 bg-white/85 p-3 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setDeleteConfirmText('');
                    setStatus('');
                  }}
                  disabled={busy}
                  className="rounded-lg border border-red-300 bg-white/80 px-4 py-2 text-sm font-semibold text-red-800 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void deleteAccount()}
                  disabled={busy || deleteConfirmText.trim() !== 'DELETE'}
                  className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          )}
        </div>

        {status ? <p className="text-sm text-slate-700">{status}</p> : null}
      </GlassCard>
    </div>
  );
}
