import 'dotenv/config';
import { randomUUID } from 'crypto';
import cors from 'cors';
import express, { Request, Response } from 'express';
import {
  analyzeWithGroq,
  extractSearchIntentWithGroq,
  generateShoppingListWithGroq,
  hasUsableGroqKey
} from './lib/groq';
import { logError, logInfo, logWarn } from './lib/logger';
import { uploadRecipeImage } from './lib/cloudinary';
import { enrichRecipeWithMedia, getRecipeDetailUnified, searchRecipesUnified } from './lib/recipes';
import { deleteAccountByUserId, getUserFromAccessToken, hasSupabaseAdminConfig } from './lib/supabase-admin';
import { listCuisines } from './lib/themealdb';
import { RecipeSuggestion } from './types';

const app = express();
const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '0.0.0.0';

const FALLBACK_CUISINES = [
  'American',
  'British',
  'Chinese',
  'French',
  'Greek',
  'Indian',
  'Italian',
  'Japanese',
  'Mexican',
  'Thai'
];

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || !allowedOrigins.length || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS origin blocked'));
    },
    credentials: true
  })
);
app.use(express.json({ limit: '15mb' }));
app.use((req, res, next) => {
  const requestId = String(req.headers['x-request-id'] || randomUUID());
  const startedAt = Date.now();

  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  logInfo('request.start', {
    requestId,
    method: req.method,
    path: req.path
  });

  res.on('finish', () => {
    logInfo('request.end', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt
    });
  });

  next();
});

function requestId(res: Response): string {
  return String(res.locals.requestId || 'n/a');
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'recipex-api', request_id: requestId(res) });
});

app.get('/api/cuisines', async (req, res) => {
  const rid = requestId(res);
  try {
    const cuisines = await listCuisines();
    logInfo('cuisines.success', { requestId: rid, count: cuisines.length });
    res.json({ cuisines, request_id: rid });
  } catch {
    logWarn('cuisines.fallback', { requestId: rid, fallbackCount: FALLBACK_CUISINES.length });
    res.json({ cuisines: FALLBACK_CUISINES, request_id: rid });
  }
});

interface SearchIntent {
  keyword: string;
  cuisine: string | null;
  diet: string | null;
}

app.get('/api/search', async (req, res) => {
  const rid = requestId(res);
  try {
    const query = String(req.query.q || '');
    if (!query) {
      logInfo('search.empty_query', { requestId: rid });
      res.json({ results: [], request_id: rid });
      return;
    }

    const cuisine = req.query.cuisine ? String(req.query.cuisine) : null;
    const diet = req.query.diet ? String(req.query.diet) : null;
    const maxTimeRaw = req.query.maxTime ? String(req.query.maxTime) : null;
    const maxTime = maxTimeRaw ? Number(maxTimeRaw) : undefined;

    const hasGroqKey = hasUsableGroqKey(process.env.GROQ_API_KEY);
    let intent: SearchIntent = { keyword: query, cuisine: null, diet: null };
    let groqIntentError: string | undefined;

    if (hasGroqKey) {
      try {
        intent = await extractSearchIntentWithGroq(query);
      } catch (error) {
        groqIntentError = error instanceof Error ? error.message : 'Unknown Groq error';
        logWarn('search.intent_fallback', { requestId: rid, groqIntentError });
      }
    }

    const results = await searchRecipesUnified({
      query: (intent.keyword || query).trim(),
      cuisine: cuisine || intent.cuisine || undefined,
      diet: diet || intent.diet || undefined,
      maxTime
    }).catch(() => []);

    if (!results.length) {
      logInfo('search.no_results', { requestId: rid, query, cuisine, diet, maxTime });
      res.json({
        results: [],
        message: `No results found for "${query}". Try broader keywords like chicken, pasta, curry or rice.`,
        request_id: rid
      });
      return;
    }

    logInfo('search.success', { requestId: rid, query, resultCount: results.length });
    res.json({
      results: results.slice(0, 16),
      request_id: rid,
      ...(groqIntentError ? { note: `Groq intent fallback used: ${groqIntentError}` } : {})
    });
  } catch (error) {
    logError('search.error', { requestId: rid, error });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Search failed', request_id: rid });
  }
});

