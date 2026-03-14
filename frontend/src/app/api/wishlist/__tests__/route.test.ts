/**
 * Integration tests for /api/wishlist (POST + GET)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '../route';

vi.mock('@/lib/auth/middleware', () => ({ requireAuth: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

import { requireAuth } from '@/lib/auth/middleware';
import { createClient } from '@supabase/supabase-js';

const BOOK_ID = '123e4567-e89b-12d3-a456-426614174000';

function makePostRequest(body: object) {
    return new NextRequest('http://localhost/api/wishlist', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    });
}

function makeGetRequest() {
    return new NextRequest('http://localhost/api/wishlist');
}

describe('POST /api/wishlist', () => {
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
        const res = await POST(makePostRequest({ book_id: BOOK_ID }));
        expect(res.status).toBe(401);
    });

    it('returns 400 for invalid book_id', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'user-1' } } as any);
        const res = await POST(makePostRequest({ book_id: 'not-a-uuid' }));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('Validation failed');
    });

    it('returns 404 when book not found', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'user-1' } } as any);
        const client = {
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
        vi.mocked(createClient).mockReturnValue(client as any);
        const res = await POST(makePostRequest({ book_id: BOOK_ID }));
        expect(res.status).toBe(404);
    });

    it('returns 409 when book already in wishlist', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'user-1' } } as any);
        const client = {
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn()
                .mockResolvedValueOnce({ data: { id: BOOK_ID }, error: null }) // book exists
                .mockResolvedValueOnce({ data: { id: 'wishlist-1' }, error: null }), // already in wishlist
        };
        vi.mocked(createClient).mockReturnValue(client as any);
        const res = await POST(makePostRequest({ book_id: BOOK_ID }));
        expect(res.status).toBe(409);
    });

    it('returns 201 on successful add to wishlist', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'user-1' } } as any);
        const entry = { id: 'wl-1', user_id: 'user-1', book_id: BOOK_ID, created_at: new Date().toISOString() };
        const client = {
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn()
                .mockResolvedValueOnce({ data: { id: BOOK_ID }, error: null }) // book exists
                .mockResolvedValueOnce({ data: null, error: null }), // not in wishlist
            insert: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: entry, error: null }),
        };
        vi.mocked(createClient).mockReturnValue(client as any);
        const res = await POST(makePostRequest({ book_id: BOOK_ID }));
        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.book_id).toBe(BOOK_ID);
    });
});

describe('GET /api/wishlist', () => {
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
        const res = await GET(makeGetRequest());
        expect(res.status).toBe(401);
    });

    it('returns 200 with wishlist items', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'user-1' } } as any);
        const client = {
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [{ id: 'wl-1', book_id: BOOK_ID }], error: null }),
        };
        vi.mocked(createClient).mockReturnValue(client as any);
        const res = await GET(makeGetRequest());
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(1);
    });

    it('returns empty array when wishlist is empty', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'user-1' } } as any);
        const client = {
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
        vi.mocked(createClient).mockReturnValue(client as any);
        const res = await GET(makeGetRequest());
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data).toEqual([]);
    });
});
