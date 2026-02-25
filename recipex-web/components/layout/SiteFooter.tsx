import Link from 'next/link';

const footerLinks = [
  { href: '/about', label: 'About' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms' }
];

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-10 w-full max-w-6xl px-4 pb-6">
      <div className="glass-card flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-700">© {new Date().getFullYear()} Recipex. Built for smarter home cooking.</p>
        <nav className="flex flex-wrap gap-4 text-sm text-slate-800">
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-slate-950">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
