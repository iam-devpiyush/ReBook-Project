/**
 * Integration tests for impact endpoints:
 * - GET /api/impact/platform
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/environmental-impact.service', () => ({
    getPlatformImpact: vi.fn(),
}));

import { getPlatformImpact } from '@/services/environmental-impact.service';
import { GET as platformGET } from '../platform/route';

describe('GET /api/impact/platform', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns 200 with platform impact data', async () => {
        vi.mocked(getPlatformImpact).mockResolvedValueOnce({
            success: true,
            impact: {
                total_books_reused: 100,
                trees_saved: 50,
                water_saved_liters: 5000,
                co2_reduced_kg: 250,
            },
        });
        const res = await platformGET();
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.trees_saved).toBe(50);
    });

    it('returns 500 when service fails', async () => {
        vi.mocked(getPlatformImpact).mockResolvedValueOnce({
            success: false,
            error: 'Database error',
        });
        const res = await platformGET();
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.error).toBeDefined();
    });

    it('returns 500 on unexpected error', async () => {
        vi.mocked(getPlatformImpact).mockRejectedValueOnce(new Error('Unexpected'));
        const res = await platformGET();
        expect(res.status).toBe(500);
    });
});