app.get('/api/recipes', async (req, res) => {
  const rid = requestId(res);
  try {
    const query = String(req.query.q || 'chicken');
    const cuisine = req.query.cuisine ? String(req.query.cuisine) : undefined;
    const diet = req.query.diet ? String(req.query.diet) : undefined;
    const maxTimeRaw = req.query.maxTime ? String(req.query.maxTime) : undefined;
    const maxTime = maxTimeRaw ? Number(maxTimeRaw) : undefined;

    const results = await searchRecipesUnified({ query, cuisine, diet, maxTime }).catch(() => []);
    logInfo('recipes.success', { requestId: rid, query, resultCount: results.length });
    res.json({ results: results.slice(0, 16), request_id: rid });
  } catch (error) {
    logError('recipes.error', { requestId: rid, error });
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Failed to fetch recipes', request_id: rid });
  }
});

app.get('/api/recipes/:id', async (req, res) => {
  const rid = requestId(res);
  try {
    const recipe = await getRecipeDetailUnified(req.params.id);

    if (!recipe) {
      logWarn('recipe.not_found', { requestId: rid, recipeId: req.params.id });
      res.status(404).json({ error: 'Recipe not found', request_id: rid });
      return;
    }

    logInfo('recipe.success', { requestId: rid, recipeId: req.params.id });
    res.json({ recipe, request_id: rid });
  } catch (error) {
    logError('recipe.error', { requestId: rid, recipeId: req.params.id, error });
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Failed to fetch recipe detail', request_id: rid });
  }
});

interface AnalyzeResponse {
  detected_dish?: {
    name: string;
    confidence: number;
    is_food: boolean;
  };
  detected_ingredients: { name: string; quantity: string; confidence: number }[];
  recipes: RecipeSuggestion[];
}

function lowerCuisine(value?: string): string {
  return (value || '').trim().toLowerCase();
}

function buildDemoAnalyzeRecipes(primaryCuisine?: string): RecipeSuggestion[] {
  const cuisine = lowerCuisine(primaryCuisine);

  if (cuisine.includes('egypt')) {
    return [
      {
        name: 'Egyptian-Spiced Protein Skillet',
        cuisine: 'Egyptian',
        match_percent: 82,
        missing_ingredients: ['cumin', 'coriander', 'lemon'],
        cooking_time_minutes: 40,
        difficulty: 'intermediate',
        description: 'Pan-seared protein with warming Egyptian-style spices and onions.',
        calories_per_serving: 410,
        servings: 4,
        themealdb_search_query: 'egyptian chicken'
      },
      {
        name: 'Baladi Veggie Saute',
        cuisine: 'Egyptian',
        match_percent: 74,
        missing_ingredients: ['bell pepper', 'fresh parsley'],
        cooking_time_minutes: 25,
        difficulty: 'easy',
        description: 'Quick onion-garlic vegetable saute with classic pantry spices.',
        calories_per_serving: 290,
        servings: 3,
        themealdb_search_query: 'egyptian vegetables'
      },
      {
        name: 'Herbed Tomato Broth',
        cuisine: 'Egyptian',
        match_percent: 69,
        missing_ingredients: ['vegetable stock', 'mint'],
        cooking_time_minutes: 30,
        difficulty: 'easy',
        description: 'Light tomato-forward broth finished with herbs and citrus.',
        calories_per_serving: 180,
        servings: 4,
        themealdb_search_query: 'egyptian soup'
      }
    ];
  }

  return [
    {
      name: 'Spiced Pantry Curry',
      cuisine: primaryCuisine || 'Global',
      match_percent: 84,
      missing_ingredients: ['yogurt', 'cumin'],
      cooking_time_minutes: 40,
      difficulty: 'intermediate',
      description: 'Balanced onion-tomato curry base with pantry-friendly spices.',
      calories_per_serving: 400,
      servings: 4,
      themealdb_search_query: 'pantry curry'
    },
    {
      name: 'One-Pan Skillet Bowl',
      cuisine: primaryCuisine || 'Global',
      match_percent: 72,
      missing_ingredients: ['bell pepper', 'lime'],
      cooking_time_minutes: 28,
      difficulty: 'easy',
      description: 'Simple one-pan bowl with protein, aromatics, and sauce.',
      calories_per_serving: 360,
      servings: 3,
      themealdb_search_query: 'skillet bowl'
    },
    {
      name: 'Tomato Garlic Soup',
      cuisine: primaryCuisine || 'Global',
      match_percent: 78,
      missing_ingredients: ['celery', 'stock cube'],
      cooking_time_minutes: 35,
      difficulty: 'easy',
      description: 'Comforting soup built from onion, tomato, and garlic.',
      calories_per_serving: 240,
      servings: 4,
      themealdb_search_query: 'tomato soup'
    }
  ];
}

