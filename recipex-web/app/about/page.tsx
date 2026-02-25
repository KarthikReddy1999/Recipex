export default function AboutPage() {
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">About Recipex</h1>
        <p className="text-[color:var(--text-secondary)]">
          Recipex helps home cooks convert pantry ingredients into practical recipes using AI.
        </p>
      </header>

      <section className="glass-card space-y-3 p-5 text-sm text-slate-800">
        <p>
          We built Recipex to answer one daily question: what can I cook right now with what I already have? Upload
          ingredients, get matched recipes, and cook with less waste.
        </p>
        <p>
          The platform combines ingredient analysis, recipe search, and match scoring so you can decide faster and cook
          with confidence.
        </p>
      </section>
    </div>
  );
}
