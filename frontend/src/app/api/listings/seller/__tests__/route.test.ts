/**
 * Integration tests for GET /api/listings/seller/me
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../me/route';

vi.mock('@/lib/auth/middleware', () => ({ requireSeller: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('@/lib/supabase/projections', () => ({ SELLER_LISTING_PROJECTION: '*' }));

import { requireSeller } from '@/lib/auth/middleware';
import { createServerClient } from '@/lib/supabase/server';

function makeRequest(params: Record<string, string> = {}) {
    const url = new URL('http://localhost/api/listings/seller/me');
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
}

describe('GET /api/listings/seller/me', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns 401 when not authenticated as seller', async () => {
        vi.mocked(requireSeller).mockResolvedValueOnce({
            success: false,
            response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
        } as any);
        const res = await GET(makeRequest());
        expect(res.status).toBe(401);
    });

    it('returns 200 with seller listings', async () => {
        vi.mocked(requireSeller).mockResolvedValueOnce({ success: true, user: { id: 'seller-1' } } as any);
        mockDb([{ id: 'l1', status: 'active', seller_id: 'seller-1' }], 1);
        const res = await GET(makeRequest());
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(1);
        expect(body.pagination.total_count).toBe(1);
    });

    it('returns 400 for invalid status filter', async () => {
        vi.mocked(requireSeller).mockResolvedValueOnce({ success: true, user: { id: 'seller-1' } } as any);
        const res = await GET(makeRequest({ status: 'invalid' }));
        expect(res.status).toBe(400);
    });

    it('returns 400 for invalid page parameter', async () => {
        vi.mocked(requireSeller).mockResolvedValueOnce({ success: true, user: { id: 'seller-1' } } as any);
        const res = await GET(makeRequest({ page: '0' }));
        expect(res.status).toBe(400);
    });

    it('filters by status when provided', async () => {
        vi.mocked(requireSeller).mockResolvedValueOnce({ success: true, user: { id: 'seller-1' } } as any);
        mockDb([{ id: 'l1', status: 'active' }], 1);
        const res = await GET(makeRequest({ status: 'active' }));
        expect(res.status).toBe(200);
    });

    it('returns empty array when no listings', async () => {
        vi.mocked(requireSeller).mockResolvedValueOnce({ success: true, user: { id: 'seller-1' } } as any);
        mockDb([], 0);
        const res = await GET(makeRequest());
        const body = await res.json();
        expect(body.data).toEqual([]);
        expect(body.pagination.total_count).toBe(0);
    });
});
