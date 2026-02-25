interface SpoonacularRecipe {
  id: number;
  title: string;
  image?: string;
  cuisines?: string[];
  dishTypes?: string[];
  readyInMinutes?: number;
  sourceUrl?: string;
}

interface SpoonacularDetail extends SpoonacularRecipe {
  instructions?: string;
  extendedIngredients?: Array<{ original?: string; originalName?: string }>;
}

const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com';

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function hasUsableSpoonacularApiKey(value: string | undefined): boolean {
  if (!value) return false;
  if (value.includes('...')) return false;
  if (value.toLowerCase().includes('your_')) return false;
  return value.length > 20;
}

function spoonacularApiKey(): string {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey || !hasUsableSpoonacularApiKey(apiKey)) {
    throw new Error('Missing SPOONACULAR_API_KEY');
  }
  return apiKey;
}

export interface SpoonacularSearchParams {
  query: string;
  number?: number;
  cuisine?: string;
  diet?: string;
  maxReadyTime?: number;
}

export interface SpoonacularSummary {
  id: number;
  title: string;
  image: string | null;
  cuisine: string;
  category: string;
  readyInMinutes: number | null;
  sourceUrl: string | null;
}

export interface SpoonacularRecipeDetail {
  id: number;
  title: string;
  image: string | null;
  cuisine: string;
  category: string;
  readyInMinutes: number | null;
  instructions: string;
  ingredients: string[];
  sourceUrl: string | null;
}

export async function searchSpoonacularRecipes(
  params: SpoonacularSearchParams
): Promise<SpoonacularSummary[]> {
  const queryParams = new URLSearchParams({
    apiKey: spoonacularApiKey(),
    query: params.query,
    number: String(params.number || 12),
    addRecipeInformation: 'true'
  });

  if (params.cuisine) queryParams.set('cuisine', params.cuisine);
  if (params.diet) queryParams.set('diet', params.diet);
  if (params.maxReadyTime) queryParams.set('maxReadyTime', String(params.maxReadyTime));

  const response = await fetch(
    `${SPOONACULAR_BASE_URL}/recipes/complexSearch?${queryParams.toString()}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Spoonacular recipes');
  }

  const data = await response.json();
  const results = (data.results || []) as SpoonacularRecipe[];

  return results.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    image: recipe.image || null,
    cuisine: recipe.cuisines?.[0] || 'Global',
    category: recipe.dishTypes?.[0] || 'Recipe',
    readyInMinutes: recipe.readyInMinutes ?? null,
    sourceUrl: recipe.sourceUrl || null
  }));
}

export async function getSpoonacularRecipeById(id: number): Promise<SpoonacularRecipeDetail | null> {
  const queryParams = new URLSearchParams({
    apiKey: spoonacularApiKey(),
    includeNutrition: 'false'
  });

  const response = await fetch(
    `${SPOONACULAR_BASE_URL}/recipes/${id}/information?${queryParams.toString()}`
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to fetch Spoonacular recipe detail');
  }

  const recipe = (await response.json()) as SpoonacularDetail;

  return {
    id: recipe.id,
    title: recipe.title,
    image: recipe.image || null,
    cuisine: recipe.cuisines?.[0] || 'Global',
    category: recipe.dishTypes?.[0] || 'Recipe',
    readyInMinutes: recipe.readyInMinutes ?? null,
    instructions: stripHtml(recipe.instructions || ''),
    ingredients: (recipe.extendedIngredients || [])
      .map((item) => item.original?.trim() || item.originalName?.trim())
      .filter((value): value is string => Boolean(value)),
    sourceUrl: recipe.sourceUrl || null
  };
}
