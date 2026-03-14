'use client';

/**
 * SearchBar Component
 *
 * Search input with autocomplete suggestions fetched from /api/search/autocomplete.
 * Handles debounced suggestion fetching and search submission.
 *
 * Requirements: 5.1
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface SearchBarProps {
  initialQuery?: string;
  placeholder?: string;
  onSearch: (query: string) => void;
  autoFocus?: boolean;
}

export default function SearchBar({
  initialQuery = '',
  placeholder = 'Search books by title, author, ISBN...',
  onSearch,
  autoFocus = false,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch autocomplete suggestions with debounce
  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/search/autocomplete?q=${encodeURIComponent(q.trim())}&limit=8`
      );
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.data || []);
        setShowSuggestions(true);
      }
    } catch {
      // Silently fail — autocomplete is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchSuggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    onSearch(query.trim());
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    onSearch(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && activeSuggestion >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[activeSuggestion]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveSuggestion(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} role="search">
        <div className="flex items-center border-2 border-gray-300 rounded-xl bg-white focus-within:border-blue-500 transition-colors shadow-sm">
          {/* Search icon */}
          <span className="pl-4 text-gray-400" aria-hidden="true">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>

          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveSuggestion(-1);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            aria-label="Search books"
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
            aria-controls="search-suggestions"
            className="flex-1 px-3 py-3 bg-transparent outline-none text-gray-900 placeholder-gray-400 text-base"
          />

          {/* Clear button */}
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                setShowSuggestions(false);
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="px-2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          <button
            type="submit"
            aria-label="Submit search"
            className="m-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
          >
            Search
          </button>
        </div>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <ul
          id="search-suggestions"
          role="listbox"
          aria-label="Search suggestions"
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              role="option"
              aria-selected={index === activeSuggestion}
              onMouseDown={() => handleSuggestionClick(suggestion)}
              className={`px-4 py-2.5 cursor-pointer text-sm flex items-center gap-2 ${
                index === activeSuggestion
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {suggestion}
            </li>
          ))}
        </ul>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="absolute right-20 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
