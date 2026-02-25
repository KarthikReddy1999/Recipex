'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CuisineSelector } from '@/components/ui/CuisineSelector';
import { FilterBar } from '@/components/ui/FilterBar';
import { RecipeCard } from '@/components/ui/RecipeCard';
import { buildClientApiUrl } from '@/lib/api-url';
import { createRequestId, webLogger } from '@/lib/logger';
import { IngredientDetection, RecipeSuggestion, SearchFilters } from '@/types';

interface RecipeListItem {
  idMeal: string;
  strMeal: string;
  strArea: string;
  strMealThumb: string;
  strCategory: string;
  strYoutube?: string;
  readyInMinutes?: number | null;
  difficulty?: 'easy' | 'intermediate' | 'advanced' | null;
  temperatureHint?: string | null;
  sourceUrl?: string | null;
}

const FEATURED_PAGE_SIZE = 3;

function getTimeAwareFeaturedQueries(): string[] {
  const hour = new Date().getHours();
  if (hour < 11) {
    return ['breakfast', 'quick breakfast', 'kids breakfast', 'healthy oats'];
  }
  if (hour < 16) {
    return ['lunch', 'rice', 'easy lunch', 'vegetarian lunch'];
  }
  if (hour < 21) {
    return ['dinner', 'curry', 'family dinner', 'grilled chicken'];
  }
  return ['light dinner', 'soup', 'quick snack', 'salad'];
}

function getMealMomentLabel(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'Breakfast time picks';
  if (hour < 16) return 'Lunch time picks';
  if (hour < 21) return 'Dinner time picks';
  return 'Late evening picks';
}

