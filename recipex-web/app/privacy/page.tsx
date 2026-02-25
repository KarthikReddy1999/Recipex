export default function PrivacyPage() {
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="text-[color:var(--text-secondary)]">How Recipex handles your account and recipe usage data.</p>
      </header>

      <section className="glass-card space-y-3 p-5 text-sm text-slate-800">
        <p>
          Recipex stores account information required for sign-in and saved recipe features. Uploaded ingredient photos
          are processed to generate recipe suggestions.
        </p>
        <p>
          We do not sell personal data. Data access is restricted using authentication and row-level security controls.
        </p>
        <p>
          For deletion requests, use the account deletion action in the Account page. The request removes your profile
          and associated app data.
        </p>
      </section>
    </div>
  );
}
