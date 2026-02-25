'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { BrandWordmark } from '@/components/ui/BrandWordmark';
import { UserAvatar } from '@/components/ui/UserAvatar';

const primaryLinks = [
  { href: '/scan', label: 'Scan' },
  { href: '/discover', label: 'Discover' },
  { href: '/my-recipes', label: 'My Recipes' }
];

export function Navbar() {
  const router = useRouter();
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [accountAvatarUrl, setAccountAvatarUrl] = useState<string | null>(null);
  const [loadingAuthState, setLoadingAuthState] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let active = true;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const user = data.session?.user || null;
      setIsSignedIn(Boolean(user));
      const resolvedName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || null;
      const resolvedEmail = user?.email || null;
      const resolvedAvatar = (user?.user_metadata?.avatar_url as string | undefined) || null;
      setAccountName(resolvedName);
      setAccountEmail(resolvedEmail);
      setAccountAvatarUrl(resolvedAvatar);
      setLoadingAuthState(false);
    };

    void loadSession();

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      setIsSignedIn(Boolean(user));
      const resolvedName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || null;
      const resolvedEmail = user?.email || null;
      const resolvedAvatar = (user?.user_metadata?.avatar_url as string | undefined) || null;
      setAccountName(resolvedName);
      setAccountEmail(resolvedEmail);
      setAccountAvatarUrl(resolvedAvatar);
      if (!user) {
        setMenuOpen(false);
        setMobileOpen(false);
      }
      setLoadingAuthState(false);
    });

    return () => {
      active = false;
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onWindowClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setMobileOpen(false);
      }
    };

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setMobileOpen(false);
      }
    };

    window.addEventListener('click', onWindowClick);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('click', onWindowClick);
      window.removeEventListener('keydown', onEsc);
    };
  }, []);

  const authLabel = useMemo(() => {
    if (loadingAuthState) return 'Auth...';
    if (isSignedIn) return 'My Account';
    return 'Sign In';
  }, [isSignedIn, loadingAuthState]);

  const signOut = async () => {
    setBusy(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      setBusy(false);
      return;
    }
    setMenuOpen(false);
    setMobileOpen(false);
    setBusy(false);
    router.replace('/auth');
  };

  return (
    <header className="sticky top-4 z-40 mx-auto w-full max-w-6xl px-4">
      <nav className="glass-card relative flex items-center justify-between px-4 py-3 md:px-5">
        <Link href="/" className="inline-flex items-center">
          <BrandWordmark size="sm" />
        </Link>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/40 bg-white/35 text-slate-800 md:hidden"
          onClick={(event) => {
            event.stopPropagation();
            setMobileOpen((prev) => !prev);
          }}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>

        <div className="hidden items-center gap-4 text-sm md:flex">
          {primaryLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-slate-700 transition hover:text-slate-900">
              {link.label}
            </Link>
          ))}
          {!isSignedIn ? (
            <Link href="/auth" className="text-slate-700 transition hover:text-slate-900">
              {authLabel}
            </Link>
          ) : (
            <div ref={accountMenuRef} className="relative ml-1">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpen((prev) => !prev);
                }}
                className="inline-flex items-center gap-2 text-slate-700 transition hover:text-slate-900"
              >
                <span>{authLabel}</span>
                <span aria-hidden>{menuOpen ? '▴' : '▾'}</span>
              </button>

              {menuOpen ? (
                <div
                  className="glass-card absolute right-0 top-[calc(100%+10px)] z-50 w-[280px] max-w-[calc(100vw-1rem)] origin-top-right overflow-hidden p-0 text-left shadow-xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="border-b border-white/40 px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar
                        name={accountName}
                        email={accountEmail}
                        avatarUrl={accountAvatarUrl}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-slate-900">
                          {accountName || accountEmail || 'Account'}
                        </p>
                        {accountEmail ? <p className="truncate text-sm text-slate-600">{accountEmail}</p> : null}
                      </div>
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/account"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-slate-800 transition hover:bg-white/45"
                    >
                      Account
                    </Link>
                    <button
                      type="button"
                      onClick={() => void signOut()}
                      disabled={busy}
                      className="block w-full px-4 py-2.5 text-left text-sm text-slate-800 transition hover:bg-white/45 disabled:opacity-60"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {mobileOpen ? (
          <div
            ref={mobileMenuRef}
            className="glass-card absolute left-2 right-2 top-[calc(100%+10px)] z-50 overflow-hidden p-2 md:hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-col">
              {primaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-white/45"
                >
                  {link.label}
                </Link>
              ))}
              {!isSignedIn ? (
                <Link
                  href="/auth"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-white/45"
                >
                  {authLabel}
                </Link>
              ) : (
                <>
                  <Link
                    href="/account"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-white/45"
                  >
                    Account
                  </Link>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    disabled={busy}
                    className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-800 transition hover:bg-white/45 disabled:opacity-60"
                  >
                    Sign Out
                  </button>
                </>
              )}
            </div>
          </div>
        ) : null}
      </nav>
    </header>
  );
}
