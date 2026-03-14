'use client';

/**
 * FilterPanel Component
 *
 * Sidebar filter panel for search results.
 * Supports category, condition score, and price range filters.
 *
 * Requirements: 5.3, 5.4, 5.5
 */

import { useState, useEffect } from 'react';
import type { Category } from '@/app/api/categories/route';

export interface SearchFilters {
  category_id?: string;
  condition_min?: number;
  price_min?: number;
  price_max?: number;
  state?: string;
}

interface FilterPanelProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
}

const CONDITION_OPTIONS = [
  { value: 5, label: 'Like New (5)' },
  { value: 4, label: 'Very Good (4+)' },
  { value: 3, label: 'Good (3+)' },
  { value: 2, label: 'Acceptable (2+)' },
  { value: 1, label: 'Any condition' },
];

const PRICE_PRESETS = [
  { label: 'Under ₹200', min: undefined, max: 200 },
  { label: '₹200 – ₹500', min: 200, max: 500 },
  { label: '₹500 – ₹1000', min: 500, max: 1000 },
  { label: '₹1000 – ₹2000', min: 1000, max: 2000 },
  { label: 'Over ₹2000', min: 2000, max: undefined },
];

export default function FilterPanel({ filters, onChange }: FilterPanelProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);
  const [priceMinInput, setPriceMinInput] = useState(filters.price_min?.toString() ?? '');
  const [priceMaxInput, setPriceMaxInput] = useState(filters.price_max?.toString() ?? '');

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.data || []))
      .catch(() => {});
  }, []);

  // Sync local state when parent filters change
  useEffect(() => {
    setLocalFilters(filters);
    setPriceMinInput(filters.price_min?.toString() ?? '');
    setPriceMaxInput(filters.price_max?.toString() ?? '');
  }, [filters]);

  const update = (patch: Partial<SearchFilters>) => {
    const next = { ...localFilters, ...patch };
    setLocalFilters(next);
    onChange(next);
  };

  const applyPriceRange = () => {
    const min = priceMinInput !== '' ? parseFloat(priceMinInput) : undefined;
    const max = priceMaxInput !== '' ? parseFloat(priceMaxInput) : undefined;
    update({ price_min: isNaN(min as number) ? undefined : min, price_max: isNaN(max as number) ? undefined : max });
  };

  const applyPreset = (min?: number, max?: number) => {
    setPriceMinInput(min?.toString() ?? '');
    setPriceMaxInput(max?.toString() ?? '');
    update({ price_min: min, price_max: max });
  };

  const clearAll = () => {
    setLocalFilters({});
    setPriceMinInput('');
    setPriceMaxInput('');
    onChange({});
  };

  const hasActiveFilters =
    !!localFilters.category_id ||
    localFilters.condition_min !== undefined ||
    localFilters.price_min !== undefined ||
    localFilters.price_max !== undefined ||
    !!localFilters.state;

  return (
    <aside aria-label="Search filters" className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 text-base">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            aria-label="Clear all filters"
            className="text-xs text-blue-600 hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Category */}
      <div>
        <label htmlFor="filter-category" className="block text-sm font-medium text-gray-700 mb-2">
          Category
        </label>
        <select
          id="filter-category"
          value={localFilters.category_id ?? ''}
          onChange={(e) => update({ category_id: e.target.value || undefined })}
          aria-label="Filter by category"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Condition */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Minimum Condition</p>
        <div className="space-y-1.5">
          {CONDITION_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="condition_min"
                value={opt.value}
                checked={
                  opt.value === 1
                    ? localFilters.condition_min === undefined || localFilters.condition_min === 1
                    : localFilters.condition_min === opt.value
                }
                onChange={() =>
                  update({ condition_min: opt.value === 1 ? undefined : opt.value })
                }
                className="text-blue-600"
              />
              <span className="text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price range presets */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Price Range</p>
        <div className="space-y-1.5 mb-3">
          {PRICE_PRESETS.map((preset) => {
            const active =
              localFilters.price_min === preset.min &&
              localFilters.price_max === preset.max;
            return (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset.min, preset.max)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Custom price range */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={priceMinInput}
            onChange={(e) => setPriceMinInput(e.target.value)}
            placeholder="Min ₹"
            aria-label="Minimum price"
            min={0}
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <span className="text-gray-400 text-sm">–</span>
          <input
            type="number"
            value={priceMaxInput}
            onChange={(e) => setPriceMaxInput(e.target.value)}
            placeholder="Max ₹"
            aria-label="Maximum price"
            min={0}
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <button
          onClick={applyPriceRange}
          className="mt-2 w-full py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
        >
          Apply price range
        </button>
      </div>
    </aside>
  );
}
