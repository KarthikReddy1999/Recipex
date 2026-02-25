import { TheMealDBMeal } from '../types';

const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

export async function searchMealsByName(query: string): Promise<TheMealDBMeal[]> {
  const response = await fetch(`${BASE_URL}/search.php?s=${encodeURIComponent(query)}`);

  if (!response.ok) {
    throw new Error('Failed to fetch meals');
  }

  const data = await response.json();
  return data.meals || [];
}

export async function listCuisines(): Promise<string[]> {
  const response = await fetch(`${BASE_URL}/list.php?a=list`);

  if (!response.ok) {
    throw new Error('Failed to fetch cuisines');
  }

  const data = await response.json();
  const areas = (data.meals || [])
    .map((item: { strArea?: string }) => item.strArea?.trim())
    .filter((value: string | undefined): value is string => Boolean(value));

  const uniqueAreas = Array.from(new Set<string>(areas));
  return uniqueAreas.sort((a: string, b: string) => a.localeCompare(b));
}

export async function lookupMealById(id: string): Promise<TheMealDBMeal | null> {
  const response = await fetch(`${BASE_URL}/lookup.php?i=${encodeURIComponent(id)}`);

  if (!response.ok) {
    throw new Error('Failed to fetch meal by id');
  }

  const data = await response.json();
  return data.meals?.[0] || null;
}

export function extractIngredients(meal: TheMealDBMeal): string[] {
  const ingredients: string[] = [];

  for (let i = 1; i <= 20; i += 1) {
    const ingredient = meal[`strIngredient${i}`]?.trim();
    const measure = meal[`strMeasure${i}`]?.trim();

    if (ingredient) {
      ingredients.push(`${measure || ''} ${ingredient}`.trim());
    }
  }

  return ingredients;
}
