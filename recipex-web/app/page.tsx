import Link from 'next/link';
import { BrandWordmark } from '@/components/ui/BrandWordmark';
import { GlassCard } from '@/components/ui/GlassCard';

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="grid gap-6 py-10 md:grid-cols-2 md:items-center">
        <div>
          <p className="mb-3 text-sm uppercase tracking-[0.2em] text-slate-700">AI Pantry to Plate</p>
          <h1 className="mb-4 leading-tight">
            <BrandWordmark size="lg" />
          </h1>
          <p className="mb-8 max-w-xl text-lg text-[color:var(--text-secondary)]">
            Scan ingredients, get high-match recipes, and auto-build shopping lists with one premium
            web workflow.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/scan" className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
              Start scanning
            </Link>
            <Link href="/discover" className="glass-button px-5 py-3 text-sm font-semibold">
              Discover recipes
            </Link>
          </div>
        </div>

        <GlassCard className="relative overflow-hidden p-0">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-teal-200/45 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-orange-200/45 blur-3xl" />
          <div className="relative">
            <img
              src="/asset3.png"
              alt="AI powered recipe intelligence"
              className="h-64 w-full object-cover md:h-72"
            />
          </div>
          <div className="relative space-y-4 p-8">
            <h2 className="text-3xl">Why Recipex Works</h2>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>Scan ingredients and instantly get recipes ranked by match score</li>
              <li>See missing ingredients, cooking time, and difficulty before you start</li>
              <li>Build shopping lists in one tap from what your pantry is missing</li>
              <li>Save favorites to your account and cook with a clean guided flow</li>
            </ul>
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
