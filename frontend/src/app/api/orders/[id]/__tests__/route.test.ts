/**
 * Integration tests for GET /api/orders/[id]
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

vi.mock('@/lib/auth/middleware', () => ({ requireAuth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));

import { requireAuth } from '@/lib/auth/middleware';
import { createServerClient } from '@/lib/supabase/server';

const ORDER_ID = '123e4567-e89b-12d3-a456-426614174000';

function makeRequest() {
  return new NextRequest(`http://localhost/api/orders/${ORDER_ID}`);
}

describe('GET /api/orders/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    } as any);
    const res = await GET(makeRequest(), { params: { id: ORDER_ID } });
    expect(res.status).toBe(401);
  });

  it('returns 404 when order not found', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'user-1', role: 'buyer' } } as any);
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    };
    vi.mocked(createServerClient).mockReturnValue(chain as any);
    const res = await GET(makeRequest(), { params: { id: ORDER_ID } });
    expect(res.status).toBe(404);
  });

  it('returns 403 when user is not buyer or seller', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'other-user', role: 'buyer' } } as any);
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: ORDER_ID, buyer_id: 'buyer-1', seller_id: 'seller-1', status: 'paid' },
        error: null,
      }),
    };
    vi.mocked(createServerClient).mockReturnValue(chain as any);
    const res = await GET(makeRequest(), { params: { id: ORDER_ID } });
    expect(res.status).toBe(403);
  });

  it('returns 200 for the buyer', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'buyer-1', role: 'buyer' } } as any);
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: ORDER_ID, buyer_id: 'buyer-1', seller_id: 'seller-1', status: 'paid' },
        error: null,
      }),
    };
    vi.mocked(createServerClient).mockReturnValue(chain as any);
    const res = await GET(makeRequest(), { params: { id: ORDER_ID } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(ORDER_ID);
  });

  it('returns 200 for admin user', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'admin-1', role: 'admin' } } as any);
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: ORDER_ID, buyer_id: 'buyer-1', seller_id: 'seller-1', status: 'paid' },
        error: null,
      }),
    };
    vi.mocked(createServerClient).mockReturnValue(chain as any);
    const res = await GET(makeRequest(), { params: { id: ORDER_ID } });
    expect(res.status).toBe(200);
  });
});
