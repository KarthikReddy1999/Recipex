interface IngredientListProps {
  available: string[];
  missing: string[];
  mode?: 'checklist' | 'plain';
}

export function IngredientList({ available, missing, mode = 'checklist' }: IngredientListProps) {
  if (mode === 'plain') {
    return (
      <div>
        <ul className="space-y-1 text-sm">
          {available.map((item) => (
            <li key={`ingredient-${item}`} className="text-slate-800">
              {item}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-700">Have</h3>
        <ul className="space-y-1 text-sm">
          {available.map((item) => (
            <li key={`have-${item}`} className="text-slate-800">
              {`[OK] ${item}`}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-700">Missing</h3>
        <ul className="space-y-1 text-sm">
          {missing.map((item) => (
            <li key={`miss-${item}`} className="text-slate-800">
              {`[ ] ${item}`}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
