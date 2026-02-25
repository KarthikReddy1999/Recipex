import type { Metadata } from 'next';
import { DM_Sans, Montserrat, Playfair_Display } from 'next/font/google';
import { Navbar } from '@/components/layout/Navbar';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { TimeOfDayTheme } from '@/components/layout/TimeOfDayTheme';
import './globals.css';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-body' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-display' });
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-brand', weight: ['700', '800'] });

export const metadata: Metadata = {
  title: 'Recipex',
  description: 'AI powered recipe assistant for web'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${playfair.variable} ${montserrat.variable} font-body`}>
        <TimeOfDayTheme />
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-8">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
