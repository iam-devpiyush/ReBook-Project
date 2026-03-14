/**
 * Integration tests for GET /api/search
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('meilisearch', () => {
  const mockIndex = {
    search: vi.fn().mockResolvedValue({ hits: [], estimatedTotalHits: 0, processingTimeMs: 5 }),
  };
  function MeiliSearch() {
    return { index: vi.fn().mockReturnValue(mockIndex) };
  }
  return { MeiliSearch };
});

vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({
  applyRateLimit: vi.fn().mockReturnValue(null),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  SEARCH_RATE_LIMIT: { limit: 100, windowMs: 60000 },
}));
vi.mock('@/lib/cache', () => ({
  appCache: { get: vi.fn().mockReturnValue(null), set: vi.fn(), evictExpired: vi.fn() },
  TTL: { SEARCH: 300000 },
  buildCacheKey: vi.fn().mockReturnValue('search:test'),
}));
vi.mock('@/lib/monitoring/performance', () => ({
  measurePerf: vi.fn().mockImplementation((_name, _target, fn) =>
    fn().then((r: unknown) => ({ result: r, elapsedMs: 10 }))
  ),
  addTimingHeader: vi.fn(),
}));
vi.mock('@/lib/errors/graceful-degradation', () => ({
  withMeilisearchFallback: vi.fn().mockImplementation((primary) =>
    primary().then((data: unknown) => ({ data, usedFallback: false }))
  ),
}));

import { GET } from '../route';

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/search');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

describe('GET /api/search', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with empty results for empty query', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
    expect(body.pagination).toBeDefined();
  });

  it('returns 400 for invalid sort_by value', async () => {
    const res = await GET(makeRequest({ sort_by: 'invalid_sort' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('sort_by');
  });

  it('returns 400 when sort_by=proximity but lat/lng missing', async () => {
    const res = await GET(makeRequest({ sort_by: 'proximity' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('lat');
  });

  it('returns 429 when rate limit exceeded', async () => {
    const { applyRateLimit } = await import('@/lib/rate-limit');
    vi.mocked(applyRateLimit).mockReturnValueOnce(
      new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }) as any
    );
    const res = await GET(makeRequest({ q: 'books' }));
    expect(res.status).toBe(429);
  });

  it('returns cached result when cache hit', async () => {
    const { appCache } = await import('@/lib/cache');
    vi.mocked(appCache.get).mockReturnValueOnce({ success: true, data: [{ id: 'cached' }], cached: true });
    const res = await GET(makeRequest({ q: 'books' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cached).toBe(true);
  });

  it('returns results with pagination metadata', async () => {
    const res = await GET(makeRequest({ q: 'clean code' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.page_size).toBe(20);
  });
});
