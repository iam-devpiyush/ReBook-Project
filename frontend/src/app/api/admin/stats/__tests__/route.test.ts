/**
 * Integration tests for GET /api/admin/stats and GET /api/admin/analytics
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { GET as analyticsGET } from '../../analytics/route';

vi.mock('@/lib/auth/middleware', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('@/lib/cache', () => ({
  appCache: { get: vi.fn().mockReturnValue(null), set: vi.fn(), invalidate: vi.fn() },
  TTL: { PLATFORM_STATS: 900000 },
}));

import { requireAdmin } from '@/lib/auth/middleware';
import { createServerClient } from '@/lib/supabase/server';

function makeRequest(path = '/api/admin/stats', params: Record<string, string> = {}) {
  const url = new URL(`http://localhost${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

function mockStatsDb() {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    head: true,
  };
  // All count queries resolve with count: 5
  chain.select.mockReturnValue({ ...chain, count: 5, error: null });
  // Data queries resolve with empty arrays
  vi.mocked(createServerClient).mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        count: 5,
        error: null,
        eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
        gte: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }),
  } as any);
}

describe('GET /api/admin/stats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when not admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    } as any);
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it('returns cached stats when cache is warm', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1', role: 'admin' } } as any);
    const { appCache } = await import('@/lib/cache');
    vi.mocked(appCache.get).mockReturnValueOnce({ total_books_listed: 100, total_users: 50 });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cached).toBe(true);
  });
});

describe('GET /api/admin/analytics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when not admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    } as any);
    const res = await analyticsGET(makeRequest('/api/admin/analytics'));
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid days parameter', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1', role: 'admin' } } as any);
    const res = await analyticsGET(makeRequest('/api/admin/analytics', { days: '0' }));
    expect(res.status).toBe(400);
  });

  it('returns 200 with analytics data', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1', role: 'admin' } } as any);
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    vi.mocked(createServerClient).mockReturnValue(chain as any);
    const res = await analyticsGET(makeRequest('/api/admin/analytics', { days: '7' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.metadata.days).toBe(7);
  });
});
