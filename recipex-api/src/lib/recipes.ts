import {
  getSpoonacularRecipeById,
  hasUsableSpoonacularApiKey,
  searchSpoonacularRecipes
} from './spoonacular';
import { optimizeRemoteImageUrl } from './cloudinary';
import { extractIngredients, lookupMealById, searchMealsByName } from './themealdb';
import { buildYouTubeSearchUrl } from './youtube';

export interface RecipeListItem {
  idMeal: string;
  strMeal: string;
  strArea: string;
  strMealThumb: string;
  strCategory: string;
  strYoutube: string;
  readyInMinutes: number | null;
  difficulty: 'easy' | 'intermediate' | 'advanced' | null;
  temperatureHint: string | null;
  sourceUrl: string | null;
}

export interface RecipeDetailItem extends RecipeListItem {
  strInstructions: string;
  ingredients: string[];
}

interface UnifiedSearchParams {
  query: string;
  cuisine?: string;
  diet?: string;
  maxTime?: number;
}

function uniqueTerms(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];

  const tokens = trimmed
    .split(/\s+/)
    .map((token) => token.toLowerCase().replace(/[^a-z0-9-]/gi, ''))
    .filter((token) => token.length > 2);

  return [...new Set([trimmed, ...tokens])];
}

function normalizeRecipeId(id: string): { provider: 'spoon' | 'mealdb'; rawId: string } {
  if (id.startsWith('spoon-')) {
    return { provider: 'spoon', rawId: id.replace('spoon-', '') };
  }

  return { provider: 'mealdb', rawId: id };
}

function difficultyFromTime(minutes: number | null): 'easy' | 'intermediate' | 'advanced' | null {
  if (!minutes || Number.isNaN(minutes)) return null;
  if (minutes <= 25) return 'easy';
  if (minutes <= 50) return 'intermediate';
  return 'advanced';
}

function extractTemperatureHint(instructions: string | undefined): string | null {
  if (!instructions) return null;

  const tempMatch = instructions.match(/(\d{2,3})\s*°?\s*(f|c)\b/i);
  if (tempMatch) {
    return `${tempMatch[1]}${tempMatch[2].toUpperCase()}`;
  }

  const fahrenheitWordMatch = instructions.match(/(\d{2,3})\s*degrees?\s*fahrenheit/i);
  if (fahrenheitWordMatch) {
    return `${fahrenheitWordMatch[1]}F`;
  }

  const celsiusWordMatch = instructions.match(/(\d{2,3})\s*degrees?\s*celsius/i);
  if (celsiusWordMatch) {
    return `${celsiusWordMatch[1]}C`;
  }

  return null;
}

function spoonToListItem(item: {
  id: number;
  title: string;
  image: string | null;
  cuisine: string;
  category: string;
  readyInMinutes: number | null;
  sourceUrl: string | null;
}): RecipeListItem {
  return {
    idMeal: `spoon-${item.id}`,
    strMeal: item.title,
    strArea: item.cuisine,
    strMealThumb: optimizeRemoteImageUrl(item.image || '', { width: 960, height: 640, crop: 'fill' }),
    strCategory: item.category,
    strYoutube: buildYouTubeSearchUrl(item.title),
    readyInMinutes: item.readyInMinutes,
    difficulty: difficultyFromTime(item.readyInMinutes),
    temperatureHint: null,
    sourceUrl: item.sourceUrl
  };
}

function mealDbToListItem(item: {
  idMeal: string;
  strMeal: string;
  strArea: string;
  strMealThumb: string;
  strCategory: string;
}): RecipeListItem {
  return {
    idMeal: item.idMeal,
    strMeal: item.strMeal,
    strArea: item.strArea,
    strMealThumb: optimizeRemoteImageUrl(item.strMealThumb, { width: 960, height: 640, crop: 'fill' }),
    strCategory: item.strCategory,
    strYoutube: buildYouTubeSearchUrl(item.strMeal),
    readyInMinutes: null,
    difficulty: null,
    temperatureHint: null,
    sourceUrl: null
  };
}

