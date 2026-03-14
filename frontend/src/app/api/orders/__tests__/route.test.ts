/**
 * Tests for /api/orders (POST + GET)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '../route';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth/middleware', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('@/services/order.service', () => ({
  processOrder: vi.fn(),
}));

import { requireAuth } from '@/lib/auth/middleware';
import { createServerClient } from '@/lib/supabase/server';
import { processOrder } from '@/services/order.service';

const mockUser = { id: 'user-123', role: 'buyer' };

function makeRequest(body?: object, query?: Record<string, string>) {
  const url = new URL('http://localhost/api/orders');
  if (query) Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url, {
    method: body ? 'POST' : 'GET',
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeGetRequest(query?: Record<string, string>) {
  const url = new URL('http://localhost/api/orders');
  if (query) Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url, { method: 'GET' });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// POST /api/orders
// ---------------------------------------------------------------------------

describe('POST /api/orders', () => {
  it('returns 401 if not authenticated', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    } as any);

    const res = await POST(makeRequest({ listing_id: 'l1', delivery_address: '123 Main St' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 if listing_id is missing', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: mockUser } as any);

    const res = await POST(makeRequest({ delivery_address: '123 Main St' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/listing_id/);
  });

  it('returns 400 if delivery_address is missing', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: mockUser } as any);

    const res = await POST(makeRequest({ listing_id: 'listing-1' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/delivery_address/);
  });

  it('returns 409 if listing is not available', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: mockUser } as any);
    vi.mocked(processOrder).mockRejectedValueOnce(new Error('Listing is not available for purchase (status: sold)'));

    const res = await POST(makeRequest({ listing_id: 'l1', delivery_address: '123 Main St' }));
    expect(res.status).toBe(409);
  });

  it('returns 403 if seller tries to buy own listing', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: mockUser } as any);
    vi.mocked(processOrder).mockRejectedValueOnce(new Error('Seller cannot purchase their own listing'));

    const res = await POST(makeRequest({ listing_id: 'l1', delivery_address: '123 Main St' }));
    expect(res.status).toBe(403);
  });

  it('creates order successfully', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: mockUser } as any);
    vi.mocked(processOrder).mockResolvedValueOnce({
      orderId: 'order-1',
      listingId: 'l1',
      buyerId: 'user-123',
      sellerId: 'seller-1',
      totalAmount: 878,
      currency: 'INR',
      status: 'pending_payment',
      paymentIntentId: 'dummy_pi_abc',
      clientSecret: 'dummy_pi_abc',
    });

    const res = await POST(makeRequest({ listing_id: 'l1', delivery_address: '123 Main St' }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.orderId).toBe('order-1');
    expect(json.data.status).toBe('pending_payment');
  });
});

// ---------------------------------------------------------------------------
// GET /api/orders
// ---------------------------------------------------------------------------

describe('GET /api/orders', () => {
  function mockSupabase(orders: any[], count = 0) {
    const result = { data: orders, error: null, count };
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue(result),
      eq: vi.fn().mockResolvedValue(result),
    };
    vi.mocked(createServerClient).mockReturnValue(chain as any);
  }

  it('returns 401 if not authenticated', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    } as any);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('returns orders for authenticated user', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: mockUser } as any);
    mockSupabase([{ id: 'order-1', status: 'paid', buyer_id: 'user-123' }], 1);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.pagination.total).toBe(1);
  });

  it('returns empty array when no orders', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: mockUser } as any);
    mockSupabase([], 0);

    const res = await GET(makeGetRequest());
    const json = await res.json();
    expect(json.data).toEqual([]);
    expect(json.pagination.total).toBe(0);
  });
});
