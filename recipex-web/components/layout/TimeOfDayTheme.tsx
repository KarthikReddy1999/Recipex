'use client';

import { useEffect } from 'react';

export function TimeOfDayTheme() {
  useEffect(() => {
    const hour = new Date().getHours();
    const isEvening = hour >= 18;
    const gradient =
      hour < 10 ? 'var(--bg-dawn)' : isEvening ? 'var(--bg-evening)' : 'var(--bg-day)';
    const headingColor = isEvening ? '#e8f2ff' : '#223645';

    document.body.style.background = gradient;
    document.documentElement.style.setProperty('--text-heading', headingColor);
  }, []);

  return null;
}
