/**
 * Integration tests for POST /api/reviews
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

vi.mock('@/lib/auth/middleware', () => ({ requireAuth: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(),
}));

import { requireAuth } from '@/lib/auth/middleware';
import { createClient } from '@supabase/supabase-js';

function makeRequest(body: object) {
    return new NextRequest('http://localhost/api/reviews', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    });
}

const VALID_ORDER_ID = '123e4567-e89b-12d3-a456-426614174000';

function mockAdminClient(order: unknown, orderError: unknown = null, existingReview: unknown = null, insertResult: unknown = null) {
    const client = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
            .mockResolvedValueOnce({ data: order, error: orderError })
            .mockResolvedValueOnce({ data: insertResult, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: existingReview, error: null }),
        insert: vi.fn().mockReturnThis(),
    };
    vi.mocked(createClient).mockReturnValue(client as any);
    return client;
}

describe('POST /api/reviews', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    });

    it('returns 401 when not authenticated', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({
            success: false,
            response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
        } as any);
        const res = await POST(makeRequest({ order_id: VALID_ORDER_ID, rating: 5, comment: 'Great!' }));
        expect(res.status).toBe(401);
    });

    it('returns 400 for invalid order_id (not UUID)', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'user-1' } } as any);
        const res = await POST(makeRequest({ order_id: 'not-a-uuid', rating: 5, comment: 'Great!' }));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('Validation failed');
    });

    it('returns 400 for rating out of range', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'user-1' } } as any);
        const res = await POST(makeRequest({ order_id: VALID_ORDER_ID, rating: 6, comment: 'Great!' }));
        expect(res.status).toBe(400);
    });

    it('returns 400 for empty comment', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'user-1' } } as any);
        const res = await POST(makeRequest({ order_id: VALID_ORDER_ID, rating: 5, comment: '' }));
        expect(res.status).toBe(400);
    });

    it('returns 404 when order not found', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'user-1' } } as any);
        mockAdminClient(null, { message: 'Not found' });
        const res = await POST(makeRequest({ order_id: VALID_ORDER_ID, rating: 5, comment: 'Great!' }));
        expect(res.status).toBe(404);
    });

    it('returns 403 when reviewer is not the buyer', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'other-user' } } as any);
        mockAdminClient({ id: VALID_ORDER_ID, buyer_id: 'buyer-1', seller_id: 'seller-1', status: 'delivered' });
        const res = await POST(makeRequest({ order_id: VALID_ORDER_ID, rating: 5, comment: 'Great!' }));
        expect(res.status).toBe(403);
    });

    it('returns 422 when order is not delivered', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'buyer-1' } } as any);
        mockAdminClient({ id: VALID_ORDER_ID, buyer_id: 'buyer-1', seller_id: 'seller-1', status: 'paid' });
        const res = await POST(makeRequest({ order_id: VALID_ORDER_ID, rating: 5, comment: 'Great!' }));
        expect(res.status).toBe(422);
    });

    it('returns 409 when review already exists', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'buyer-1' } } as any);
        mockAdminClient(
            { id: VALID_ORDER_ID, buyer_id: 'buyer-1', seller_id: 'seller-1', status: 'delivered' },
            null,
            { id: 'existing-review' }
        );
        const res = await POST(makeRequest({ order_id: VALID_ORDER_ID, rating: 5, comment: 'Great!' }));
        expect(res.status).toBe(409);
    });

    it('returns 201 on successful review creation', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'buyer-1' } } as any);
        const newReview = { id: 'review-1', order_id: VALID_ORDER_ID, reviewer_id: 'buyer-1', reviewee_id: 'seller-1', rating: 5, comment: 'Great!', created_at: new Date().toISOString() };
        const client = {
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn()
                .mockResolvedValueOnce({ data: { id: VALID_ORDER_ID, buyer_id: 'buyer-1', seller_id: 'seller-1', status: 'delivered' }, error: null })
                .mockResolvedValueOnce({ data: newReview, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockReturnThis(),
        };
        vi.mocked(createClient).mockReturnValue(client as any);
        const res = await POST(makeRequest({ order_id: VALID_ORDER_ID, rating: 5, comment: 'Great!' }));
        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.rating).toBe(5);
    });
});
