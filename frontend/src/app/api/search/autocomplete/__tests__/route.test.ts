/**
 * Tests for /api/search/autocomplete route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

vi.mock('@/services/search.service', () => ({
  getAutocompleteSuggestions: vi.fn(),
}));

import { getAutocompleteSuggestions } from '@/services/search.service';

const mockGetSuggestions = getAutocompleteSuggestions as ReturnType<typeof vi.fn>;

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/search/autocomplete');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString());
}

describe('GET /api/search/autocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSuggestions.mockResolvedValue(['Clean Code', 'Robert Martin']);
  });

  it('returns suggestions for a valid query', async () => {
    const res = await GET(makeRequest({ q: 'clean' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(['Clean Code', 'Robert Martin']);
  });

  it('passes query and limit to getAutocompleteSuggestions', async () => {
    await GET(makeRequest({ q: 'phy', limit: '5' }));

    expect(mockGetSuggestions).toHaveBeenCalledWith('phy', 5);
  });

  it('defaults limit to 10', async () => {
    await GET(makeRequest({ q: 'math' }));

    expect(mockGetSuggestions).toHaveBeenCalledWith('math', 10);
  });

  it('caps limit at 20', async () => {
    await GET(makeRequest({ q: 'bio', limit: '100' }));

    expect(mockGetSuggestions).toHaveBeenCalledWith('bio', 20);
  });

  it('returns 400 when q is missing', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/required/i);
  });

  it('returns 400 when q is empty string', async () => {
    const res = await GET(makeRequest({ q: '   ' }));
    expect(res.status).toBe(400);
  });

  it('returns 500 on service error', async () => {
    mockGetSuggestions.mockRejectedValue(new Error('Search error'));
    const res = await GET(makeRequest({ q: 'test' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
  });
});
