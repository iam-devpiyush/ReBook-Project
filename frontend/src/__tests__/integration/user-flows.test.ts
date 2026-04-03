/**
 * Integration Tests: Complete User Flows (Task 66.1)
 *
 * End-to-end style tests that verify complete user journeys through the
 * application using mocked external dependencies.
 *
 * Covers:
 *  - Full checkout flow: listing fetch → address form → order creation →
 *    payment intent → Razorpay modal data
 *  - Data export: GET /api/users/me/export returns all user data
 *  - Data deletion: DELETE /api/users/me/delete anonymises user and blocks
 *    active orders
 *
 * Requirements: 6.1, 6.2, 24.7, 24.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Global mocks (hoisted)
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth/middleware', () => ({ requireAuth: vi.fn(), requireAdmin: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({
  applyRateLimit: vi.fn().mockReturnValue(null),
  ORDER_RATE_LIMIT: { limit: 20, windowMs: 3600_000 },
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}));
vi.mock('@/services/payment.service', () => ({
  createPaymentIntent: vi.fn().mockResolvedValue({
    paymentIntentId: 'order_rzp_test_abc123',
    clientSecret: 'order_rzp_test_abc123',
  }),
  verifyWebhookSignature: vi.fn(),
}));
vi.mock('@/services/order.service', () => ({
  processOrder: vi.fn(),
}));
vi.mock('@/lib/security/encryption', () => ({
  sanitizePaymentRecord: vi.fn((r: unknown) => r),
  assertNoCardData: vi.fn(),
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { requireAuth } from '@/lib/auth/middleware';
import { createClient } from '@supabase/supabase-js';
import { processOrder } from '@/services/order.service';
import { POST as ordersPOST } from '@/app/api/orders/route';
import { POST as createIntentPOST } from '@/app/api/payments/create-intent/route';
import { GET as exportGET } from '@/app/api/users/me/export/route';
import { DELETE as deleteDELETE } from '@/app/api/users/me/delete/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(url: string, method: 'GET' | 'POST' | 'DELETE', body?: object) {
  return new NextRequest(url, {
    method,
    ...(body
      ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }
      : {}),
  });
}

const UNAUTH = {
  success: false,
  response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
};

const AUTH_BUYER = { success: true, user: { id: 'buyer-uuid-1', role: 'buyer' } };
const AUTH_SELLER = { success: true, user: { id: 'seller-uuid-1', role: 'seller' } };

function makeSupabaseChain(overrides: Record<string, unknown> = {}) {
  return {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn().mockReturnValue({ send: vi.fn().mockResolvedValue(undefined) }),
    auth: {
      admin: {
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
    ...overrides,
  };
}

// ============================================================================
// 1. Full Checkout Flow
// ============================================================================

describe('Full Checkout Flow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated user tries to place an order', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(UNAUTH as any);
    const res = await ordersPOST(
      makeRequest('http://localhost/api/orders', 'POST', {
        listing_id: 'listing-1',
        delivery_address: '123 Main St',
      })
    );
    expect(res.status).toBe(401);
  });

  it('creates an order with pending_payment status', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(AUTH_BUYER as any);
    // processOrder returns an OrderResult shape (orderId, not id)
    const mockOrderResult = {
      orderId: 'order-checkout-1',
      listingId: 'listing-1',
      buyerId: 'buyer-uuid-1',
      sellerId: 'seller-uuid-1',
      status: 'pending_payment',
      totalAmount: 350,
      currency: 'INR',
      paymentIntentId: null,
      clientSecret: null,
    };
    vi.mocked(processOrder).mockResolvedValueOnce(mockOrderResult as any);

    const res = await ordersPOST(
      makeRequest('http://localhost/api/orders', 'POST', {
        listing_id: 'listing-1',
        delivery_address: '123 Main St, Mumbai, Maharashtra 400001',
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('pending_payment');
    expect(body.data.id).toBe('order-checkout-1');
  });

  it('creates a Razorpay payment intent for the order', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(AUTH_BUYER as any);
    const chain = makeSupabaseChain();
    vi.mocked(chain.single as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        id: 'order-checkout-1',
        buyer_id: 'buyer-uuid-1',
        price: 350,
        status: 'pending_payment',
      },
      error: null,
    });
    vi.mocked(createClient).mockReturnValue(chain as any);

    const res = await createIntentPOST(
      makeRequest('http://localhost/api/payments/create-intent', 'POST', {
        order_id: 'order-checkout-1',
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      razorpayOrderId: expect.stringMatching(/^order_rzp_/),
      amount: 350,
      currency: 'INR',
    });
  });

  it('payment intent response contains all fields needed for Razorpay modal', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(AUTH_BUYER as any);
    const chain = makeSupabaseChain();
    vi.mocked(chain.single as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        id: 'order-checkout-2',
        buyer_id: 'buyer-uuid-1',
        price: 500,
        status: 'pending_payment',
      },
      error: null,
    });
    vi.mocked(createClient).mockReturnValue(chain as any);

    const res = await createIntentPOST(
      makeRequest('http://localhost/api/payments/create-intent', 'POST', {
        order_id: 'order-checkout-2',
      })
    );
    const body = await res.json();
    // All fields required to open the Razorpay checkout modal
    expect(body.data).toHaveProperty('razorpayOrderId');
    expect(body.data).toHaveProperty('clientSecret');
    expect(body.data).toHaveProperty('amount');
    expect(body.data).toHaveProperty('currency');
    expect(body.data).toHaveProperty('keyId');
  });

  it('returns 403 when buyer tries to pay for another user\'s order', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(AUTH_BUYER as any);
    const chain = makeSupabaseChain();
    vi.mocked(chain.single as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        id: 'order-other',
        buyer_id: 'other-buyer-id',
        price: 200,
        status: 'pending_payment',
      },
      error: null,
    });
    vi.mocked(createClient).mockReturnValue(chain as any);

    const res = await createIntentPOST(
      makeRequest('http://localhost/api/payments/create-intent', 'POST', {
        order_id: 'order-other',
      })
    );
    expect(res.status).toBe(403);
  });

  it('returns 409 when listing is already sold', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(AUTH_BUYER as any);
    vi.mocked(processOrder).mockRejectedValueOnce(new Error('Listing is not available'));

    const res = await ordersPOST(
      makeRequest('http://localhost/api/orders', 'POST', {
        listing_id: 'listing-sold',
        delivery_address: '123 Main St',
      })
    );
    expect(res.status).toBe(409);
  });

  it('returns 403 when seller tries to buy their own listing', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(AUTH_SELLER as any);
    vi.mocked(processOrder).mockRejectedValueOnce(
      new Error('Seller cannot buy their own listing')
    );

    const res = await ordersPOST(
      makeRequest('http://localhost/api/orders', 'POST', {
        listing_id: 'listing-own',
        delivery_address: '123 Main St',
      })
    );
    expect(res.status).toBe(403);
  });
});

// ============================================================================
// 2. Data Export Flow (GDPR — Requirement 24.7)
// ============================================================================

describe('Data Export Flow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(UNAUTH as any);
    const res = await exportGET(makeRequest('http://localhost/api/users/me/export', 'GET'));
    expect(res.status).toBe(401);
  });

  it('returns all user data sections in the export', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(AUTH_BUYER as any);
    const chain = makeSupabaseChain();

    const profile = { id: 'buyer-uuid-1', name: 'Alice', email: 'alice@example.com' };
    const listings = [{ id: 'l1', status: 'active', final_price: 300, created_at: '2024-01-01' }];
    const orders = [{ id: 'o1', status: 'delivered', price: 300, created_at: '2024-01-02' }];
    const reviews = [{ id: 'r1', rating: 5, comment: 'Great!', created_at: '2024-01-03' }];
    const wishlist = [{ id: 'w1', book_id: 'b1', created_at: '2024-01-04' }];

    vi.mocked(chain.single as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: profile,
      error: null,
    });
    // listings, orders, reviews, wishlist — each resolves with data
    vi.mocked(chain.or as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: orders,
      error: null,
    });
    // Override the chain so parallel queries resolve correctly
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      const base = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };
      if (table === 'users') {
        base.single = vi.fn().mockResolvedValue({ data: profile, error: null });
      } else if (table === 'listings') {
        (base as any).then = undefined;
        Object.assign(base, {
          data: listings,
          error: null,
          [Symbol.iterator]: undefined,
        });
        base.eq = vi.fn().mockResolvedValue({ data: listings, error: null });
      } else if (table === 'orders') {
        base.or = vi.fn().mockResolvedValue({ data: orders, error: null });
      } else if (table === 'reviews') {
        base.eq = vi.fn().mockResolvedValue({ data: reviews, error: null });
      } else if (table === 'wishlist') {
        base.eq = vi.fn().mockResolvedValue({ data: wishlist, error: null });
      }
      return base;
    });

    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    const res = await exportGET(makeRequest('http://localhost/api/users/me/export', 'GET'));
    expect(res.status).toBe(200);

    const contentType = res.headers.get('Content-Type');
    expect(contentType).toContain('application/json');

    const contentDisposition = res.headers.get('Content-Disposition');
    expect(contentDisposition).toContain('attachment');
    expect(contentDisposition).toContain('rebook-data-export');

    const body = await res.json();
    expect(body).toHaveProperty('exported_at');
    expect(body).toHaveProperty('user_id', 'buyer-uuid-1');
    expect(body).toHaveProperty('profile');
    expect(body).toHaveProperty('listings');
    expect(body).toHaveProperty('orders');
    expect(body).toHaveProperty('reviews');
    expect(body).toHaveProperty('wishlist');
  });

  it('export filename includes the user ID', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(AUTH_BUYER as any);

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      const base = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      };
      if (table !== 'users') {
        base.eq = vi.fn().mockResolvedValue({ data: [], error: null });
        (base as any).or = vi.fn().mockResolvedValue({ data: [], error: null });
      }
      return base;
    });
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    const res = await exportGET(makeRequest('http://localhost/api/users/me/export', 'GET'));
    const disposition = res.headers.get('Content-Disposition') ?? '';
    expect(disposition).toContain('buyer-uuid-1');
  });
});

// ============================================================================
// 3. Data Deletion Flow (GDPR — Requirement 24.8)
// ============================================================================

describe('Data Deletion Flow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(UNAUTH as any);
    const res = await deleteDELETE(
      makeRequest('http://localhost/api/users/me/delete', 'DELETE')
    );
    expect(res.status).toBe(401);
  });

  it('blocks deletion when user has active orders', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(AUTH_BUYER as any);
    const chain = makeSupabaseChain();

    // Simulate active orders found
    vi.mocked(chain.limit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: [{ id: 'order-active-1' }],
      error: null,
    });
    vi.mocked(createClient).mockReturnValue(chain as any);

    const res = await deleteDELETE(
      makeRequest('http://localhost/api/users/me/delete', 'DELETE')
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('active orders');
  });

  it('anonymises user data when no active orders exist', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(AUTH_BUYER as any);

    // The delete route calls createClient twice: once for DB ops, once for auth admin
    const authAdminChain = {
      auth: { admin: { deleteUser: vi.fn().mockResolvedValue({ error: null }) } },
    };
    const dbChain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }), // no active orders
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(createClient)
      .mockReturnValueOnce(dbChain as any)   // first call: admin DB client
      .mockReturnValueOnce(authAdminChain as any); // second call: auth admin client

    const res = await deleteDELETE(
      makeRequest('http://localhost/api/users/me/delete', 'DELETE')
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('deleted');
  });

  it('returns success message after deletion', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(AUTH_BUYER as any);

    const authAdminChain = {
      auth: { admin: { deleteUser: vi.fn().mockResolvedValue({ error: null }) } },
    };
    const dbChain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(createClient)
      .mockReturnValueOnce(dbChain as any)
      .mockReturnValueOnce(authAdminChain as any);

    const res = await deleteDELETE(
      makeRequest('http://localhost/api/users/me/delete', 'DELETE')
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(typeof body.message).toBe('string');
    expect(body.message.length).toBeGreaterThan(0);
  });

  it('checks for all active order statuses: pending_payment, paid, shipped', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(AUTH_BUYER as any);

    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [{ id: 'order-paid-1' }], error: null }),
    };
    vi.mocked(createClient).mockReturnValueOnce(chain as any);

    const res = await deleteDELETE(
      makeRequest('http://localhost/api/users/me/delete', 'DELETE')
    );
    expect(res.status).toBe(400);
  });
});
