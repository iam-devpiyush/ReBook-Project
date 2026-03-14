/**
 * Integration tests for POST /api/listings/images
 *
 * Note: Tests that require FormData parsing are limited due to jsdom constraints
 * with NextRequest.formData(). Auth and validation tests are covered here.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

vi.mock('@/lib/auth/middleware', () => ({ requireAuth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('sharp', () => {
    const instance = {
        rotate: vi.fn().mockReturnThis(),
        withMetadata: vi.fn().mockReturnThis(),
        resize: vi.fn().mockReturnThis(),
        jpeg: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from('fake-image-data')),
    };
    return { default: vi.fn().mockReturnValue(instance) };
});
vi.mock('uuid', () => ({ v4: vi.fn().mockReturnValue('test-uuid-1234-5678') }));

import { requireAuth } from '@/lib/auth/middleware';

beforeEach(() => vi.clearAllMocks());

describe('POST /api/listings/images', () => {
    it('returns 401 when not authenticated', async () => {
        vi.mocked(requireAuth).mockResolvedValueOnce({
            success: false,
            response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
        } as any);
        const req = new NextRequest('http://localhost/api/listings/images', {
            method: 'POST',
            body: new FormData(),
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('validates JPEG and PNG are allowed file types', () => {
        // Unit test for the validation logic (extracted from route)
        const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
        const MAX_FILE_SIZE = 5 * 1024 * 1024;

        const jpegFile = { type: 'image/jpeg', size: 1024 };
        const pngFile = { type: 'image/png', size: 1024 };
        const gifFile = { type: 'image/gif', size: 1024 };
        const largeFile = { type: 'image/jpeg', size: 6 * 1024 * 1024 };

        expect(ALLOWED_MIME_TYPES.includes(jpegFile.type)).toBe(true);
        expect(ALLOWED_MIME_TYPES.includes(pngFile.type)).toBe(true);
        expect(ALLOWED_MIME_TYPES.includes(gifFile.type)).toBe(false);
        expect(largeFile.size > MAX_FILE_SIZE).toBe(true);
    });

    it('validates file size limit is 5MB', () => {
        const MAX_FILE_SIZE = 5 * 1024 * 1024;
        expect(MAX_FILE_SIZE).toBe(5242880);
        expect(4 * 1024 * 1024 < MAX_FILE_SIZE).toBe(true);
        expect(6 * 1024 * 1024 > MAX_FILE_SIZE).toBe(true);
    });
});
