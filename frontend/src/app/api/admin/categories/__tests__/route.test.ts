/**
 * Tests for POST /api/admin/categories
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/middleware', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('@/app/api/categories/route', () => ({ wouldCreateCycle: vi.fn().mockReturnValue(false) }));

import { requireAdmin } from '@/lib/auth/middleware';
import { createServerClient } from '@/lib/supabase/server';

const mockRequireAdmin = requireAdmin as ReturnType<typeof vi.fn>;
const mockCreateClient = createServerClient as ReturnType<typeof vi.fn>;

const mockAdmin = { id: 'admin-1', role: 'admin' };

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/categories', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const newCategory = { id: 'cat-new', name: 'Science', type: 'college', parent_id: null, metadata: {} };

describe('POST /api/admin/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ success: true, user: mockAdmin });
  });

  it('creates a category successfully', async () => {
    mockCreateClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: newCategory, error: null }),
          }),
        }),
      }),
    });

    const res = await POST(makeRequest({ name: 'Science', type: 'college' }));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Science');
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAdmin.mockResolvedValue({
      success: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) as any,
    });
    const res = await POST(makeRequest({ name: 'X', type: 'school' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when name is missing', async () => {
    const res = await POST(makeRequest({ type: 'school' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/name/i);
  });

  it('returns 400 when type is invalid', async () => {
    const res = await POST(makeRequest({ name: 'Test', type: 'invalid' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/type/i);
  });

  it('validates parent_id exists when provided', async () => {
    mockCreateClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('not found') }),
          }),
        }),
      }),
    });

    const res = await POST(makeRequest({ name: 'Child', type: 'school', parent_id: 'nonexistent' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/parent_id/i);
  });

  it('returns 500 on database error', async () => {
    mockCreateClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
          }),
        }),
      }),
    });

    const res = await POST(makeRequest({ name: 'Test', type: 'school' }));
    expect(res.status).toBe(500);
  });
});
