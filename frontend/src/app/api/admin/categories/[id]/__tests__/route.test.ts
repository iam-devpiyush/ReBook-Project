/**
 * Tests for PUT and DELETE /api/admin/categories/[id]
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PUT, DELETE } from '../route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/middleware', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('@/app/api/categories/route', () => ({ wouldCreateCycle: vi.fn() }));

import { requireAdmin } from '@/lib/auth/middleware';
import { createServerClient } from '@/lib/supabase/server';
import { wouldCreateCycle } from '@/app/api/categories/route';

const mockRequireAdmin = requireAdmin as ReturnType<typeof vi.fn>;
const mockCreateClient = createServerClient as ReturnType<typeof vi.fn>;
const mockWouldCreateCycle = wouldCreateCycle as ReturnType<typeof vi.fn>;

const mockAdmin = { id: 'admin-1', role: 'admin' };
const existingCategory = { id: 'cat-1', name: 'School Books', type: 'school', parent_id: null };

function makePutRequest(id: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/admin/categories/${id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/admin/categories/${id}`, { method: 'DELETE' });
}

function mockSupabaseForPut(opts: {
  existing?: unknown;
  existingError?: unknown;
  allCategories?: unknown;
  parentExists?: boolean;
  updated?: unknown;
  updateError?: unknown;
}) {
  let callCount = 0;
  mockCreateClient.mockReturnValue({
    from: vi.fn().mockImplementation(() => {
      callCount++;
      const call = callCount;
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          if (call === 1) return Promise.resolve({ data: opts.existing ?? existingCategory, error: opts.existingError ?? null });
          if (call === 3) return Promise.resolve({ data: opts.parentExists ? { id: 'parent-1' } : null, error: opts.parentExists ? null : new Error('not found') });
          return Promise.resolve({ data: opts.updated ?? existingCategory, error: opts.updateError ?? null });
        }),
        mockResolvedValue: vi.fn(),
      };
    }),
  });
}

describe('PUT /api/admin/categories/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ success: true, user: mockAdmin });
    mockWouldCreateCycle.mockReturnValue(false);
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAdmin.mockResolvedValue({
      success: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) as any,
    });
    const res = await PUT(makePutRequest('cat-1', { name: 'New Name' }), { params: { id: 'cat-1' } });
    expect(res.status).toBe(401);
  });

  it('returns 404 when category does not exist', async () => {
    mockCreateClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('not found') }),
          }),
        }),
      }),
    });
    const res = await PUT(makePutRequest('nonexistent', { name: 'X' }), { params: { id: 'nonexistent' } });
    expect(res.status).toBe(404);
  });

  it('returns 400 when no fields are provided', async () => {
    mockCreateClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existingCategory, error: null }),
          }),
        }),
      }),
    });
    const res = await PUT(makePutRequest('cat-1', {}), { params: { id: 'cat-1' } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/no fields/i);
  });

  it('returns 400 when type is invalid', async () => {
    mockCreateClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existingCategory, error: null }),
          }),
        }),
      }),
    });
    const res = await PUT(makePutRequest('cat-1', { type: 'invalid' }), { params: { id: 'cat-1' } });
    expect(res.status).toBe(400);
  });

  it('returns 400 when setting category as its own parent', async () => {
    mockCreateClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existingCategory, error: null }),
          }),
        }),
      }),
    });
    const res = await PUT(makePutRequest('cat-1', { parent_id: 'cat-1' }), { params: { id: 'cat-1' } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/own parent/i);
  });

  it('returns 400 when parent_id would create a cycle', async () => {
    mockWouldCreateCycle.mockReturnValue(true);
    let callCount = 0;
    mockCreateClient.mockReturnValue({
      from: vi.fn().mockImplementation(() => {
        callCount++;
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(
            callCount === 1 ? { data: existingCategory, error: null } : { data: [], error: null }
          ),
        };
      }),
    });
    const res = await PUT(makePutRequest('cat-1', { parent_id: 'cat-2' }), { params: { id: 'cat-1' } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/circular/i);
  });
});

describe('DELETE /api/admin/categories/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ success: true, user: mockAdmin });
  });

  it('deletes a category successfully', async () => {
    mockCreateClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existingCategory, error: null }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });
    const res = await DELETE(makeDeleteRequest('cat-1'), { params: { id: 'cat-1' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns 404 when category does not exist', async () => {
    mockCreateClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('not found') }),
          }),
        }),
      }),
    });
    const res = await DELETE(makeDeleteRequest('nonexistent'), { params: { id: 'nonexistent' } });
    expect(res.status).toBe(404);
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAdmin.mockResolvedValue({
      success: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) as any,
    });
    const res = await DELETE(makeDeleteRequest('cat-1'), { params: { id: 'cat-1' } });
    expect(res.status).toBe(401);
  });
});
