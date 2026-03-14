/**
 * Integration tests for GET /api/admin/moderation-logs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

vi.mock('@/lib/auth/middleware', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));

import { requireAdmin } from '@/lib/auth/middleware';
import { createServerClient } from '@/lib/supabase/server';

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/admin/moderation-logs');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

function mockDb(logs: unknown[], count = 0) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: logs, error: null, count }),
  };
  vi.mocked(createServerClient).mockReturnValue(chain as any);
}

describe('GET /api/admin/moderation-logs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when not admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    } as any);
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it('returns 200 with logs for admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1', role: 'admin' } } as any);
    mockDb([{ id: 'log-1', action: 'approve_listing', target_type: 'listing' }], 1);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });

  it('returns 400 for invalid action filter', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1', role: 'admin' } } as any);
    const res = await GET(makeRequest({ action: 'invalid_action' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid action');
  });

  it('returns 400 for invalid targetType filter', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1', role: 'admin' } } as any);
    const res = await GET(makeRequest({ targetType: 'book' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid date format', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1', role: 'admin' } } as any);
    const res = await GET(makeRequest({ startDate: 'not-a-date' }));
    expect(res.status).toBe(400);
  });

  it('filters by valid action type', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1', role: 'admin' } } as any);
    mockDb([{ id: 'log-1', action: 'suspend_user' }], 1);
    const res = await GET(makeRequest({ action: 'suspend_user' }));
    expect(res.status).toBe(200);
  });
});
