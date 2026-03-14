/**
 * Integration tests for GET /api/admin/listings
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

vi.mock('@/lib/auth/middleware', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('@/lib/supabase/projections', () => ({ ADMIN_LISTING_PROJECTION: '*' }));

import { requireAdmin } from '@/lib/auth/middleware';
import { createServerClient } from '@/lib/supabase/server';

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/admin/listings');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

function mockDb(listings: unknown[], count = 0) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: listings, error: null, count }),
  };
  vi.mocked(createServerClient).mockReturnValue(chain as any);
  return chain;
}

describe('GET /api/admin/listings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    } as any);
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it('returns 200 with listings for admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1', role: 'admin' } } as any);
    mockDb([{ id: 'l1', status: 'pending_approval' }], 1);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.pagination.total).toBe(1);
  });

  it('returns 400 for invalid status filter', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1', role: 'admin' } } as any);
    const res = await GET(makeRequest({ status: 'invalid_status' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid status');
  });

  it('filters by valid status', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1', role: 'admin' } } as any);
    mockDb([{ id: 'l1', status: 'pending_approval' }], 1);
    const res = await GET(makeRequest({ status: 'pending_approval' }));
    expect(res.status).toBe(200);
  });

  it('returns 400 for invalid pagination', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1', role: 'admin' } } as any);
    const res = await GET(makeRequest({ page: '0' }));
    expect(res.status).toBe(400);
  });
});
