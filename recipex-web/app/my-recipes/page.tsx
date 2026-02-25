'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/GlassCard';

interface SavedRecipe {
  id: string;
  meal_name: string;
  meal_thumb: string | null;
  cuisine: string | null;
  cook_count: number | null;
  saved_at: string | null;
}

export default function MyRecipesPage() {
  const [loading, setLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let active = true;

    const loadMyRecipes = async () => {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!active) return;

      if (!session) {
        setIsSignedIn(false);
        setRecipes([]);
        setLoading(false);
        return;
      }

      setIsSignedIn(true);

      const { data, error: queryError } = await supabase
        .from('saved_recipes')
        .select('id, meal_name, meal_thumb, cuisine, cook_count, saved_at')
        .order('saved_at', { ascending: false })
        .limit(30);

      if (!active) return;

      if (queryError) {
        setError(queryError.message);
        setRecipes([]);
      } else {
        setRecipes((data || []) as SavedRecipe[]);
      }

      setLoading(false);
    };

    void loadMyRecipes();

    const { data: authSubscription } = supabase.auth.onAuthStateChange(() => {
      void loadMyRecipes();
    });

    return () => {
      active = false;
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  const removeRecipe = async (savedRecipeId: string) => {
    setRemovingId(savedRecipeId);
    setError(null);
    const supabase = createBrowserSupabaseClient();
    const { error: deleteError } = await supabase.from('saved_recipes').delete().eq('id', savedRecipeId);
    if (deleteError) {
      setError(deleteError.message);
      setRemovingId(null);
      return;
    }
    setRecipes((prev) => prev.filter((recipe) => recipe.id !== savedRecipeId));
    setRemovingId(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Recipes</h1>
        <GlassCard className="p-6">
          <p className="text-[color:var(--text-secondary)]">Loading your recipes...</p>
        </GlassCard>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Recipes</h1>
        <GlassCard className="p-6">
          <p className="text-[color:var(--text-secondary)]">
            Sign in to view saved recipes, cooking history, and shopping lists.
          </p>
          <Link href="/auth" className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Sign In / Create Account
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Recipes</h1>
      {error ? (
        <GlassCard className="p-6">
          <p className="text-sm text-red-700">{error}</p>
        </GlassCard>
      ) : null}

      {!error && recipes.length === 0 ? (
        <GlassCard className="p-6">
          <p className="text-[color:var(--text-secondary)]">
            No saved recipes yet. Start from Discover or Scan and save your favorites.
          </p>
        </GlassCard>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        {recipes.map((recipe) => (
          <GlassCard key={recipe.id} className="overflow-hidden p-0">
            {recipe.meal_thumb ? (
              <img src={recipe.meal_thumb} alt={recipe.meal_name} className="h-44 w-full object-cover" />
            ) : null}
            <div className="space-y-1 p-4">
              <h2 className="text-xl font-semibold">{recipe.meal_name}</h2>
              <p className="text-sm text-[color:var(--text-secondary)]">
                {(recipe.cuisine || 'Global') + ' | Cooked ' + (recipe.cook_count || 0) + ' times'}
              </p>
              <p className="text-xs text-slate-500">
                Saved {recipe.saved_at ? new Date(recipe.saved_at).toLocaleDateString() : 'recently'}
              </p>
              <button
                type="button"
                onClick={() => void removeRecipe(recipe.id)}
                disabled={removingId === recipe.id}
                className="inline-flex rounded-lg border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 disabled:opacity-60"
              >
                {removingId === recipe.id ? 'Removing...' : 'Unsave'}
              </button>
            </div>
          </GlassCard>
        ))}
      </section>
    </div>
  );
}