function getTimeLevel(minutes?: number | null): string | null {
  if (!minutes || Number.isNaN(minutes)) return null;
  if (minutes <= 20) return 'quick';
  if (minutes <= 45) return 'balanced';
  return 'slow-cook';
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      resolve(value.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ScanPage() {
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [detectedIngredients, setDetectedIngredients] = useState<IngredientDetection[]>([]);
  const [recipes, setRecipes] = useState<RecipeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [featuredRecipes, setFeaturedRecipes] = useState<RecipeListItem[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredPage, setFeaturedPage] = useState(0);
  const [featuredPaused, setFeaturedPaused] = useState(false);
  const [scanImageUrl, setScanImageUrl] = useState<string | null>(null);
  const [detectedDish, setDetectedDish] = useState<{
    name: string;
    confidence: number;
    is_food: boolean;
  } | null>(null);
  const latestScanSeq = useRef(0);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const selectedCuisineText = useMemo(() => (cuisines.length ? cuisines.join(', ') : 'Any cuisine'), [cuisines]);
  const featuredHeading = useMemo(() => getMealMomentLabel(), []);
  const totalFeaturedPages = Math.max(1, Math.ceil(featuredRecipes.length / FEATURED_PAGE_SIZE));
  const visibleFeaturedRecipes = useMemo(() => {
    const start = featuredPage * FEATURED_PAGE_SIZE;
    return featuredRecipes.slice(start, start + FEATURED_PAGE_SIZE);
  }, [featuredPage, featuredRecipes]);

  useEffect(() => {
    if (featuredPage <= totalFeaturedPages - 1) return;
    setFeaturedPage(0);
  }, [featuredPage, totalFeaturedPages]);

  useEffect(() => {
    if (featuredLoading || featuredPaused || totalFeaturedPages <= 1) return;

    const timer = window.setInterval(() => {
      setFeaturedPage((prev) => (prev + 1) % totalFeaturedPages);
    }, 5200);

    return () => {
      window.clearInterval(timer);
    };
  }, [featuredLoading, featuredPaused, totalFeaturedPages]);

  const toggleCuisine = (cuisine: string) => {
    if (cuisines.includes(cuisine)) {
      setCuisines(cuisines.filter((item) => item !== cuisine));
      return;
    }
    setCuisines([...cuisines, cuisine]);
  };

  const handleScan = async (file?: File) => {
    if (!file) {
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);
    setDetectedDish(null);
    setScanImageUrl(null);
    const scanSeq = latestScanSeq.current + 1;
    latestScanSeq.current = scanSeq;
    const requestId = createRequestId('web-scan');
    const startedAt = performance.now();

    try {
      const imageBase64 = await fileToBase64(file);
      webLogger.info('scan.request.start', {
        requestId,
        scanSeq,
        cuisineCount: cuisines.length,
        hasDiet: Boolean(filters?.diet),
        hasMaxTime: Boolean(filters?.maxTime),
        hasDifficulty: Boolean(filters?.difficulty)
      });

      const response = await fetch(buildClientApiUrl('/api/analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-request-id': requestId },
        body: JSON.stringify({ imageBase64, cuisines, filters })
      });

      const data = await response.json();
      if (scanSeq !== latestScanSeq.current) {
        webLogger.warn('scan.response.stale_ignored', {
          requestId,
          scanSeq,
          latestScanSeq: latestScanSeq.current
        });
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze image');
      }

      setDetectedIngredients(data.detected_ingredients || []);
      setDetectedDish(data.detected_dish || null);
      setScanImageUrl((data.image_url as string | null) || null);
      setRecipes((data.recipes || []) as RecipeSuggestion[]);
      if (data.mode === 'demo' && data.note) {
        setNotice(String(data.note));
      }
      webLogger.info('scan.request.success', {
        requestId,
        scanSeq,
        apiRequestId: data.request_id,
        provider: data.provider,
        mode: data.mode,
        recipeCount: (data.recipes || []).length,
        durationMs: Math.round(performance.now() - startedAt)
      });
    } catch (scanError) {
      if (scanSeq !== latestScanSeq.current) {
        webLogger.warn('scan.error.stale_ignored', {
          requestId,
          scanSeq,
          latestScanSeq: latestScanSeq.current
        });
        return;
      }
      setError(scanError instanceof Error ? scanError.message : 'Unexpected error');
      webLogger.error('scan.request.error', {
        requestId,
        scanSeq,
        durationMs: Math.round(performance.now() - startedAt),
        error: scanError instanceof Error ? scanError.message : 'Unexpected error'
      });
    } finally {
      if (scanSeq === latestScanSeq.current) {
        setLoading(false);
      }
    }
  };

  const stopCamera = () => {
    if (!mediaStreamRef.current) return;
    mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const closeCamera = () => {
    stopCamera();
    setCameraOpen(false);
  };

  const openCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not supported in this browser. Use Upload image instead.');
      return;
    }

    setStartingCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      mediaStreamRef.current = stream;
      setCameraOpen(true);
    } catch {
      setCameraError(
        'Camera access failed. Allow camera permission and use https or localhost. You can still upload an image.'
      );
    } finally {
      setStartingCamera(false);
    }
  };

  const captureFromCamera = async () => {
    const video = videoRef.current;
    if (!video) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    if (!width || !height) {
      setCameraError('Camera frame is unavailable. Try again.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setCameraError('Failed to capture image from camera.');
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((value) => resolve(value), 'image/jpeg', 0.9);
    });

    if (!blob) {
      setCameraError('Failed to create captured image.');
      return;
    }

    closeCamera();
    const file = new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
    await handleScan(file);
  };

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !mediaStreamRef.current) return;
    videoRef.current.srcObject = mediaStreamRef.current;
    void videoRef.current.play().catch(() => undefined);
  }, [cameraOpen]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const requestId = createRequestId('web-featured');
    const startedAt = performance.now();

    const loadFeatured = async () => {
      try {
        const queries = getTimeAwareFeaturedQueries();
        const responses = await Promise.all(
          queries.map(async (query) => {
            const response = await fetch(
              buildClientApiUrl(`/api/recipes?q=${encodeURIComponent(query)}`),
              {
                headers: { 'x-request-id': requestId }
              }
            );
            if (!response.ok) {
              return [] as RecipeListItem[];
            }
            const data = (await response.json()) as { results?: RecipeListItem[] };
            return (data.results || []).slice(0, 6);
          })
        );

        if (!active) return;

        const deduped = new Map<string, RecipeListItem>();
        responses.flat().forEach((item) => {
          if (!item?.idMeal || deduped.has(item.idMeal)) return;
          deduped.set(item.idMeal, item);
        });

        setFeaturedRecipes(Array.from(deduped.values()).slice(0, 12));
        setFeaturedPage(0);
        webLogger.info('scan.featured.success', {
          requestId,
          featuredCount: deduped.size,
          durationMs: Math.round(performance.now() - startedAt)
        });
      } catch (featuredError) {
        if (!active) return;
        webLogger.warn('scan.featured.fallback', {
          requestId,
          error:
            featuredError instanceof Error
              ? featuredError.message
              : 'Failed to fetch featured recipes'
        });
      } finally {
        if (active) setFeaturedLoading(false);
      }
    };

    void loadFeatured();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Scan Pantry</h1>
        <p className="mt-2 text-[color:var(--text-secondary)]">
          Upload one ingredient image. Recipex returns matched recipes in seconds.
        </p>
      </header>

      <div className="glass-card space-y-4 p-5">
        <p className="text-sm font-semibold text-slate-700">Preferred cuisines: {selectedCuisineText}</p>
        <CuisineSelector selected={cuisines} onToggle={toggleCuisine} />
        <FilterBar filters={filters} onChange={setFilters} />

        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onClick={(event) => {
            event.currentTarget.value = '';
          }}
          onChange={(event) => {
            void handleScan(event.target.files?.[0]);
            event.currentTarget.value = '';
          }}
          disabled={loading}
        />
        <div className="rounded-xl border border-dashed border-white/60 bg-white/25 p-6">
          <p className="mb-4 text-center text-sm">
            {loading ? 'Recipex Chef AI is plating your best matches...' : 'Scan with camera or upload ingredient image'}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              disabled={loading}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Upload image
            </button>
            <button
              type="button"
              onClick={() => {
                void openCamera();
              }}
              disabled={loading || startingCamera}
              className="rounded-xl border border-white/70 bg-white/45 px-4 py-2 text-sm font-semibold text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {startingCamera ? 'Opening camera...' : 'Scan with camera'}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}
        {cameraError && <p className="text-sm text-red-700">{cameraError}</p>}
        {notice && <p className="text-sm text-amber-800">{notice}</p>}

        {detectedDish || detectedIngredients.length ? (
          <div className="rounded-xl border border-white/55 bg-white/35 p-4">
            {scanImageUrl ? (
              <div className="mb-3 overflow-hidden rounded-lg border border-white/60 bg-white/20">
                <img src={scanImageUrl} alt="Uploaded ingredients" className="h-40 w-full object-cover sm:h-52" />
              </div>
            ) : null}
            {detectedDish ? (
              <p className="text-sm font-semibold text-slate-800">
                Detected: {detectedDish.name}{' '}
                <span className="font-medium text-slate-600">
                  ({Math.round((detectedDish.confidence || 0) * 100)}% confidence)
                </span>
              </p>
            ) : null}
            {detectedIngredients.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {detectedIngredients.map((item, index) => (
                  <span
                    key={`${item.name}-${index}`}
                    className="rounded-full border border-white/60 bg-white/65 px-3 py-1 text-xs font-semibold text-slate-700"
                  >
                    {item.name}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        {recipes.map((recipe, index) => (
          <RecipeCard
            key={`${recipe.name}-${index}`}
            recipe={recipe}
            index={index}
            detailHref={`/recipe/${
              recipe.themealdb_id ||
              `${recipe.name.toLowerCase().replace(/\s+/g, '-')}-${recipe.cuisine.toLowerCase().replace(/\s+/g, '-')}`
            }?${new URLSearchParams({
              from: '/scan',
              name: recipe.name,
              cuisine: recipe.cuisine,
              description: recipe.description,
              time: String(recipe.cooking_time_minutes),
              difficulty: recipe.difficulty,
              match: String(recipe.match_percent),
              missing: (recipe.missing_ingredients || []).join('|'),
              have: (detectedIngredients || []).map((item) => item.name).join('|'),
              ...(recipe.photo_url ? { photo: recipe.photo_url } : {}),
              ...(recipe.youtube_url ? { youtube: recipe.youtube_url } : {})
            }).toString()}`}
          />
        ))}
      </section>

      <section className="space-y-3">
        <header className="space-y-1 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">How Recipex Works</h2>
          <p className="text-sm text-[color:var(--text-secondary)]">Fast flow, compact layout, zero clutter.</p>
        </header>

        <div className="grid gap-3 md:grid-cols-3">
          <article className="glass-card space-y-2 p-4">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              1
            </div>
            <h3 className="text-lg font-semibold">Capture Ingredients</h3>
            <p className="text-sm text-[color:var(--text-secondary)]">
              Upload a pantry photo or scan live from your camera in one tap.
            </p>
          </article>

          <article className="glass-card space-y-2 p-4">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-sm font-semibold text-white">
              2
            </div>
            <h3 className="text-lg font-semibold">AI Match Engine</h3>
            <p className="text-sm text-[color:var(--text-secondary)]">
              Recipex detects ingredients, scores recipe fit, and highlights missing items.
            </p>
          </article>

          <article className="glass-card space-y-2 p-4">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-sm font-semibold text-white">
              3
            </div>
            <h3 className="text-lg font-semibold">Cook Confidently</h3>
            <p className="text-sm text-[color:var(--text-secondary)]">
              Open recipe details, ingredient checklist, and video guidance instantly.
            </p>
          </article>
        </div>
      </section>

      <section className="space-y-5">
        <header className="space-y-1 text-center">
          <h2 className="text-3xl font-bold">Featured Recipes</h2>
          <p className="text-sm text-[color:var(--text-secondary)]">{featuredHeading}</p>
        </header>

        {featuredLoading ? (
          <div className="glass-card p-4 text-sm text-slate-700">Loading featured recipes...</div>
        ) : visibleFeaturedRecipes.length ? (
          <>
            <div onMouseEnter={() => setFeaturedPaused(true)} onMouseLeave={() => setFeaturedPaused(false)}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`featured-page-${featuredPage}`}
                  className="grid gap-4 lg:grid-cols-3"
                  initial={{ opacity: 0, x: 24, scale: 0.99 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -24, scale: 0.99 }}
                  transition={{ duration: 0.42, ease: [0.22, 0.61, 0.36, 1] }}
                >
                  {visibleFeaturedRecipes.map((meal) => (
                    <Link
                      key={`featured-${meal.idMeal}`}
                      href={`/recipe/${meal.idMeal}?from=${encodeURIComponent('/scan')}`}
                      className="group block"
                    >
                      <article className="glass-card overflow-hidden">
                        {meal.strMealThumb ? (
                          <img src={meal.strMealThumb} alt={meal.strMeal} className="h-52 w-full object-cover" />
                        ) : (
                          <div className="flex h-52 w-full items-center justify-center bg-white/20 text-sm font-semibold text-slate-700">
                            Image unavailable
                          </div>
                        )}
                        <div className="space-y-3 p-5">
                          <h3 className="line-clamp-2 text-2xl font-semibold">{meal.strMeal}</h3>
                          <p className="line-clamp-2 text-sm text-[color:var(--text-secondary)]">
                            {meal.strCategory || 'Featured recipe selection'}
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs text-slate-700">
                            <span className="rounded-full bg-white/45 px-3 py-1">{meal.strArea || 'Global'}</span>
                            {meal.readyInMinutes ? (
                              <span className="rounded-full bg-white/45 px-3 py-1">{meal.readyInMinutes} min</span>
                            ) : null}
                            {getTimeLevel(meal.readyInMinutes) ? (
                              <span className="rounded-full bg-white/45 px-3 py-1">
                                {getTimeLevel(meal.readyInMinutes)}
                              </span>
                            ) : null}
                            {meal.difficulty ? (
                              <span className="rounded-full bg-white/45 px-3 py-1">{meal.difficulty}</span>
                            ) : null}
                            {meal.temperatureHint ? (
                              <span className="rounded-full bg-white/45 px-3 py-1">Temp: {meal.temperatureHint}</span>
                            ) : null}
                          </div>
                          <span className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-slate-800">
                            Open recipe
                          </span>
                        </div>
                      </article>
                    </Link>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>

            {totalFeaturedPages > 1 ? (
              <div className="flex items-center justify-center gap-2">
                {Array.from({ length: totalFeaturedPages }).map((_, index) => (
                  <button
                    key={`featured-dot-${index}`}
                    type="button"
                    onClick={() => setFeaturedPage(index)}
                    className={`h-2.5 w-2.5 rounded-full transition ${
                      index === featuredPage ? 'bg-slate-700' : 'bg-slate-400/50 hover:bg-slate-500/70'
                    }`}
                    aria-label={`Go to featured page ${index + 1}`}
                  />
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <div className="glass-card p-4 text-sm text-slate-700">
            No featured recipes available right now. Try again shortly.
          </div>
        )}
      </section>

      {cameraOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="glass-card w-full max-w-2xl space-y-4 p-4">
            <p className="text-sm font-semibold text-slate-800">Camera scan</p>
            <video ref={videoRef} className="h-[420px] w-full rounded-xl bg-slate-900 object-cover" autoPlay muted playsInline />
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeCamera}
                className="rounded-xl border border-white/70 bg-white/45 px-4 py-2 text-sm font-semibold text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void captureFromCamera();
                }}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Capture and scan
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
