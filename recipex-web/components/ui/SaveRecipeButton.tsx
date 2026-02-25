'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';

interface SaveRecipeButtonProps {
  mealId: string;
  mealName: string;
  mealThumb?: string | null;
  cuisine?: string | null;
  className?: string;
  showMessage?: boolean;
}

export function SaveRecipeButton({
  mealId,
  mealName,
  mealThumb,
  cuisine,
  className,
  showMessage = true
}: SaveRecipeButtonProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState('');

  const buttonClassName = useMemo(
    () =>
      className ||
      'inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white/70 px-4 text-sm font-semibold text-slate-900 whitespace-nowrap',
    [className]
  );

  useEffect(() => {
    let active = true;

    const loadSavedState = async () => {
      const supabase = createBrowserSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!active || !userId) return;

      const { data } = await supabase
        .from('saved_recipes')
        .select('id')
        .eq('user_id', userId)
        .eq('meal_id', mealId)
        .limit(1);

      if (!active) return;
      setSaved(Boolean(data?.length));
    };

    void loadSavedState();

    return () => {
      active = false;
    };
  }, [mealId]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setMessage('');

    try {
      const supabase = createBrowserSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        router.push('/auth');
        return;
      }

      if (saved) {
        const { error: deleteError } = await supabase
          .from('saved_recipes')
          .delete()
          .eq('user_id', user.id)
          .eq('meal_id', mealId);

        if (deleteError) {
          setMessage(deleteError.message);
          return;
        }
        setSaved(false);
        setMessage('Removed from My Recipes');
        return;
      }

      const displayName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        null;

      await supabase.from('profiles').upsert(
        {
          id: user.id,
          name: displayName,
          avatar_url: user.user_metadata?.avatar_url || null
        },
        { onConflict: 'id' }
      );

      const { data: existing } = await supabase
        .from('saved_recipes')
        .select('id')
        .eq('user_id', user.id)
        .eq('meal_id', mealId)
        .limit(1);

      if (existing?.length) {
        setSaved(true);
        setMessage('Already saved');
        return;
      }

      const { error } = await supabase.from('saved_recipes').insert({
        user_id: user.id,
        meal_id: mealId,
        meal_name: mealName,
        meal_thumb: mealThumb || null,
        cuisine: cuisine || null
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setSaved(true);
      setMessage('Saved to My Recipes');
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1">
      <button type="button" onClick={() => void handleSave()} disabled={saving} className={buttonClassName}>
        {saving ? 'Saving...' : saved ? 'Unsave' : 'Save to My Recipes'}
      </button>
      {showMessage && message ? <p className="text-xs text-slate-600">{message}</p> : null}
    </div>
  );
}
