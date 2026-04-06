export const dynamic = 'force-dynamic';
/**
 * API Route: /api/search
 *
 * GET: Full-text search for listings with filters, sorting, and pagination
 *
 * Requirements: 5.1-5.9, 22.1, 22.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { MeiliSearch } from 'meilisearch';
import type { SearchFilters, SortBy, ListingDocument } from '@/services/search.service';
import { applyRateLimit, getClientIp, SEARCH_RATE_LIMIT } from '@/lib/rate-limit';
import { withMeilisearchFallback } from '@/lib/errors/graceful-degradation';
import { appCache, TTL, buildCacheKey } from '@/lib/cache';
import { measurePerf, addTimingHeader } from '@/lib/monitoring/performance';
import { withTimeout } from '@/lib/timeout';

const meiliClient = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  // Prefer admin key (works for both read and write), fall back to search-only key
  apiKey: process.env.MEILISEARCH_ADMIN_API_KEY || process.env.MEILISEARCH_API_KEY || '',
});

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Group listings by book_id + condition_score + final_price, counting stock */
function groupListings(hits: ListingDocument[]): (ListingDocument & { stock_count: number })[] {
  const groups = new Map<string, ListingDocument & { stock_count: number }>();
  for (const hit of hits) {
    const key = `${hit.book_id}__${hit.condition_score}__${hit.final_price}`;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { ...hit, stock_count: 1 });
    } else {
      existing.stock_count += 1;
    }
  }
  return Array.from(groups.values());
}

async function searchListings(options: {
  query: string;
  filters?: SearchFilters;
  userLocation?: { latitude: number; longitude: number };
  sortBy?: SortBy;
  limit?: number;
  offset?: number;
}) {
  const index = meiliClient.index('listings');
  const filterParts: string[] = ['status = "active"'];
  const f = options.filters ?? {};
  if (f.category_id) filterParts.push(`category_id = "${f.category_id}"`);
  if (f.condition_score_min != null) filterParts.push(`condition_score >= ${f.condition_score_min}`);
  if (f.price_min != null) filterParts.push(`final_price >= ${f.price_min}`);
  if (f.price_max != null) filterParts.push(`final_price <= ${f.price_max}`);
  if (f.city) filterParts.push(`location.city = "${f.city}"`);
  if (f.state) filterParts.push(`location.state = "${f.state}"`);

  const sortBy = options.sortBy;
  let meiliSort: string[] | undefined;
  if (sortBy === 'price_asc') meiliSort = ['final_price:asc'];
  else if (sortBy === 'price_desc') meiliSort = ['final_price:desc'];
  else if (sortBy === 'condition_desc') meiliSort = ['condition_score:desc'];
  else if (sortBy === 'date_desc') meiliSort = ['created_at:desc'];

  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;
  const fetchLimit = sortBy === 'proximity' && options.userLocation ? Math.min(limit * 5, 200) : limit;

  const result = await index.search(options.query, {
    filter: filterParts.join(' AND '),
    limit: fetchLimit,
    offset: sortBy === 'proximity' ? 0 : offset,
    sort: meiliSort,
  });

  let hits = result.hits as ListingDocument[];
  if (sortBy === 'proximity' && options.userLocation) {
    const { latitude: uLat, longitude: uLon } = options.userLocation;
    hits = hits
      .map((h) => ({ hit: h, dist: h.location.latitude != null && h.location.longitude != null ? haversineDistance(uLat, uLon, h.location.latitude, h.location.longitude) : Infinity }))
      .sort((a, b) => a.dist - b.dist)
      .slice(offset, offset + limit)
      .map((x) => x.hit);
  }

  return { hits, estimatedTotalHits: result.estimatedTotalHits ?? 0, processingTimeMs: result.processingTimeMs };
}

