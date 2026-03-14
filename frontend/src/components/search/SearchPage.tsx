'use client';

/**
 * SearchPage Component
 *
 * Full search and discovery page integrating SearchBar, FilterPanel,
 * sort dropdown, results grid, and pagination.
 *
 * Requirements: 5.1-5.9
 */

import { useState, useCallback, useEffect } from 'react';
import SearchBar from './SearchBar';
import FilterPanel, { SearchFilters } from './FilterPanel';
import ListingCard from './ListingCard';
import type { ListingDocument, SortBy } from '@/services/search.service';

interface SearchResult {
  data: ListingDocument[];
  pagination: {
    page: number;
    page_size: number;
    total_hits: number;
    total_pages: number;
  };
  processing_time_ms: number;
}

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'condition_desc', label: 'Best Condition' },
  { value: 'date_desc', label: 'Newest First' },
];

interface SearchPageProps {
  onListingClick?: (listing: ListingDocument) => void;
}

export default function SearchPage({ onListingClick }: SearchPageProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sortBy, setSortBy] = useState<SortBy>('relevance');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const buildUrl = useCallback(
    (q: string, f: SearchFilters, sort: SortBy, p: number) => {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (f.category_id) params.set('category_id', f.category_id);
      if (f.condition_min !== undefined) params.set('condition_min', String(f.condition_min));
      if (f.price_min !== undefined) params.set('price_min', String(f.price_min));
      if (f.price_max !== undefined) params.set('price_max', String(f.price_max));
      if (f.state) params.set('state', f.state);
      params.set('sort_by', sort);
      params.set('page', String(p));
      params.set('page_size', '20');
      return `/api/search?${params.toString()}`;
    },
    []
  );

  const doSearch = useCallback(
    async (q: string, f: SearchFilters, sort: SortBy, p: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(buildUrl(q, f, sort, p));
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Search failed');
        }
        const data = await res.json();
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setLoading(false);
      }
    },
    [buildUrl]
  );

  // Run search whenever query/filters/sort/page change
  useEffect(() => {
    doSearch(query, filters, sortBy, page);
  }, [query, filters, sortBy, page, doSearch]);

  const handleSearch = (q: string) => {
    setQuery(q);
    setPage(1);
  };

  const handleFiltersChange = (f: SearchFilters) => {
    setFilters(f);
    setPage(1);
  };

  const handleSortChange = (sort: SortBy) => {
    setSortBy(sort);
    setPage(1);
  };

  const totalResults = result?.pagination.total_hits ?? 0;
  const totalPages = result?.pagination.total_pages ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <SearchBar
            initialQuery={query}
            onSearch={handleSearch}
            autoFocus
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Filter sidebar — desktop */}
          <aside className="hidden md:block w-56 flex-shrink-0">
            <FilterPanel filters={filters} onChange={handleFiltersChange} />
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4 gap-3">
              {/* Mobile filter toggle */}
              <button
                onClick={() => setFiltersOpen((o) => !o)}
                aria-label="Toggle filters"
                className="md:hidden flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                </svg>
                Filters
              </button>

              {/* Result count */}
              <p className="text-sm text-gray-500 flex-1">
                {loading ? (
                  'Searching...'
                ) : error ? (
                  <span className="text-red-500">{error}</span>
                ) : (
                  <>
                    {totalResults.toLocaleString()} result{totalResults !== 1 ? 's' : ''}
                    {query && (
                      <> for &ldquo;<span className="font-medium text-gray-800">{query}</span>&rdquo;</>
                    )}
                    {result?.processing_time_ms !== undefined && (
                      <span className="text-gray-400"> ({result.processing_time_ms}ms)</span>
                    )}
                  </>
                )}
              </p>

              {/* Sort dropdown */}
              <div className="flex items-center gap-2">
                <label htmlFor="sort-select" className="text-sm text-gray-600 whitespace-nowrap hidden sm:block">
                  Sort by
                </label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as SortBy)}
                  aria-label="Sort results"
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mobile filter panel */}
            {filtersOpen && (
              <div className="md:hidden mb-4 bg-white rounded-xl border border-gray-200 p-4">
                <FilterPanel filters={filters} onChange={handleFiltersChange} />
              </div>
            )}

            {/* Results grid */}
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
            ) : error ? (
              <div className="text-center py-16">
                <p className="text-red-500 font-medium">{error}</p>
                <button
                  onClick={() => doSearch(query, filters, sortBy, page)}
                  className="mt-3 text-sm text-blue-600 hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : result?.data.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="font-medium text-gray-700">No results found</p>
                <p className="text-sm mt-1">Try a different search or adjust your filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {result?.data.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    onClick={onListingClick}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {!loading && !error && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1}
                  aria-label="Previous page"
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        aria-label={`Page ${pageNum}`}
                        aria-current={pageNum === page ? 'page' : undefined}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                          pageNum === page
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
