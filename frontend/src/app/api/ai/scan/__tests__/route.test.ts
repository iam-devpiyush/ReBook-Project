/**
 * Integration tests for POST /api/ai/scan
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

vi.mock('@/lib/auth/middleware', () => ({ requireAuth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('@/lib/ai-scanner/isbn-detection', () => ({
    detectISBNBarcode: vi.fn().mockResolvedValue('9780132350884'),
}));
vi.mock('@/lib/ai-scanner/metadata-fetcher', () => ({
    fetchBookMetadata: vi.fn().mockResolvedValue({ title: 'Clean Code', author: 'Robert Martin' }),
}));
vi.mock('@/lib/ai-scanner/condition-analyzer', () => ({
    analyzeBookCondition: vi.fn().mockResolvedValue({
        cover_damage: 4, page_quality: 4, binding_quality: 4,
        markings: 4, discoloration: 4, overall_score: 4, confidence: 0.9, notes: 'Good condition',
    }),
}));

import { requireAuth } from '@/lib/auth/middleware';
import { createServerClient } from '@/lib/supabase/server';

const validImages = {
    front_cover: 'data:image/jpeg;base64,/9j/test',
    back_cover: 'data:image/jpeg;base64,/9j/test',
    spine: 'data:image/jpeg;base64,/9j/test',
    pages: 'data:image/jpeg;base64,/9j/test',
};

function makeRequest(body: object) {
    return new NextRequest('http://localhost/api/ai/scan', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    });
}

function mockSupabase() {
    const chain = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(createServerClient).mockReturnValue(chain as any);
    return chain;
}

describe('POST /api/ai/scan', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns 401 when not authenticated', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({
            success: false,
            response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
        } as any);
        const res = await POST(makeRequest({ images: validImages, scan_id: 'scan-1' }));
        expect(res.status).toBe(401);
    });

    it('returns 400 when images are missing', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'user-1' } } as any);
        const res = await POST(makeRequest({ scan_id: 'scan-1' }));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toContain('images');
    });

    it('returns 400 when scan_id is missing', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'user-1' } } as any);
        const res = await POST(makeRequest({ images: validImages }));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toContain('scan_id');
    });

    it('returns 400 when not all image types are provided', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'user-1' } } as any);
        const res = await POST(makeRequest({
            images: { front_cover: 'data:image/jpeg;base64,test' }, // missing others
            scan_id: 'scan-1',
        }));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toContain('required');
    });

    it('returns 200 with scan result on success', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({ success: true, user: { id: 'user-1' } } as any);
        mockSupabase();
        const res = await POST(makeRequest({ images: validImages, scan_id: 'scan-1' }));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.result.detected_isbn).toBe('9780132350884');
        expect(body.result.book_metadata.title).toBe('Clean Code');
        expect(body.result.condition_analysis.overall_score).toBe(4);
        expect(body.result.status).toBe('completed');
    });
});
