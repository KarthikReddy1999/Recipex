import Link from 'next/link';
import { motion } from 'framer-motion';
import { MatchBadge } from '@/components/ui/MatchBadge';
import { SaveRecipeButton } from '@/components/ui/SaveRecipeButton';
import { RecipeSuggestion } from '@/types';

interface RecipeCardProps {
  recipe: RecipeSuggestion;
  index: number;
  detailHref?: string;
}

export function RecipeCard({ recipe, index, detailHref }: RecipeCardProps) {
  const mealId =
    recipe.themealdb_id ||
    `${recipe.name.toLowerCase().replace(/\s+/g, '-')}-${recipe.cuisine.toLowerCase().replace(/\s+/g, '-')}`;
  const fallbackParams = new URLSearchParams({
    from: '/scan',
    name: recipe.name,
    cuisine: recipe.cuisine,
    description: recipe.description,
    time: String(recipe.cooking_time_minutes),
    difficulty: recipe.difficulty,
    match: String(recipe.match_percent),
    missing: (recipe.missing_ingredients || []).join('|')
  });
  if (recipe.photo_url) {
    fallbackParams.set('photo', recipe.photo_url);
  }
  if (recipe.youtube_url) {
    fallbackParams.set('youtube', recipe.youtube_url);
  }
  const resolvedDetailHref =
    detailHref || (recipe.themealdb_id ? `/recipe/${recipe.themealdb_id}` : `/recipe/${mealId}?${fallbackParams.toString()}`);

  return (
    <motion.article
      className="glass-card overflow-hidden"
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      {recipe.photo_url ? (
        <img src={recipe.photo_url} alt={recipe.name} className="h-44 w-full object-cover" />
      ) : (
        <img src="/asset4.png" alt={recipe.name} className="h-44 w-full object-cover" />
      )}

      <div className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold">{recipe.name}</h3>
          <MatchBadge percent={recipe.match_percent} />
        </div>

        <p className="text-sm text-[color:var(--text-secondary)]">{recipe.description}</p>

        <div className="flex flex-wrap gap-2 text-xs text-slate-700">
          <span className="rounded-full bg-white/45 px-3 py-1">{recipe.cuisine}</span>
          <span className="rounded-full bg-white/45 px-3 py-1">{recipe.cooking_time_minutes} min</span>
          <span className="rounded-full bg-white/45 px-3 py-1">{recipe.difficulty}</span>
        </div>

        <div className="flex flex-wrap items-start gap-2">
          <Link
            href={resolvedDetailHref}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white whitespace-nowrap"
          >
            Open recipe
          </Link>
          <SaveRecipeButton
            mealId={mealId}
            mealName={recipe.name}
            mealThumb={recipe.photo_url || null}
            cuisine={recipe.cuisine}
            showMessage={false}
          />
        </div>
      </div>
    </motion.article>
  );
}
