export type Difficulty = 'easy' | 'intermediate' | 'advanced';

export interface IngredientDetection {
  name: string;
  quantity: string;
  confidence: number;
}

export interface RecipeSuggestion {
  name: string;
  cuisine: string;
  match_percent: number;
  missing_ingredients: string[];
  cooking_time_minutes: number;
  difficulty: Difficulty;
  description: string;
  calories_per_serving: number;
  servings: number;
  themealdb_search_query: string;
  photo_url?: string | null;
  youtube_url?: string | null;
  themealdb_id?: string | null;
}

export interface TheMealDBMeal {
  idMeal: string;
  strMeal: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strMealThumb: string;
  strYoutube: string;
  [key: string]: string;
}

export interface SearchFilters {
  cuisine?: string[];
  diet?: string;
  maxTime?: number;
  difficulty?: Difficulty;
}
