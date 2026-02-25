export default function TermsPage() {
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Terms of Use</h1>
        <p className="text-[color:var(--text-secondary)]">Basic terms for using Recipex responsibly.</p>
      </header>

      <section className="glass-card space-y-3 p-5 text-sm text-slate-800">
        <p>Recipe suggestions are provided for convenience and may require your own judgment for allergies or health conditions.</p>
        <p>Users are responsible for account security, including password management and safe usage of shared devices.</p>
        <p>Recipex may update features and integrations over time to improve quality, reliability, and safety.</p>
      </section>
    </div>
  );
}
