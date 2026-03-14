/**
 * Integration tests for POST /api/admin/categories
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

vi.mock('@/lib/auth/middleware', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('@/app/api/categories/route', () => ({ wouldCreateCycle: vi.fn().mockResolvedValue(false) }));

import { requireAdmin } from '@/lib/auth/middleware';
import { createServerClient } from '@/lib/supabase/server';

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/admin/categories', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/admin/categories', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when not admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    } as any);
    const res = await POST(makeRequest({ name: 'Test', type: 'school' }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when name is missing', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1' } } as any);
    const res = await POST(makeRequest({ type: 'school' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('name');
  });

  it('returns 400 for invalid type', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1' } } as any);
    const res = await POST(makeRequest({ name: 'Test', type: 'invalid_type' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('type');
  });

  it('returns 201 on successful category creation', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1' } } as any);
    const newCategory = { id: 'cat-1', name: 'School Books', type: 'school', parent_id: null, metadata: {} };
    const chain = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newCategory, error: null }),
    };
    vi.mocked(createServerClient).mockReturnValue(chain as any);
    const res = await POST(makeRequest({ name: 'School Books', type: 'school' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('School Books');
  });

  it('returns 400 when parent_id does not exist', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ success: true, user: { id: 'admin-1' } } as any);
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    };
    vi.mocked(createServerClient).mockReturnValue(chain as any);
    const res = await POST(makeRequest({ name: 'Sub Category', type: 'school', parent_id: 'non-existent-id' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('parent_id');
  });
});
