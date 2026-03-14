/**
 * Integration tests for admin listing action endpoints:
 * - PUT /api/admin/listings/[id]/approve
 * - PUT /api/admin/listings/[id]/reject
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/middleware', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/services/admin-approval.service', () => ({ processAdminApproval: vi.fn() }));

import { requireAdmin } from '@/lib/auth/middleware';
import { processAdminApproval } from '@/services/admin-approval.service';
import { PUT as approvePUT } from '../[id]/approve/route';
import { PUT as rejectPUT } from '../[id]/reject/route';

const LISTING_ID = '123e4567-e89b-12d3-a456-426614174000';

function makeApproveRequest() {
    return new NextRequest(`http://localhost/api/admin/listings/${LISTING_ID}/approve`, { method: 'PUT' });
}

function makeRejectRequest(body: object) {
    return new NextRequest(`http://localhost/api/admin/listings/${LISTING_ID}/reject`, {
        method: 'PUT',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    });
}

describe('PUT /api/admin/listings/[id]/approve', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns 403 when not admin', async () => {
        vi.mocked(requireAdmin).mockResolvedValueOnce({
            success: false,
            response: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
        } as any);
        const res = await approvePUT(makeApproveRequest(), { params: { id: LISTING_ID } });
        expect(res.status).toBe(403);
    });

    it('returns 404 when listing not found', async () => {
        vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1' } } as any);
        vi.mocked(processAdminApproval).mockResolvedValueOnce({ success: false, error: 'Listing not found' });
        const res = await approvePUT(makeApproveRequest(), { params: { id: LISTING_ID } });
        expect(res.status).toBe(404);
    });

    it('returns 200 on successful approval', async () => {
        vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1' } } as any);
        vi.mocked(processAdminApproval).mockResolvedValueOnce({
            success: true,
            listing: { id: LISTING_ID, status: 'active' },
        });
        const res = await approvePUT(makeApproveRequest(), { params: { id: LISTING_ID } });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.status).toBe('active');
    });
});

describe('PUT /api/admin/listings/[id]/reject', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns 403 when not admin', async () => {
        vi.mocked(requireAdmin).mockResolvedValueOnce({
            success: false,
            response: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
        } as any);
        const res = await rejectPUT(makeRejectRequest({ reason: 'Poor quality' }), { params: { id: LISTING_ID } });
        expect(res.status).toBe(403);
    });

    it('returns 400 when reason is missing', async () => {
        vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1' } } as any);
        const res = await rejectPUT(makeRejectRequest({}), { params: { id: LISTING_ID } });
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toContain('reason');
    });

    it('returns 400 when reason exceeds 500 characters', async () => {
        vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1' } } as any);
        const res = await rejectPUT(makeRejectRequest({ reason: 'a'.repeat(501) }), { params: { id: LISTING_ID } });
        expect(res.status).toBe(400);
    });

    it('returns 200 on successful rejection', async () => {
        vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1' } } as any);
        vi.mocked(processAdminApproval).mockResolvedValueOnce({
            success: true,
            listing: { id: LISTING_ID, status: 'rejected' },
        });
        const res = await rejectPUT(makeRejectRequest({ reason: 'Poor condition' }), { params: { id: LISTING_ID } });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.status).toBe('rejected');
    });
});