export async function searchRecipesUnified(params: UnifiedSearchParams): Promise<RecipeListItem[]> {
  const hasSpoonKey = hasUsableSpoonacularApiKey(process.env.SPOONACULAR_API_KEY);

  if (hasSpoonKey) {
    try {
      const spoonResults = await searchSpoonacularRecipes({
        query: params.query,
        cuisine: params.cuisine,
        diet: params.diet,
        maxReadyTime: params.maxTime,
        number: 16
      });

      if (spoonResults.length > 0) {
        return spoonResults.map(spoonToListItem);
      }
    } catch {
      // Continue with TheMealDB fallback.
    }
  }

  let meals = await searchMealsByName(params.query).catch(() => []);
  if (!meals.length) {
    const fallbackTerms = uniqueTerms(params.query);
    const fetched = await Promise.all(
      fallbackTerms.map(async (term) => searchMealsByName(term).catch(() => []))
    );
    const combined = fetched.flat();
    const deduped = new Map<string, (typeof combined)[number]>();
    combined.forEach((meal) => {
      if (!deduped.has(meal.idMeal)) {
        deduped.set(meal.idMeal, meal);
      }
    });
    meals = Array.from(deduped.values());
  }

  if (params.cuisine) {
    const targetCuisine = params.cuisine.toLowerCase();
    meals = meals.filter((meal) => meal.strArea?.toLowerCase().includes(targetCuisine));
  }

  return meals.slice(0, 16).map(mealDbToListItem);
}

export async function getRecipeDetailUnified(id: string): Promise<RecipeDetailItem | null> {
  const parsed = normalizeRecipeId(id);

  if (parsed.provider === 'spoon') {
    const numericId = Number(parsed.rawId);
    if (Number.isNaN(numericId)) return null;

    const recipe = await getSpoonacularRecipeById(numericId).catch(() => null);
    if (!recipe) return null;

    return {
      idMeal: `spoon-${recipe.id}`,
      strMeal: recipe.title,
      strArea: recipe.cuisine,
      strMealThumb: optimizeRemoteImageUrl(recipe.image || '', { width: 1400, height: 900, crop: 'fill' }),
      strCategory: recipe.category,
      strYoutube: buildYouTubeSearchUrl(recipe.title),
      readyInMinutes: recipe.readyInMinutes,
      difficulty: difficultyFromTime(recipe.readyInMinutes),
      temperatureHint: extractTemperatureHint(recipe.instructions),
      sourceUrl: recipe.sourceUrl,
      strInstructions: recipe.instructions || 'Instructions currently unavailable.',
      ingredients: recipe.ingredients
    };
  }

  const meal = await lookupMealById(parsed.rawId);
  if (!meal) {
    return null;
  }

  return {
    idMeal: meal.idMeal,
    strMeal: meal.strMeal,
    strArea: meal.strArea,
    strMealThumb: optimizeRemoteImageUrl(meal.strMealThumb, { width: 1400, height: 900, crop: 'fill' }),
    strCategory: meal.strCategory,
    strYoutube: buildYouTubeSearchUrl(meal.strMeal),
    readyInMinutes: null,
    difficulty: null,
    temperatureHint: extractTemperatureHint(meal.strInstructions),
    sourceUrl: null,
    strInstructions: meal.strInstructions,
    ingredients: extractIngredients(meal)
  };
}

export async function enrichRecipeWithMedia(query: string): Promise<{
  id: string | null;
  photoUrl: string | null;
  youtubeUrl: string | null;
}> {
  const unifiedResults = await searchRecipesUnified({ query }).catch(() => []);
  const top = unifiedResults[0];

  if (!top) {
    return { id: null, photoUrl: null, youtubeUrl: buildYouTubeSearchUrl(query) };
  }

  return {
    id: top.idMeal,
    photoUrl: top.strMealThumb || null,
    youtubeUrl: top.strYoutube || null
  };
}
