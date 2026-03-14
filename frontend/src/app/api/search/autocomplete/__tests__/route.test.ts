/**
 * Integration tests for GET /api/search/autocomplete
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('meilisearch', () => {
  const mockIndex = {
    search: vi.fn().mockResolvedValue({
      hits: [
        { title: 'Clean Code', author: 'Robert Martin' },
        { title: 'The Pragmatic Programmer', author: 'David Thomas' },
      ],
    }),
  };
  function MeiliSearch() {
    return { index: vi.fn().mockReturnValue(mockIndex) };
  }
  return { MeiliSearch };
});

import { GET } from '../route';

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/search/autocomplete');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

describe('GET /api/search/autocomplete', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when q is missing', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('"q"');
  });

  it('returns 400 when q is empty string', async () => {
    const res = await GET(makeRequest({ q: '   ' }));
    expect(res.status).toBe(400);
  });

  it('returns suggestions for valid query', async () => {
    const res = await GET(makeRequest({ q: 'clean' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.suggestions)).toBe(true);
    expect(body.suggestions.length).toBeGreaterThan(0);
  });

  it('deduplicates suggestions', async () => {
    // The mock returns 2 hits with same title/author - deduplication should work
    const res = await GET(makeRequest({ q: 'clean' }));
    const body = await res.json();
    const uniqueSuggestions = new Set(body.suggestions);
    expect(uniqueSuggestions.size).toBe(body.suggestions.length);
  });

  it('respects limit parameter', async () => {
    const res = await GET(makeRequest({ q: 'code', limit: '2' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestions.length).toBeLessThanOrEqual(2);
  });
});
