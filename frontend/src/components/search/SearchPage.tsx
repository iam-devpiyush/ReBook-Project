'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import ListingCard from './ListingCard';
import type { ListingDocument, SortBy } from '@/services/search.service';

interface SearchResult {
  data: ListingDocument[];
  pagination: { page: number; page_size: number; total_hits: number; total_pages: number };
  processing_time_ms: number;
}

interface SearchFilters {
  conditions: number[];
  category_id?: string;
  price_min?: number;
  price_max?: number;
}

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'condition_desc', label: 'Best Condition' },
  { value: 'date_desc', label: 'Newest First' },
];

const CONDITIONS = [
  { score: 5, label: 'Like New' },
  { score: 4, label: 'Very Good' },
  { score: 3, label: 'Good' },
  { score: 2, label: 'Acceptable' },
  { score: 1, label: 'Poor' },
];

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'fiction', label: 'Fiction' },
  { value: 'non-fiction', label: 'Non-Fiction' },
  { value: 'textbook', label: 'Textbook' },
  { value: 'science', label: 'Science' },
  { value: 'technology', label: 'Technology' },
  { value: 'history', label: 'History' },
  { value: 'biography', label: 'Biography' },
  { value: 'children', label: 'Children' },
  { value: 'other', label: 'Other' },
];

interface SearchPageProps {
  embedded?: boolean;
  limit?: number;
  onListingClick?: (listing: ListingDocument) => void;
}

export default function SearchPage({ embedded = false, limit, onListingClick }: SearchPageProps) {
  const [query, setQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({ conditions: [], price_max: 2000 });
  const [sortBy, setSortBy] = useState<SortBy>('date_desc');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const buildUrl = useCallback((q: string, f: SearchFilters, sort: SortBy, p: number) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (f.category_id) params.set('category_id', f.category_id);
    if (f.conditions.length > 0) params.set('condition_min', String(Math.min(...f.conditions)));
    if (f.price_min !== undefined) params.set('price_min', String(f.price_min));
    if (f.price_max !== undefined) params.set('price_max', String(f.price_max));
    params.set('sort_by', sort);
    params.set('page', String(p));
    params.set('page_size', String(limit ?? 20));
    return `/api/search?${params.toString()}`;
  }, [limit]);

  const doSearch = useCallback(async (q: string, f: SearchFilters, sort: SortBy, p: number) => {
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000); // 8s max
    try {
      const res = await fetch(buildUrl(q, f, sort, p), { signal: controller.signal });
      if (!res.ok) {
        setResult({ data: [], pagination: { page: p, page_size: limit ?? 20, total_hits: 0, total_pages: 0 }, processing_time_ms: 0 });
        return;
      }
      setResult(await res.json());
    } catch {
      setResult({ data: [], pagination: { page: p, page_size: limit ?? 20, total_hits: 0, total_pages: 0 }, processing_time_ms: 0 });
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, [buildUrl, limit]);

  useEffect(() => { doSearch(query, filters, sortBy, page); }, [query, filters, sortBy, page, doSearch]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => { setQuery(value); setPage(1); }, 300);
    if (suggestDebounce.current) clearTimeout(suggestDebounce.current);
    if (value.trim().length >= 2) {
      suggestDebounce.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/search/autocomplete?q=${encodeURIComponent(value.trim())}&limit=6`);
          const json = await res.json();
          const list: string[] = json.suggestions ?? [];
          setSuggestions(list);
          setShowSuggestions(list.length > 0);
        } catch {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }, 200);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (s: string) => {
    setInputValue(s);
    setQuery(s);
    setPage(1);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    setQuery(inputValue);
    setPage(1);
    setShowSuggestions(false);
  };

  const toggleCondition = (score: number) => {
    setFilters(f => ({
      ...f,
      conditions: f.conditions.includes(score) ? f.conditions.filter(c => c !== score) : [...f.conditions, score],
    }));
    setPage(1);
  };

  const totalResults = result?.pagination.total_hits ?? 0;
  const totalPages = result?.pagination.total_pages ?? 0;
  const listings = result?.data ?? [];

  return (
    <div className={embedded ? '' : 'min-h-screen bg-gray-50'}>
      <div className={embedded ? 'mb-5' : 'bg-white border-b border-gray-200 px-4 py-5 shadow-sm'}>
        <div className={embedded ? '' : 'max-w-7xl mx-auto'}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Browse Books</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {loading ? 'Loading...' : `${totalResults.toLocaleString()} book${totalResults !== 1 ? 's' : ''} available`}
              </p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div ref={wrapperRef} className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                value={inputValue}
                onChange={e => handleInputChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Search by title, author, or ISBN..."
                autoComplete="off"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {suggestions.map((s, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onMouseDown={() => selectSuggestion(s)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"
                      >
                        <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <select
              value={sortBy}
              onChange={e => { setSortBy(e.target.value as SortBy); setPage(1); }}
              className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <button type="submit" className="px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className={embedded ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'}>
        <div className="flex gap-6">
          <aside className="hidden md:block w-56 flex-shrink-0 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Condition</h3>
              <div className="space-y-2">
                {CONDITIONS.map(c => (
                  <label key={c.score} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.conditions.includes(c.score)}
                      onChange={() => toggleCondition(c.score)}
                      className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">{c.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Category</h3>
              <select
                value={filters.category_id ?? ''}
                onChange={e => { setFilters(f => ({ ...f, category_id: e.target.value || undefined })); setPage(1); }}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Price Range</h3>
              <div className="space-y-3">
                <input
                  type="range"
                  min={0}
                  max={2000}
                  step={50}
                  value={priceRange[1]}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setPriceRange([priceRange[0], val]);
                    setFilters(f => ({ ...f, price_max: val }));
                    setPage(1);
                  }}
                  className="w-full accent-green-600"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>₹0</span>
                  <span>₹{priceRange[1].toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                    <div className="aspect-[3/4] bg-gray-200" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                      <div className="h-5 bg-gray-200 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                </svg>
                <p className="font-medium text-gray-700">No books found</p>
                <p className="text-sm mt-1">Try adjusting your filters or search terms</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {listings.map(listing => (
                  <ListingCard key={listing.id} listing={listing} onClick={onListingClick} />
                ))}
              </div>
            )}

            {!embedded && !loading && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button onClick={() => setPage(p => p - 1)} disabled={page <= 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Previous</button>
                <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
