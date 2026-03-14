/**
 * Integration tests for admin user endpoints:
 * - GET /api/admin/users
 * - PUT /api/admin/users/[id]/suspend
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/middleware', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));

import { requireAdmin } from '@/lib/auth/middleware';
import { createServerClient } from '@/lib/supabase/server';
import { GET } from '../route';
import { PUT as suspendPUT } from '../[id]/suspend/route';

const USER_ID = '123e4567-e89b-12d3-a456-426614174000';

function makeGetRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/admin/users');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

function makeSuspendRequest(body: object) {
  return new NextRequest(`http://localhost/api/admin/users/${USER_ID}/suspend`, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// ============================================================================
// GET /api/admin/users
// ============================================================================

describe('GET /api/admin/users', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when not admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    } as any);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  it('returns 200 with users list', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1', role: 'admin' } } as any);
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [{ id: 'user-1', name: 'Test User', role: 'buyer', is_active: true, suspended_until: null }],
        error: null,
        count: 1,
      }),
    };
    vi.mocked(createServerClient).mockReturnValue(chain as any);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].status).toBe('active');
  });

  it('returns 400 for invalid role filter', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1', role: 'admin' } } as any);
    const res = await GET(makeGetRequest({ role: 'superuser' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid status filter', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1', role: 'admin' } } as any);
    const res = await GET(makeGetRequest({ status: 'banned' }));
    expect(res.status).toBe(400);
  });
});

// ============================================================================
// PUT /api/admin/users/[id]/suspend
// ============================================================================

describe('PUT /api/admin/users/[id]/suspend', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when not admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    } as any);
    const res = await suspendPUT(makeSuspendRequest({ reason: 'Spam', duration: 7 }), { params: { id: USER_ID } });
    expect(res.status).toBe(403);
  });

  it('returns 400 when reason is missing', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1' } } as any);
    const res = await suspendPUT(makeSuspendRequest({ duration: 7 }), { params: { id: USER_ID } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('reason');
  });

  it('returns 400 when duration is invalid', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1' } } as any);
    const res = await suspendPUT(makeSuspendRequest({ reason: 'Spam', duration: -1 }), { params: { id: USER_ID } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Duration');
  });

  it('returns 404 when user not found', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1' } } as any);
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    };
    vi.mocked(createServerClient).mockReturnValue(chain as any);
    const res = await suspendPUT(makeSuspendRequest({ reason: 'Spam', duration: 7 }), { params: { id: USER_ID } });
    expect(res.status).toBe(404);
  });

  it('returns 403 when trying to suspend admin user', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1' } } as any);
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: USER_ID, role: 'admin', is_active: true },
        error: null,
      }),
    };
    vi.mocked(createServerClient).mockReturnValue(chain as any);
    const res = await suspendPUT(makeSuspendRequest({ reason: 'Test', duration: 7 }), { params: { id: USER_ID } });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('admin');
  });

  it('returns 200 on successful suspension', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1' } } as any);
    const updatedUser = { id: USER_ID, role: 'buyer', suspended_until: new Date(Date.now() + 7 * 86400000).toISOString() };
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn()
        .mockResolvedValueOnce({ data: { id: USER_ID, role: 'buyer', is_active: true }, error: null })
        .mockResolvedValueOnce({ data: updatedUser, error: null }),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(createServerClient).mockReturnValue(chain as any);
    const res = await suspendPUT(makeSuspendRequest({ reason: 'Spam', duration: 7 }), { params: { id: USER_ID } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
