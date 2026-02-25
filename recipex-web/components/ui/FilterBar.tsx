'use client';

import { SearchFilters } from '@/types';

interface FilterBarProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  return (
    <div className="glass-card grid gap-3 p-4 md:grid-cols-3">
      <select
        className="rounded-lg border border-white/40 bg-white/35 p-2 text-sm"
        value={filters.diet || ''}
        onChange={(event) => onChange({ ...filters, diet: event.target.value || undefined })}
      >
        <option value="">Any diet</option>
        <option value="vegan">Vegan</option>
        <option value="vegetarian">Vegetarian</option>
        <option value="keto">Keto</option>
        <option value="gluten-free">Gluten free</option>
      </select>

      <select
        className="rounded-lg border border-white/40 bg-white/35 p-2 text-sm"
        value={filters.maxTime || ''}
        onChange={(event) => onChange({ ...filters, maxTime: Number(event.target.value) || undefined })}
      >
        <option value="">Any time</option>
        <option value="15">Under 15 min</option>
        <option value="30">15-30 min</option>
        <option value="60">30-60 min</option>
      </select>

      <select
        className="rounded-lg border border-white/40 bg-white/35 p-2 text-sm"
        value={filters.difficulty || ''}
        onChange={(event) => onChange({ ...filters, difficulty: (event.target.value as SearchFilters['difficulty']) || undefined })}
      >
        <option value="">Any difficulty</option>
        <option value="easy">Easy</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
      </select>
    </div>
  );
}
