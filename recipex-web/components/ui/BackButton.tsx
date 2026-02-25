'use client';

import { useRouter } from 'next/navigation';

export function BackButton({ fallbackHref = '/discover' }: { fallbackHref?: string }) {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="glass-button inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-800"
      aria-label="Go back to previous page"
    >
      <span aria-hidden>{'<-'}</span>
      Back to Results
    </button>
  );
}