function buildDemoAnalyzeResponse(primaryCuisine?: string): AnalyzeResponse {
  return {
    detected_dish: {
      name: primaryCuisine ? `${primaryCuisine} pantry ingredients` : 'Mixed pantry ingredients',
      confidence: 0.74,
      is_food: true
    },
    detected_ingredients: [
      { name: 'onion', quantity: '2 medium', confidence: 0.9 },
      { name: 'tomato', quantity: '3 medium', confidence: 0.88 },
      { name: 'chicken breast', quantity: '400g', confidence: 0.86 }
    ],
    recipes: buildDemoAnalyzeRecipes(primaryCuisine)
  };
}

app.post('/api/analyze', async (req: Request, res: Response) => {
  const rid = requestId(res);
  try {
    const { imageBase64, cuisines, filters } = req.body as {
      imageBase64?: string;
      cuisines?: string[];
      filters?: { diet?: string; maxTime?: number; difficulty?: string };
    };

    if (!imageBase64) {
      logWarn('analyze.invalid_request', { requestId: rid, reason: 'missing imageBase64' });
      res.status(400).json({ error: 'imageBase64 is required', request_id: rid });
      return;
    }

    const hasGroqKey = hasUsableGroqKey(process.env.GROQ_API_KEY);
    let parsed: AnalyzeResponse | null = null;
    let mode: 'live' | 'demo' = 'demo';
    let note: string | undefined;
    let provider: 'groq' | 'demo' = 'demo';
    let groqErrorMessage: string | undefined;

    if (hasGroqKey) {
      try {
        parsed = await analyzeWithGroq({ imageBase64, cuisines, filters });
        mode = 'live';
        provider = 'groq';
        note = 'Live analysis provided by Groq.';
      } catch (error) {
        groqErrorMessage = error instanceof Error ? error.message : 'Unknown Groq error';
        logWarn('analyze.groq_fallback', { requestId: rid, groqErrorMessage });
        note = `Groq unavailable. Falling back to demo mode. ${groqErrorMessage}`;
      }
    }

    if (!parsed) {
      parsed = buildDemoAnalyzeResponse(cuisines?.[0]);
      mode = 'demo';
      provider = 'demo';
      note =
        note ||
        'Demo mode: Groq unavailable. Showing sample scan results instead of live vision.' +
          (groqErrorMessage ? ` Groq error: ${groqErrorMessage}` : '');
    }

    if (parsed.detected_dish?.is_food === false) {
      parsed = {
        ...parsed,
        detected_ingredients: [],
        recipes: []
      };
      note = note
        ? `${note} No food ingredients detected in the uploaded image.`
        : 'No food ingredients detected in the uploaded image.';
    }

    const imageUrl = await uploadRecipeImage(imageBase64).catch(() => null);

    const validRecipes = (parsed.recipes || [])
      .map((recipe) => {
        const name = String((recipe as { name?: unknown }).name || '').trim();
        if (!name) return null;

        const cuisine = String((recipe as { cuisine?: unknown }).cuisine || 'Global').trim() || 'Global';
        const query =
          String((recipe as { themealdb_search_query?: unknown }).themealdb_search_query || name).trim() || name;
        const missing = Array.isArray((recipe as { missing_ingredients?: unknown }).missing_ingredients)
          ? ((recipe as { missing_ingredients?: unknown[] }).missing_ingredients || [])
              .map((item) => String(item || '').trim())
              .filter(Boolean)
          : [];

        return {
          ...recipe,
          name,
          cuisine,
          themealdb_search_query: query,
          missing_ingredients: missing
        };
      })
      .filter(Boolean) as RecipeSuggestion[];

    const enrichedRecipes = await Promise.all(
      validRecipes.map(async (recipe) => {
        const media = await enrichRecipeWithMedia(recipe.themealdb_search_query || recipe.name).catch(() => ({
          id: null,
          photoUrl: null,
          youtubeUrl: null
        }));

        return {
          ...recipe,
          photo_url: media.photoUrl,
          youtube_url: media.youtubeUrl,
          themealdb_id: media.id
        };
      })
    );

    res.json({
      detected_dish: parsed.detected_dish || null,
      detected_ingredients: parsed.detected_ingredients || [],
      recipes: enrichedRecipes,
      image_url: imageUrl,
      mode,
      note,
      provider,
      request_id: rid
    });
  } catch (error) {
    logError('analyze.error', { requestId: rid, error });
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to analyze image',
      request_id: rid
    });
  }
});

