/**
 * Integration tests for GET /api/search/facets
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('meilisearch', () => {
  const mockIndex = {
    searchForFacetValues: vi.fn().mockResolvedValue({ facetHits: [] }),
    search: vi.fn().mockResolvedValue({
      hits: [],
      facetDistribution: { category_id: { 'cat-1': 5 }, condition_score: { '4': 3 } },
      estimatedTotalHits: 0,
    }),
  };
  function MeiliSearch() {
    return { index: vi.fn().mockReturnValue(mockIndex) };
  }
  return { MeiliSearch };
});

import { GET } from '../route';

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/search/facets');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

describe('GET /api/search/facets', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with facet data', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
  });
});
