import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './store/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)']
      },
      colors: {
        matchHigh: 'var(--color-match-high)',
        matchMid: 'var(--color-match-mid)',
        matchLow: 'var(--color-match-low)'
      },
      boxShadow: {
        glass: 'var(--glass-shadow)'
      }
    }
  },
  plugins: []
};

export default config;
