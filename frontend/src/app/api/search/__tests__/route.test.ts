/**
 * Tests for /api/search route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, SEARCH_CACHE_TTL_MS } from '../route';
import { NextRequest } from 'next/server';

vi.mock('@/services/search.service', () => ({
  searchListings: vi.fn(),
}));

import { searchListings } from '@/services/search.service';

const mockSearchListings = searchListings as ReturnType<typeof vi.fn>;

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/search');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString());
}

const mockResult = {
  hits: [{ id: '1', title: 'Clean Code', author: 'Robert Martin', final_price: 350, status: 'active' }],
  estimatedTotalHits: 1,
  limit: 20,
  offset: 0,
  processingTimeMs: 12,
};

describe('GET /api/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchListings.mockResolvedValue(mockResult);
  });

  it('returns search results with pagination metadata', async () => {
    const res = await GET(makeRequest({ q: 'clean code' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toMatchObject({
      page: 1,
      page_size: 20,
      total_hits: 1,
      total_pages: 1,
    });
    expect(body.processing_time_ms).toBe(12);
  });

  it('passes query and filters to searchListings', async () => {
    await GET(makeRequest({
      q: 'physics',
      category_id: 'cat-1',
      condition_min: '3',
      price_min: '100',
      price_max: '500',
      city: 'Mumbai',
      state: 'Maharashtra',
      sort_by: 'price_asc',
    }));

    expect(mockSearchListings).toHaveBeenCalledWith(expect.objectContaining({
      query: 'physics',
      filters: {
        category_id: 'cat-1',
        condition_score_min: 3,
        price_min: 100,
        price_max: 500,
        city: 'Mumbai',
        state: 'Maharashtra',
      },
      sortBy: 'price_asc',
    }));
  });

  it('passes user location for proximity sort', async () => {
    await GET(makeRequest({ sort_by: 'proximity', lat: '19.076', lng: '72.877' }));

    expect(mockSearchListings).toHaveBeenCalledWith(expect.objectContaining({
      sortBy: 'proximity',
      userLocation: { latitude: 19.076, longitude: 72.877 },
    }));
  });

  it('returns 400 when proximity sort is used without lat/lng', async () => {
    const res = await GET(makeRequest({ sort_by: 'proximity' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/lat and lng/i);
  });

  it('returns 400 for invalid sort_by value', async () => {
    const res = await GET(makeRequest({ sort_by: 'invalid_sort' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/sort_by/i);
  });

  it('calculates correct offset for page 2', async () => {
    await GET(makeRequest({ page: '2', page_size: '10' }));

    expect(mockSearchListings).toHaveBeenCalledWith(expect.objectContaining({
      limit: 10,
      offset: 10,
    }));
  });

  it('caps page_size at 100', async () => {
    await GET(makeRequest({ page_size: '999' }));

    expect(mockSearchListings).toHaveBeenCalledWith(expect.objectContaining({
      limit: 100,
    }));
  });

  it('defaults to empty query when q is not provided', async () => {
    await GET(makeRequest());

    expect(mockSearchListings).toHaveBeenCalledWith(expect.objectContaining({
      query: '',
    }));
  });

  it('returns cached: false on first call', async () => {
    const res = await GET(makeRequest({ q: 'unique-query-xyz' }));
    const body = await res.json();
    expect(body.cached).toBe(false);
  });

  it('returns cached: true on second identical call', async () => {
    const params = { q: 'cached-query-abc' };
    await GET(makeRequest(params));
    const res2 = await GET(makeRequest(params));
    const body = await res2.json();
    expect(body.cached).toBe(true);
    // searchListings should only be called once
    expect(mockSearchListings).toHaveBeenCalledTimes(1);
  });

  it('returns 500 on service error', async () => {
    mockSearchListings.mockRejectedValue(new Error('Meilisearch down'));
    const res = await GET(makeRequest({ q: 'test' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
  });
});
