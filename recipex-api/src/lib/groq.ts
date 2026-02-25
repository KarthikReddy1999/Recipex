import { RecipeSuggestion } from '../types';

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface GroqAnalyzeResponse {
  detected_dish?: {
    name: string;
    confidence: number;
    is_food: boolean;
  };
  detected_ingredients: { name: string; quantity: string; confidence: number }[];
  recipes: RecipeSuggestion[];
}

export interface GroqSearchIntent {
  keyword: string;
  cuisine: string | null;
  diet: string | null;
}

export interface GroqShoppingItem {
  item: string;
  quantity: string;
  unit: string;
}

export function hasUsableGroqKey(value: string | undefined): boolean {
  if (!value) return false;
  if (value.includes('...')) return false;
  if (value.toLowerCase().includes('your_')) return false;
  return value.length > 20;
}

function groqApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key || !hasUsableGroqKey(key)) {
    throw new Error('Missing GROQ_API_KEY');
  }
  return key;
}

function groqTextModel(): string {
  return process.env.GROQ_TEXT_MODEL || 'llama-3.1-8b-instant';
}

function groqVisionModel(): string {
  return process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
}

function cleanJsonText(text: string): string {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function parseGroqJson<T>(text: string): T {
  const cleaned = cleanJsonText(text);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const firstObject = cleaned.indexOf('{');
    const lastObject = cleaned.lastIndexOf('}');
    if (firstObject >= 0 && lastObject > firstObject) {
      return JSON.parse(cleaned.slice(firstObject, lastObject + 1)) as T;
    }

    const firstArray = cleaned.indexOf('[');
    const lastArray = cleaned.lastIndexOf(']');
    if (firstArray >= 0 && lastArray > firstArray) {
      return JSON.parse(cleaned.slice(firstArray, lastArray + 1)) as T;
    }

    throw new Error('Failed to parse Groq JSON');
  }
}

async function generateGroqText(options: {
  model: string;
  systemInstruction: string;
  userText: string;
  imageBase64?: string;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = groqApiKey();
  const userContent = options.imageBase64
    ? [
        { type: 'text', text: options.userText },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${options.imageBase64}`
          }
        }
      ]
    : options.userText;

  const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: options.model,
      messages: [
        { role: 'system', content: options.systemInstruction },
        { role: 'user', content: userContent }
      ],
      temperature: 0.2,
      max_tokens: options.maxTokens || 2048,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => '');
    throw new Error(`Groq API error: ${response.status} ${payload}`.trim());
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('Empty Groq response');
  }

  return text;
}

export async function analyzeWithGroq(options: {
  imageBase64: string;
  cuisines?: string[];
  filters?: { diet?: string; maxTime?: number; difficulty?: string };
}): Promise<GroqAnalyzeResponse> {
  const systemInstruction = [
    'You are Recipex AI, a culinary assistant.',
    'Analyze pantry ingredient images and return strict JSON only.',
    'If the image is not food/ingredients, set detected_dish.is_food=false and return empty detected_ingredients and recipes.',
    'Return shape:',
    '{',
    '  "detected_dish": {"name":"string","confidence":0.0,"is_food":true},',
    '  "detected_ingredients": [{"name":"string","quantity":"string","confidence":0.0}],',
    '  "recipes": [{',
    '    "name":"string",',
    '    "cuisine":"string",',
    '    "match_percent":0,',
    '    "missing_ingredients":["string"],',
    '    "cooking_time_minutes":0,',
    '    "difficulty":"easy|intermediate|advanced",',
    '    "description":"string",',
    '    "calories_per_serving":0,',
    '    "servings":0,',
    '    "themealdb_search_query":"string"',
    '  }]',
    '}'
  ].join('\n');

  const userText = `Preferred cuisines: ${options.cuisines?.join(', ') || 'any'}; Filters: diet=${
    options.filters?.diet || 'none'
  }, maxTime=${options.filters?.maxTime || 'any'}, difficulty=${
    options.filters?.difficulty || 'any'
  }.`;

  const text = await generateGroqText({
    model: groqVisionModel(),
    systemInstruction,
    userText,
    imageBase64: options.imageBase64,
    maxTokens: 2048
  });

  return parseGroqJson<GroqAnalyzeResponse>(text);
}

export async function extractSearchIntentWithGroq(query: string): Promise<GroqSearchIntent> {
  const systemInstruction =
    'Extract recipe search intent from user query. Return JSON only: {"keyword":"string","cuisine":"string|null","diet":"string|null"}';

  const text = await generateGroqText({
    model: groqTextModel(),
    systemInstruction,
    userText: query,
    maxTokens: 256
  });

  return parseGroqJson<GroqSearchIntent>(text);
}

export async function generateShoppingListWithGroq(options: {
  recipeNames: string[];
  userIngredients: string[];
}): Promise<GroqShoppingItem[]> {
  const systemInstruction =
    'Generate a deduplicated shopping list. Return JSON array only: [{"item":"string","quantity":"string","unit":"string"}]';
  const userText = `Recipes: ${options.recipeNames.join(', ')}. User has: ${options.userIngredients.join(', ')}.`;

  const text = await generateGroqText({
    model: groqTextModel(),
    systemInstruction,
    userText,
    maxTokens: 512
  });

  return parseGroqJson<GroqShoppingItem[]>(text);
}
