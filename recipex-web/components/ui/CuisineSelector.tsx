'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { buildClientApiUrl } from '@/lib/api-url';

const DEFAULT_CUISINES = [
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

interface CuisineSelectorProps {
  selected: string[];
  onToggle: (cuisine: string) => void;
}

export function CuisineSelector({ selected, onToggle }: CuisineSelectorProps) {
  const [cuisines, setCuisines] = useState<string[]>(DEFAULT_CUISINES);

  useEffect(() => {
    let active = true;

    const loadCuisines = async () => {
      try {
        const response = await fetch(buildClientApiUrl('/api/cuisines'));
        if (!response.ok) return;
        const data = await response.json();
        if (!active || !Array.isArray(data.cuisines) || !data.cuisines.length) return;
        setCuisines(data.cuisines);
      } catch {
        // Keep default cuisines on failure.
      }
    };

    void loadCuisines();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {cuisines.map((cuisine) => {
        const active = selected.includes(cuisine);

        return (
          <motion.button
            key={cuisine}
            type="button"
            className={`glass-button whitespace-nowrap px-4 py-2 text-sm ${
              active ? 'border-white/60 bg-white/35' : 'border-white/25'
            }`}
            onClick={() => onToggle(cuisine)}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {cuisine}
          </motion.button>
        );
      })}
    </div>
  );
}
