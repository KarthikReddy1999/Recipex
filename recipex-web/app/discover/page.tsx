'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FilterBar } from '@/components/ui/FilterBar';
import { SearchBar } from '@/components/ui/SearchBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { RecipeCard } from '@/components/ui/RecipeCard';
import { buildClientApiUrl } from '@/lib/api-url';
import { SearchFilters } from '@/types';

interface SearchResult {
  idMeal: string;
  strMeal: string;
  strArea: string;
  strMealThumb: string;
  strCategory: string;
  readyInMinutes?: number | null;
  difficulty?: 'easy' | 'intermediate' | 'advanced' | null;
}

export default function DiscoverPage() {
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  const buildDiscoverParams = useCallback((value: string, nextFilters: SearchFilters) => {
    const params = new URLSearchParams();

    if (value.trim()) {
      params.set('q', value.trim());
    }
    if (nextFilters.diet) {
      params.set('diet', nextFilters.diet);
    }
    if (nextFilters.maxTime) {
      params.set('maxTime', String(nextFilters.maxTime));
    }
    if (nextFilters.difficulty) {
      params.set('difficulty', nextFilters.difficulty);
    }

    return params;
  }, []);

  const runSearch = useCallback(
    async (value: string, nextFilters: SearchFilters) => {
      const params = buildDiscoverParams(value, nextFilters);

      if (!value.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(buildClientApiUrl(`/api/search?${params.toString()}`));
        const data = await response.json();
        setResults(data.results || []);
      } finally {
        setLoading(false);
      }
    },
    [buildDiscoverParams]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const urlQuery = params.get('q') || '';
    const diet = params.get('diet') || undefined;
    const maxTimeRaw = params.get('maxTime');
    const difficultyRaw = params.get('difficulty');

    const nextFilters: SearchFilters = {
      diet,
      maxTime: maxTimeRaw ? Number(maxTimeRaw) : undefined,
      difficulty:
        difficultyRaw === 'easy' || difficultyRaw === 'intermediate' || difficultyRaw === 'advanced'
          ? difficultyRaw
          : undefined
    };

    setQuery(urlQuery);
    setFilters(nextFilters);

    if (urlQuery) {
      void runSearch(urlQuery, nextFilters);
    } else {
      setResults([]);
    }
  }, [runSearch]);

  const discoverReturnHref = useMemo(() => {
    const params = buildDiscoverParams(query, filters).toString();
    return params ? `/discover?${params}` : '/discover';
  }, [buildDiscoverParams, filters, query]);

  const pushDiscoverUrl = useCallback(
    (value: string, nextFilters: SearchFilters) => {
      const params = buildDiscoverParams(value, nextFilters).toString();
      const discoverUrl = params ? `/discover?${params}` : '/discover';
      router.replace(discoverUrl, { scroll: false });
    },
    [buildDiscoverParams, router]
  );

  const handleSearch = (value: string) => {
    setQuery(value);
    pushDiscoverUrl(value, filters);
  };

  const handleFiltersChange = (nextFilters: SearchFilters) => {
    setFilters(nextFilters);
    pushDiscoverUrl(query, nextFilters);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Discover</h1>

      <SearchBar query={query} onQueryChange={setQuery} onSearch={handleSearch} />
      <FilterBar filters={filters} onChange={handleFiltersChange} />

      {loading ? <GlassCard className="p-5">Searching...</GlassCard> : null}

      <section className="grid gap-4 md:grid-cols-2">
        {results.map((meal, index) => (
          <RecipeCard
            key={meal.idMeal}
            index={index}
            recipe={{
              name: meal.strMeal,
              cuisine: meal.strArea,
              match_percent: 70,
              missing_ingredients: [],
              cooking_time_minutes: meal.readyInMinutes || 30,
              difficulty:
                meal.difficulty ||
                ((meal.readyInMinutes || 0) > 50
                  ? 'advanced'
                  : (meal.readyInMinutes || 0) > 25
                    ? 'intermediate'
                    : 'easy'),
              description: meal.strCategory,
              calories_per_serving: 350,
              servings: 2,
              themealdb_search_query: meal.strMeal,
              photo_url: meal.strMealThumb,
              themealdb_id: meal.idMeal,
              youtube_url: null
            }}
            detailHref={`/recipe/${meal.idMeal}?from=${encodeURIComponent(discoverReturnHref)}`}
          />
        ))}
      </section>
    </div>
  );
}
