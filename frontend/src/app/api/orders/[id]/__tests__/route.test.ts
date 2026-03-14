/**
 * Tests for /api/orders/[id] (GET) and /api/orders/[id]/cancel (PUT)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { PUT } from '../cancel/route';

vi.mock('@/lib/auth/middleware', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('@/services/payment.service', () => ({
  processRefund: vi.fn(),
}));

import { requireAuth } from '@/lib/auth/middleware';
import { createServerClient } from '@/lib/supabase/server';
import { processRefund } from '@/services/payment.service';

const mockBuyer = { id: 'buyer-1', role: 'buyer' };
const mockSeller = { id: 'seller-1', role: 'seller' };
const mockOther = { id: 'other-99', role: 'buyer' };

function makeRequest(method = 'GET') {
  return new NextRequest('http://localhost/api/orders/order-1', { method });
}

function mockSingle(data: any, error: any = null) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    update: vi.fn().mockReturnThis(),
  };
  vi.mocked(createServerClient).mockReturnValue(chain as any);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// GET /api/orders/[id]
// ---------------------------------------------------------------------------

describe('GET /api/orders/[id]', () => {
  it('returns 401 if not authenticated', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    } as any);

    const res = await GET(makeRequest(), { params: { id: 'order-1' } });
    expect(res.status).toBe(401);
  });

  it('returns 404 if order not found', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: mockBuyer } as any);
    mockSingle(null, { message: 'not found' });

    const res = await GET(makeRequest(), { params: { id: 'order-1' } });
    expect(res.status).toBe(404);
  });

  it('returns 403 if user is not buyer or seller', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: mockOther } as any);
    mockSingle({ id: 'order-1', buyer_id: 'buyer-1', seller_id: 'seller-1', status: 'paid' });

    const res = await GET(makeRequest(), { params: { id: 'order-1' } });
    expect(res.status).toBe(403);
  });

  it('returns order for buyer', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: mockBuyer } as any);
    mockSingle({ id: 'order-1', buyer_id: 'buyer-1', seller_id: 'seller-1', status: 'paid' });

    const res = await GET(makeRequest(), { params: { id: 'order-1' } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe('order-1');
  });

  it('returns order for seller', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: mockSeller } as any);
    mockSingle({ id: 'order-1', buyer_id: 'buyer-1', seller_id: 'seller-1', status: 'paid' });

    const res = await GET(makeRequest(), { params: { id: 'order-1' } });
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/orders/[id]/cancel
// ---------------------------------------------------------------------------

describe('PUT /api/orders/[id]/cancel', () => {
  function mockCancelSupabase(order: any, payment?: any) {
    let callCount = 0;
    const chain = {
      from: vi.fn().mockImplementation(() => chain),
      select: vi.fn().mockImplementation(() => chain),
      eq: vi.fn().mockImplementation(() => {
        callCount++;
        return chain;
      }),
      single: vi.fn().mockImplementation(() => {
        // First call = order, second = payment
        if (callCount <= 2) return Promise.resolve({ data: order, error: null });
        return Promise.resolve({ data: payment ?? null, error: null });
      }),
      update: vi.fn().mockImplementation(() => chain),
    };
    vi.mocked(createServerClient).mockReturnValue(chain as any);
  }

  it('returns 401 if not authenticated', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    } as any);

    const res = await PUT(makeRequest('PUT'), { params: { id: 'order-1' } });
    expect(res.status).toBe(401);
  });

  it('returns 403 if user is not buyer or seller', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: mockOther } as any);
    mockCancelSupabase({ id: 'order-1', buyer_id: 'buyer-1', seller_id: 'seller-1', status: 'pending_payment' });

    const res = await PUT(makeRequest('PUT'), { params: { id: 'order-1' } });
    expect(res.status).toBe(403);
  });

  it('returns 400 if order status is not cancellable', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: mockBuyer } as any);
    mockCancelSupabase({ id: 'order-1', buyer_id: 'buyer-1', seller_id: 'seller-1', status: 'shipped' });

    const res = await PUT(makeRequest('PUT'), { params: { id: 'order-1' } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Cannot cancel/);
  });

  it('cancels a pending_payment order successfully', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: mockBuyer } as any);
    mockCancelSupabase({
      id: 'order-1', buyer_id: 'buyer-1', seller_id: 'seller-1',
      status: 'pending_payment', listing_id: 'listing-1', total_amount: 878,
    });

    const res = await PUT(makeRequest('PUT'), { params: { id: 'order-1' } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe('cancelled');
  });

  it('processes refund when cancelling a paid order', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: mockBuyer } as any);
    vi.mocked(processRefund).mockResolvedValueOnce({ refundId: 'ref_1', amount: 878, status: 'processed' });

    mockCancelSupabase(
      { id: 'order-1', buyer_id: 'buyer-1', seller_id: 'seller-1', status: 'paid', listing_id: 'l1', total_amount: 878 },
      { payment_intent_id: 'dummy_pi_abc' }
    );

    const res = await PUT(makeRequest('PUT'), { params: { id: 'order-1' } });
    expect(res.status).toBe(200);
  });
});