/** Build a deterministic cache key from request params */
function buildSearchCacheKey(params: URLSearchParams): string {
  const entries: Record<string, string> = {};
  params.forEach((v, k) => { entries[k] = v; });
  return buildCacheKey('search', entries);
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
    // Rate limit: 100 requests per minute per IP (Requirement 18.1)
    const ip = getClientIp(request);
    const rateLimitResponse = applyRateLimit(request, `search:${ip}`, SEARCH_RATE_LIMIT);
    if (rateLimitResponse) return rateLimitResponse;

    appCache.evictExpired();

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
    const cacheKey = buildSearchCacheKey(searchParams);
    const cached = appCache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached as object, cached: true });
    }

    // Execute search — hard 10s timeout, returns empty results instead of hanging
    let searchResult: { hits: ListingDocument[]; estimatedTotalHits: number; processingTimeMs: number };
    let elapsedMs = 0;
    let usedFallback = false;
    let fallbackReason: string | undefined;

    try {
      const perfResult = await withTimeout(
        measurePerf('GET /api/search', 'SEARCH', () =>
          withMeilisearchFallback(
            () => searchListings({ query, filters, userLocation, sortBy, limit: pageSize, offset }),
            async () => {
              const { createClient } = await import('@supabase/supabase-js');
              const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
              );

              let bookIds: string[] | null = null;
              if (query) {
                const { data: books } = await (supabase as any)
                  .from('books')
                  .select('id')
                  .or(`title.ilike.%${query}%,author.ilike.%${query}%`);
                bookIds = (books ?? []).map((b: any) => b.id);
                if (bookIds && bookIds.length === 0) {
                  return { hits: [] as unknown as ListingDocument[], estimatedTotalHits: 0, processingTimeMs: 0 };
                }
              }

              let q = (supabase as any)
                .from('listings')
                .select('*, book:books(*)', { count: 'exact' })
                .eq('status', 'active')
                .range(offset, offset + pageSize - 1);

              if (bookIds) q = q.in('book_id', bookIds);
              if (filters.category_id) q = q.eq('category_id', filters.category_id);
              if (filters.condition_score_min != null) q = q.gte('condition_score', filters.condition_score_min);
              if (filters.price_min != null) q = q.gte('final_price', filters.price_min);
              if (filters.price_max != null) q = q.lte('final_price', filters.price_max);
              if (filters.city) q = q.ilike('city', `%${filters.city}%`);
              if (filters.state) q = q.ilike('state', `%${filters.state}%`);

              const { data, error, count } = await q;
              if (error) throw error;

              const hits = (data ?? []).map((l: any) => ({
                ...l,
                title: l.book?.title ?? '',
                author: l.book?.author ?? '',
                subject: l.book?.subject,
                isbn: l.book?.isbn,
                publisher: l.book?.publisher,
                description: l.book?.description,
                category_id: l.book?.category_id ?? '',
                location: { city: l.city ?? '', state: l.state ?? '', pincode: l.pincode ?? '', latitude: l.latitude, longitude: l.longitude },
              })) as unknown as ListingDocument[];

              return { hits, estimatedTotalHits: count ?? hits.length, processingTimeMs: 0 };
            }
          )
        ),
        10_000,
        'search'
      );

      elapsedMs = perfResult.elapsedMs;
      searchResult = perfResult.result.data;
      usedFallback = perfResult.result.usedFallback;
      fallbackReason = perfResult.result.fallbackReason;
    } catch (err) {
      // Both Meilisearch and Supabase timed out — return empty results immediately
      console.error('[Search] Hard timeout hit, returning empty results:', err);
      searchResult = { hits: [], estimatedTotalHits: 0, processingTimeMs: 0 };
      usedFallback = true;
      fallbackReason = 'Search temporarily unavailable. Please try again.';
    }

    // Group by book_id + condition_score to deduplicate listings
    const groupedHits = groupListings(searchResult.hits);

    const responseData = {
      success: true,
      data: groupedHits,
      pagination: {
        page,
        page_size: pageSize,
        total_hits: groupedHits.length,
        total_pages: Math.ceil(groupedHits.length / pageSize),
      },
      processing_time_ms: elapsedMs,
      cached: false,
      ...(usedFallback && { fallback: true, fallback_reason: fallbackReason }),
    };

    // Cache the result (5-minute TTL — Requirement 22.7)
    appCache.set(cacheKey, responseData, TTL.SEARCH);

    const response = NextResponse.json(responseData);
    response.headers.set('Cache-Control', 'no-store');
    addTimingHeader(response.headers, elapsedMs, 'SEARCH');
    return response;
  } catch (error) {
    console.error('Error in GET /api/search:', error);
    const { errorResponse } = await import('@/lib/errors');
    return errorResponse(error);
  }
}
