'use client';

import { FormEvent, useMemo, useState } from 'react';

interface SearchBarProps {
  initialQuery?: string;
  query?: string;
  onQueryChange?: (query: string) => void;
  onSearch: (query: string) => void;
}

export function SearchBar({ initialQuery = '', query, onQueryChange, onSearch }: SearchBarProps) {
  const [internalQuery, setInternalQuery] = useState(initialQuery);
  const currentQuery = useMemo(
    () => (typeof query === 'string' ? query : internalQuery),
    [query, internalQuery]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(currentQuery.trim());
  };

  const handleChange = (value: string) => {
    if (onQueryChange) {
      onQueryChange(value);
      return;
    }

    setInternalQuery(value);
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card flex items-center gap-3 p-3">
      <input
        value={currentQuery}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="Try: quick vegan pasta for rainy evening"
        className="w-full bg-transparent px-2 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500"
      />
      <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
        Search
      </button>
    </form>
  );
}
