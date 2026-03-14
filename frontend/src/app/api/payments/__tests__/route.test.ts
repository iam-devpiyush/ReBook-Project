/**
 * Integration tests for payment endpoints:
 * - POST /api/payments/create-intent
 * - POST /api/payments/webhook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---- create-intent ----
vi.mock('@/lib/auth/middleware', () => ({ requireAuth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('@/services/payment.service', () => ({
    createPaymentIntent: vi.fn().mockResolvedValue({ paymentIntentId: 'pi_test', clientSecret: 'pi_test_secret' }),
    verifyWebhookSignature: vi.fn(),
    processRefund: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/security/encryption', () => ({
    sanitizePaymentRecord: vi.fn((r: unknown) => r),
    assertNoCardData: vi.fn(),
}));

import { requireAuth } from '@/lib/auth/middleware';
import { createServerClient } from '@/lib/supabase/server';
import { verifyWebhookSignature } from '@/services/payment.service';
import { POST as createIntentPOST } from '../create-intent/route';
import { POST as webhookPOST } from '../webhook/route';

function makeCreateIntentRequest(body: object) {
    return new NextRequest('http://localhost/api/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    });
}

function makeWebhookRequest(body: object, signature = 'valid-sig') {
    return new NextRequest('http://localhost/api/payments/webhook', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': signature },
    });
}

// ============================================================================
// POST /api/payments/create-intent
// ============================================================================

describe('POST /api/payments/create-intent', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns 401 when not authenticated', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({
            success: false,
            response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
        } as any);
        const res = await createIntentPOST(makeCreateIntentRequest({ order_id: 'order-1' }));
        expect(res.status).toBe(401);
    });

    it('returns 400 when order_id is missing', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'user-1' } } as any);
        const res = await createIntentPOST(makeCreateIntentRequest({}));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toContain('order_id');
    });

    it('returns 404 when order not found', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'user-1' } } as any);
        const chain = {
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        };
        vi.mocked(createServerClient).mockReturnValue(chain as any);
        const res = await createIntentPOST(makeCreateIntentRequest({ order_id: 'order-1' }));
        expect(res.status).toBe(404);
    });

    it('returns 403 when user is not the buyer', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'other-user' } } as any);
        const chain = {
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: { id: 'order-1', buyer_id: 'buyer-1', total_amount: 500, currency: 'INR', status: 'pending_payment' },
                error: null,
            }),
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            insert: vi.fn().mockResolvedValue({ error: null }),
        };
        vi.mocked(createServerClient).mockReturnValue(chain as any);
        const res = await createIntentPOST(makeCreateIntentRequest({ order_id: 'order-1' }));
        expect(res.status).toBe(403);
    });

    it('returns 200 with payment intent on success', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'buyer-1' } } as any);
        const chain = {
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: { id: 'order-1', buyer_id: 'buyer-1', total_amount: 500, currency: 'INR', status: 'pending_payment' },
                error: null,
            }),
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            insert: vi.fn().mockResolvedValue({ error: null }),
        };
        vi.mocked(createServerClient).mockReturnValue(chain as any);
        const res = await createIntentPOST(makeCreateIntentRequest({ order_id: 'order-1' }));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.paymentIntentId).toBe('pi_test');
        expect(body.data.status).toBe('completed');
    });
});

// ============================================================================
// POST /api/payments/webhook
// ============================================================================

describe('POST /api/payments/webhook', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns 400 for invalid webhook signature', async () => {
        vi.mocked(verifyWebhookSignature).mockImplementationOnce(() => {
            throw new Error('Invalid signature');
        });
        const res = await webhookPOST(makeWebhookRequest({ event: 'payment.captured' }, 'bad-sig'));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toContain('signature');
    });

    it('returns 200 and processes payment.captured event', async () => {
        vi.mocked(verifyWebhookSignature).mockReturnValue(undefined);
        const updateEq = vi.fn().mockResolvedValue({ error: null });
        const chain = {
            from: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnValue({ eq: updateEq }),
            channel: vi.fn().mockReturnValue({ send: vi.fn().mockResolvedValue(undefined) }),
        };
        vi.mocked(createServerClient).mockReturnValue(chain as any);
        const payload = {
            event: 'payment.captured',
            payload: { payment: { entity: { id: 'pay_1', notes: { orderId: 'order-1' } } } },
        };
        const res = await webhookPOST(makeWebhookRequest(payload));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.received).toBe(true);
    });

    it('returns 200 and processes payment.failed event', async () => {
        vi.mocked(verifyWebhookSignature).mockReturnValue(undefined);
        const updateEq = vi.fn().mockResolvedValue({ error: null });
        const chain = {
            from: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnValue({ eq: updateEq }),
            channel: vi.fn().mockReturnValue({ send: vi.fn().mockResolvedValue(undefined) }),
        };
        vi.mocked(createServerClient).mockReturnValue(chain as any);
        const payload = {
            event: 'payment.failed',
            payload: { payment: { entity: { id: 'pay_1', notes: { orderId: 'order-1' } } } },
        };
        const res = await webhookPOST(makeWebhookRequest(payload));
        expect(res.status).toBe(200);
    });
});
