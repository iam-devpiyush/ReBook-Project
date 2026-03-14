/**
 * Integration tests for /api/listings/[id] (GET, PUT, DELETE)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '../route';

vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('@/lib/auth/middleware', () => ({ requireSeller: vi.fn() }));
vi.mock('@/services/search.service', () => ({
  updateMeilisearchIndex: vi.fn().mockResolvedValue(undefined),
  removeFromMeilisearchIndex: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/security/sanitize', () => ({
  maskPhoneNumber: vi.fn((p: string) => p.replace(/\d(?=\d{4})/g, '*')),
}));
vi.mock('@/lib/validation/listing', () => ({
  updateListingSchema: {
    safeParse: vi.fn().mockReturnValue({ success: true, data: { condition_score: 4 } }),
  },
}));

import { createServerClient } from '@/lib/supabase/server';
import { requireSeller } from '@/lib/auth/middleware';

const VALID_ID = '123e4567-e89b-12d3-a456-426614174000';
const INVALID_ID = 'not-a-uuid';

function makeRequest(method = 'GET', body?: object) {
  return new NextRequest(`http://localhost/api/listings/${VALID_ID}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.mocked(requireSeller).mockReset();
  vi.mocked(createServerClient).mockReset();
});

// ============================================================================
// GET /api/listings/[id]
// ============================================================================

describe('GET /api/listings/[id]', () => {
  it('returns 400 for invalid UUID', async () => {
    const req = new NextRequest(`http://localhost/api/listings/${INVALID_ID}`);
    const res = await GET(req, { params: { id: INVALID_ID } });
    expect(res.status).toBe(400);
  });

  it('returns 404 when listing not found', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      update: vi.fn().mockReturnThis(),
    };
    vi.mocked(createServerClient).mockReturnValue(chain as any);
    const res = await GET(makeRequest(), { params: { id: VALID_ID } });
    expect(res.status).toBe(404);
  });

  it('returns 200 with listing data', async () => {
    const mockListing = {
      id: VALID_ID, title: 'Clean Code', status: 'active',
      city: 'Mumbai', state: 'Maharashtra', pincode: '400001',
      seller: { id: 'seller-1', name: 'Seller', email: 'seller@example.com', profile_picture: null, rating: 4.5 },
      views: 10,
    };
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockListing, error: null }),
      update: vi.fn().mockReturnValue({ eq: updateEq }),
    };
    vi.mocked(createServerClient).mockReturnValue(chain as any);
    const res = await GET(makeRequest(), { params: { id: VALID_ID } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(VALID_ID);
  });
});

// ============================================================================
// PUT /api/listings/[id]
// ============================================================================

describe('PUT /api/listings/[id]', () => {
  it('returns 401 when not authenticated as seller', async () => {
    vi.mocked(requireSeller).mockResolvedValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    } as any);
    const res = await PUT(makeRequest('PUT', { condition_score: 4 }), { params: { id: VALID_ID } });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid UUID', async () => {
    vi.mocked(requireSeller).mockResolvedValueOnce({ success: true, user: { id: 'user-1' } } as any);
    const req = new NextRequest(`http://localhost/api/listings/${INVALID_ID}`, { method: 'PUT', body: '{}' });
    const res = await PUT(req, { params: { id: INVALID_ID } });
    expect(res.status).toBe(400);
  });

  it('returns 403 when seller does not own listing', async () => {
    vi.mocked(requireSeller).mockResolvedValueOnce({ success: true, user: { id: 'user-1' } } as any);
    const singleFn = vi.fn().mockResolvedValue({ data: { seller_id: 'other-user', status: 'active' }, error: null });
    vi.mocked(createServerClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ single: singleFn }),
        }),
      }),
    } as any);
    const res = await PUT(makeRequest('PUT', { condition_score: 4 }), { params: { id: VALID_ID } });
    expect(res.status).toBe(403);
  });
});

// ============================================================================
// DELETE /api/listings/[id]
// ============================================================================

describe('DELETE /api/listings/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireSeller).mockResolvedValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    } as any);
    const res = await DELETE(makeRequest('DELETE'), { params: { id: VALID_ID } });
    expect(res.status).toBe(401);
  });

  it('returns 400 when trying to delete sold listing', async () => {
    vi.mocked(requireSeller).mockResolvedValueOnce({ success: true, user: { id: 'user-1' } } as any);
    vi.mocked(createServerClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { seller_id: 'user-1', status: 'sold' }, error: null }),
          }),
        }),
      }),
    } as any);
    const res = await DELETE(makeRequest('DELETE'), { params: { id: VALID_ID } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('sold');
  });

  it('returns 200 on successful delete', async () => {
    vi.mocked(requireSeller).mockResolvedValueOnce({ success: true, user: { id: 'user-1' } } as any);
    vi.mocked(createServerClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { seller_id: 'user-1', status: 'active' }, error: null }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    } as any);
    const res = await DELETE(makeRequest('DELETE'), { params: { id: VALID_ID } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
