import { BackButton } from '@/components/ui/BackButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { IngredientList } from '@/components/ui/IngredientList';
import { SaveRecipeButton } from '@/components/ui/SaveRecipeButton';
import { buildServerApiUrl } from '@/lib/api-url';

interface RecipeDetail {
  idMeal: string;
  strMeal: string;
  strArea: string;
  strMealThumb: string;
  strCategory: string;
  strYoutube: string;
  strInstructions: string;
  ingredients: string[];
  readyInMinutes?: number | null;
  difficulty?: 'easy' | 'intermediate' | 'advanced' | null;
  temperatureHint?: string | null;
  sourceUrl?: string | null;
}

interface FallbackRecipeDetail {
  id: string;
  name: string;
  cuisine: string;
  description: string;
  time: string;
  difficulty: string;
  match: string;
  photo: string | null;
  youtube: string | null;
  haveIngredients: string[];
  missingIngredients: string[];
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function safeFromPath(value: string | string[] | undefined): string {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue) return '/discover';

  const decoded = (() => {
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  })();

  return decoded.startsWith('/') ? decoded : '/discover';
}

function parseFallbackRecipe(
  id: string,
  searchParams?: {
    from?: string | string[];
    name?: string | string[];
    cuisine?: string | string[];
    description?: string | string[];
    time?: string | string[];
    difficulty?: string | string[];
    match?: string | string[];
    photo?: string | string[];
    youtube?: string | string[];
    have?: string | string[];
    missing?: string | string[];
  }
): FallbackRecipeDetail | null {
  const name = firstParam(searchParams?.name)?.trim();
  if (!name) return null;

  const haveRaw = firstParam(searchParams?.have) || '';
  const haveIngredients = haveRaw
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);

  const missingRaw = firstParam(searchParams?.missing) || '';
  const missingIngredients = missingRaw
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    id,
    name,
    cuisine: firstParam(searchParams?.cuisine) || 'Global',
    description: firstParam(searchParams?.description) || 'Recipe details generated from pantry scan.',
    time: firstParam(searchParams?.time) || '-',
    difficulty: firstParam(searchParams?.difficulty) || '-',
    match: firstParam(searchParams?.match) || '-',
    photo: firstParam(searchParams?.photo) || null,
    youtube: firstParam(searchParams?.youtube) || null,
    haveIngredients,
    missingIngredients
  };
}

export default async function RecipeDetailPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: {
    from?: string | string[];
    name?: string | string[];
    cuisine?: string | string[];
    description?: string | string[];
    time?: string | string[];
    difficulty?: string | string[];
    match?: string | string[];
    photo?: string | string[];
    youtube?: string | string[];
    have?: string | string[];
    missing?: string | string[];
  };
}) {
  const response = await fetch(
    buildServerApiUrl(`/api/recipes/${encodeURIComponent(params.id)}`),
    { cache: 'no-store' }
  );

  const recipe = response.ok ? ((await response.json())?.recipe as RecipeDetail | undefined) : null;
  const fallbackRecipe = recipe ? null : parseFallbackRecipe(params.id, searchParams);
  const fallbackHref = safeFromPath(searchParams?.from);

  if (!recipe && !fallbackRecipe) {
    return <GlassCard className="p-6">Recipe not found.</GlassCard>;
  }

  if (!recipe && fallbackRecipe) {
    return (
      <div className="space-y-8">
        <div>
          <BackButton fallbackHref={fallbackHref} />
        </div>

        <section className="glass-card overflow-hidden">
          {fallbackRecipe.photo ? (
            <img src={fallbackRecipe.photo} alt={fallbackRecipe.name} className="h-64 w-full object-cover" />
          ) : (
            <div className="flex h-64 w-full items-center justify-center bg-white/20 text-sm font-semibold text-slate-700">
              Image unavailable
            </div>
          )}
          <div className="space-y-4 p-6">
            <h1 className="text-3xl font-bold">{fallbackRecipe.name}</h1>
            <p className="text-sm font-medium text-slate-700">
              {fallbackRecipe.cuisine} | {fallbackRecipe.time} min | {fallbackRecipe.difficulty} |{' '}
              {fallbackRecipe.match}% match
            </p>
            <SaveRecipeButton
              mealId={fallbackRecipe.id}
              mealName={fallbackRecipe.name}
              mealThumb={fallbackRecipe.photo}
              cuisine={fallbackRecipe.cuisine}
            />
            <p className="recipe-instructions whitespace-pre-line">{fallbackRecipe.description}</p>

            {fallbackRecipe.youtube ? (
              <a
                href={fallbackRecipe.youtube}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
              >
                View Cooking Video
              </a>
            ) : null}
          </div>
        </section>

        <GlassCard className="p-6">
          <h2 className="mb-4 text-2xl font-semibold">Ingredients</h2>
          {fallbackRecipe.haveIngredients.length || fallbackRecipe.missingIngredients.length ? (
            <IngredientList
              available={fallbackRecipe.haveIngredients}
              missing={fallbackRecipe.missingIngredients}
              mode="checklist"
            />
          ) : (
            <p className="text-sm text-slate-700">Ingredients are unavailable for this recipe.</p>
          )}
        </GlassCard>

      </div>
    );
  }

  if (!recipe) {
    return <GlassCard className="p-6">Recipe not found.</GlassCard>;
  }

  return (
    <div className="space-y-8">
      <div>
        <BackButton fallbackHref={fallbackHref} />
      </div>

      <section className="glass-card overflow-hidden">
        <img src={recipe.strMealThumb} alt={recipe.strMeal} className="h-64 w-full object-cover" />
        <div className="space-y-4 p-6">
          <h1 className="text-3xl font-bold">{recipe.strMeal}</h1>
          <p className="text-sm font-medium text-slate-700">
            {[
              recipe.strArea,
              recipe.strCategory,
              recipe.readyInMinutes ? `${recipe.readyInMinutes} min` : null,
              recipe.difficulty || null,
              recipe.temperatureHint ? `Temp ${recipe.temperatureHint}` : null
            ]
              .filter(Boolean)
              .join(' | ')}
          </p>
          <SaveRecipeButton
            mealId={recipe.idMeal}
            mealName={recipe.strMeal}
            mealThumb={recipe.strMealThumb}
            cuisine={recipe.strArea}
          />
          <p className="recipe-instructions whitespace-pre-line">{recipe.strInstructions}</p>

          {recipe.sourceUrl ? (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-xl border border-white/70 bg-white/45 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-white/60"
            >
              View source recipe
            </a>
          ) : null}

          {recipe.strYoutube ? (
            <a
              href={recipe.strYoutube}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              View Cooking Video
            </a>
          ) : null}
        </div>
      </section>

      <GlassCard className="p-6">
        <h2 className="mb-4 text-2xl font-semibold">Ingredients</h2>
        <IngredientList available={recipe.ingredients} missing={[]} mode="plain" />
      </GlassCard>

    </div>
  );
}
