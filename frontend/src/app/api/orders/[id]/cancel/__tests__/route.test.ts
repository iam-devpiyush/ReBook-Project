/**
 * Integration tests for PUT /api/orders/[id]/cancel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PUT } from '../route';

vi.mock('@/lib/auth/middleware', () => ({ requireAuth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('@/services/payment.service', () => ({ processRefund: vi.fn().mockResolvedValue(undefined) }));

import { requireAuth } from '@/lib/auth/middleware';
import { createServerClient } from '@/lib/supabase/server';

const ORDER_ID = '123e4567-e89b-12d3-a456-426614174000';

function makeRequest() {
    return new NextRequest(`http://localhost/api/orders/${ORDER_ID}/cancel`, { method: 'PUT' });
}

function mockDb(order: unknown, orderError: unknown = null) {
    const updateChain = { eq: vi.fn().mockResolvedValue({ error: null }) };
    const chain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: order, error: orderError }),
        update: vi.fn().mockReturnValue(updateChain),
    };
    vi.mocked(createServerClient).mockReturnValue(chain as any);
    return chain;
}

describe('PUT /api/orders/[id]/cancel', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns 401 when not authenticated', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({
            success: false,
            response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
        } as any);
        const res = await PUT(makeRequest(), { params: { id: ORDER_ID } });
        expect(res.status).toBe(401);
    });

    it('returns 404 when order not found', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'user-1' } } as any);
        mockDb(null, { message: 'Not found' });
        const res = await PUT(makeRequest(), { params: { id: ORDER_ID } });
        expect(res.status).toBe(404);
    });

    it('returns 403 when user is not buyer or seller', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'other-user' } } as any);
        mockDb({ id: ORDER_ID, buyer_id: 'buyer-1', seller_id: 'seller-1', status: 'pending_payment', listing_id: 'l1', total_amount: 500 });
        const res = await PUT(makeRequest(), { params: { id: ORDER_ID } });
        expect(res.status).toBe(403);
    });

    it('returns 400 when order status is not cancellable', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'buyer-1' } } as any);
        mockDb({ id: ORDER_ID, buyer_id: 'buyer-1', seller_id: 'seller-1', status: 'delivered', listing_id: 'l1', total_amount: 500 });
        const res = await PUT(makeRequest(), { params: { id: ORDER_ID } });
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toContain('delivered');
    });

    it('returns 200 on successful cancellation', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'buyer-1' } } as any);
        const updateEq = vi.fn().mockResolvedValue({ error: null });
        const chain = {
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: { id: ORDER_ID, buyer_id: 'buyer-1', seller_id: 'seller-1', status: 'pending_payment', listing_id: 'l1', total_amount: 500 },
                error: null,
            }),
            update: vi.fn().mockReturnValue({ eq: updateEq }),
        };
        vi.mocked(createServerClient).mockReturnValue(chain as any);
        const res = await PUT(makeRequest(), { params: { id: ORDER_ID } });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.status).toBe('cancelled');
    });
});