interface ShoppingItem {
  item: string;
  quantity: string;
  unit: string;
}

app.post('/api/shopping-list', async (req, res) => {
  const rid = requestId(res);
  try {
    const { recipeNames = [], userIngredients = [] } = req.body as {
      recipeNames?: string[];
      userIngredients?: string[];
    };

    const hasGroqKey = hasUsableGroqKey(process.env.GROQ_API_KEY);
    let groqShoppingError: string | undefined;

    if (hasGroqKey) {
      try {
        const list = await generateShoppingListWithGroq({ recipeNames, userIngredients });
        logInfo('shopping_list.success', { requestId: rid, itemCount: list.length, provider: 'groq' });
        res.json({ shopping_list: list, provider: 'groq', request_id: rid });
        return;
      } catch (error) {
        groqShoppingError = error instanceof Error ? error.message : 'Unknown Groq error';
        logWarn('shopping_list.groq_fallback', { requestId: rid, groqShoppingError });
      }
    }

    const pantry = new Set((userIngredients as string[]).map((item) => item.toLowerCase()));
    const demoList: ShoppingItem[] = [
      { item: 'olive oil', quantity: '1', unit: 'bottle' },
      { item: 'garlic', quantity: '1', unit: 'pack' },
      { item: 'cumin powder', quantity: '1', unit: 'jar' },
      { item: 'yogurt', quantity: '500', unit: 'g' }
    ].filter((item) => !pantry.has(item.item.toLowerCase()));

    res.json({
      shopping_list: demoList,
      provider: 'demo',
      note:
        'Demo mode list generated because Groq is unavailable.' +
        (groqShoppingError ? ` Groq error: ${groqShoppingError}` : ''),
      request_id: rid
    });
  } catch (error) {
    logError('shopping_list.error', { requestId: rid, error });
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Shopping list generation failed',
      request_id: rid
    });
  }
});

app.delete('/api/account', async (req, res) => {
  const rid = requestId(res);
  try {
    if (!hasSupabaseAdminConfig()) {
      logWarn('account.delete.missing_config', { requestId: rid });
      res.status(500).json({
        error: 'Account deletion is not configured on server.',
        request_id: rid
      });
      return;
    }

    const authHeader = String(req.headers.authorization || '');
    if (!authHeader.startsWith('Bearer ')) {
      logWarn('account.delete.missing_token', { requestId: rid });
      res.status(401).json({ error: 'Missing bearer token.', request_id: rid });
      return;
    }

    const accessToken = authHeader.slice('Bearer '.length).trim();
    const user = await getUserFromAccessToken(accessToken);
    if (!user) {
      logWarn('account.delete.invalid_token', { requestId: rid });
      res.status(401).json({ error: 'Invalid or expired auth token.', request_id: rid });
      return;
    }

    await deleteAccountByUserId(user.id);
    logInfo('account.delete.success', { requestId: rid, userId: user.id });
    res.json({ ok: true, request_id: rid });
  } catch (error) {
    logError('account.delete.error', { requestId: rid, error });
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Account deletion failed',
      request_id: rid
    });
  }
});

app.use((err: unknown, _req: Request, res: Response, _next: () => void) => {
  const rid = requestId(res);
  const message = err instanceof Error ? err.message : 'Unexpected server error';
  logError('request.unhandled_error', { requestId: rid, error: err });
  res.status(500).json({ error: message, request_id: rid });
});

app.listen(port, host, () => {
  logInfo('server.started', { port, host });
});
