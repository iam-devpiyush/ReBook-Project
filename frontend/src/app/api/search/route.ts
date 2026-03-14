/**
 * API Route: /api/search
 *
 * GET: Full-text search for listings with filters, sorting, and pagination
 *
 * Requirements: 5.1-5.9, 22.1, 22.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchListings, type SearchFilters, type SortBy } from '@/services/search.service';

/** In-memory cache for popular queries (5-minute TTL) */
interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry>();
export const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Build a deterministic cache key from request params */
function buildCacheKey(params: URLSearchParams): string {
  const sorted = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return sorted;
}

/** Evict expired entries (called lazily on each request) */
function evictExpired(): void {
  const now = Date.now();
  for (const [key, entry] of searchCache.entries()) {
    if (now - entry.timestamp >= SEARCH_CACHE_TTL_MS) {
      searchCache.delete(key);
    }
  }
}

/**
 * GET /api/search
 *
 * Query params:
 *   q            - search query string (default "")
 *   category_id  - filter by category
 *   condition_min - minimum condition score (1-5)
 *   price_min    - minimum price (₹)
 *   price_max    - maximum price (₹)
 *   city         - filter by city
 *   state        - filter by state
 *   sort_by      - relevance | price_asc | price_desc | condition_desc | date_desc | proximity
 *   lat          - user latitude (required for proximity sort)
 *   lng          - user longitude (required for proximity sort)
 *   page         - page number (1-based, default 1)
 *   page_size    - results per page (default 20, max 100)
 */
export async function GET(request: NextRequest) {
  try {
    evictExpired();

    const { searchParams } = request.nextUrl;

    // Parse pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('page_size') || '20', 10)));
    const offset = (page - 1) * pageSize;

    // Parse sort
    const sortBy = (searchParams.get('sort_by') || 'relevance') as SortBy;
    const validSorts: SortBy[] = ['relevance', 'price_asc', 'price_desc', 'condition_desc', 'date_desc', 'proximity'];
    if (!validSorts.includes(sortBy)) {
      return NextResponse.json({ error: `Invalid sort_by value. Must be one of: ${validSorts.join(', ')}` }, { status: 400 });
    }

    // Parse user location (required for proximity sort)
    const latStr = searchParams.get('lat');
    const lngStr = searchParams.get('lng');
    let userLocation: { latitude: number; longitude: number } | undefined;

    if (latStr && lngStr) {
      const latitude = parseFloat(latStr);
      const longitude = parseFloat(lngStr);
      if (!isNaN(latitude) && !isNaN(longitude)) {
        userLocation = { latitude, longitude };
      }
    }

    if (sortBy === 'proximity' && !userLocation) {
      return NextResponse.json(
        { error: 'lat and lng are required when sort_by=proximity' },
        { status: 400 }
      );
    }

    // Parse filters
    const filters: SearchFilters = {};
    const categoryId = searchParams.get('category_id');
    if (categoryId) filters.category_id = categoryId;

    const conditionMin = searchParams.get('condition_min');
    if (conditionMin !== null) {
      const val = parseFloat(conditionMin);
      if (!isNaN(val)) filters.condition_score_min = val;
    }

    const priceMin = searchParams.get('price_min');
    if (priceMin !== null) {
      const val = parseFloat(priceMin);
      if (!isNaN(val)) filters.price_min = val;
    }

    const priceMax = searchParams.get('price_max');
    if (priceMax !== null) {
      const val = parseFloat(priceMax);
      if (!isNaN(val)) filters.price_max = val;
    }

    const city = searchParams.get('city');
    if (city) filters.city = city;

    const state = searchParams.get('state');
    if (state) filters.state = state;

    const query = searchParams.get('q') || '';

    // Check cache
    const cacheKey = buildCacheKey(searchParams);
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL_MS) {
      return NextResponse.json({ ...cached.data as object, cached: true });
    }

    // Execute search
    const result = await searchListings({
      query,
      filters,
      userLocation,
      sortBy,
      limit: pageSize,
      offset,
    });

    const responseData = {
      success: true,
      data: result.hits,
      pagination: {
        page,
        page_size: pageSize,
        total_hits: result.estimatedTotalHits,
        total_pages: Math.ceil(result.estimatedTotalHits / pageSize),
      },
      processing_time_ms: result.processingTimeMs,
      cached: false,
    };

    // Cache the result
    searchCache.set(cacheKey, { data: responseData, timestamp: Date.now() });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in GET /api/search:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
