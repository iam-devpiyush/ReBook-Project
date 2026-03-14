/**
 * Tests for /api/search/facets route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

vi.mock('@/services/search.service', () => ({
  getSearchFacets: vi.fn(),
}));

import { getSearchFacets } from '@/services/search.service';

const mockGetFacets = getSearchFacets as ReturnType<typeof vi.fn>;

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/search/facets');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString());
}

const mockFacets = {
  categories: { 'cat-1': 10, 'cat-2': 5 },
  conditionScores: { '4': 8, '5': 7 },
  states: { Maharashtra: 12, Karnataka: 3 },
  priceRanges: [
    { label: 'Under ₹200', min: 0, max: 199, count: 4 },
    { label: '₹200 – ₹500', min: 200, max: 500, count: 9 },
    { label: '₹500 – ₹1000', min: 501, max: 1000, count: 2 },
    { label: '₹1000 – ₹2000', min: 1001, max: 2000, count: 0 },
    { label: 'Over ₹2000', min: 2001, max: 999999, count: 0 },
  ],
};

describe('GET /api/search/facets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFacets.mockResolvedValue(mockFacets);
  });

  it('returns facets for a query', async () => {
    const res = await GET(makeRequest({ q: 'physics' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(mockFacets);
  });

  it('passes query to getSearchFacets', async () => {
    await GET(makeRequest({ q: 'chemistry' }));
    expect(mockGetFacets).toHaveBeenCalledWith('chemistry');
  });

  it('defaults to empty query when q is not provided', async () => {
    await GET(makeRequest());
    expect(mockGetFacets).toHaveBeenCalledWith('');
  });

  it('returns facets with all expected keys', async () => {
    const res = await GET(makeRequest({ q: 'math' }));
    const body = await res.json();

    expect(body.data).toHaveProperty('categories');
    expect(body.data).toHaveProperty('conditionScores');
    expect(body.data).toHaveProperty('states');
    expect(body.data).toHaveProperty('priceRanges');
    expect(Array.isArray(body.data.priceRanges)).toBe(true);
  });

  it('returns 500 on service error', async () => {
    mockGetFacets.mockRejectedValue(new Error('Meilisearch error'));
    const res = await GET(makeRequest({ q: 'test' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
  });
});
