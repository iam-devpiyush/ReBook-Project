/**
 * Tests for GET /api/categories
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));

import { createServerClient } from '@/lib/supabase/server';

const mockCreateClient = createServerClient as ReturnType<typeof vi.fn>;

const flatCategories = [
  { id: 'cat-1', name: 'School Books', type: 'school', parent_id: null, metadata: {}, created_at: '', updated_at: '' },
  { id: 'cat-2', name: 'Class 10', type: 'school', parent_id: 'cat-1', metadata: {}, created_at: '', updated_at: '' },
  { id: 'cat-3', name: 'College', type: 'college', parent_id: null, metadata: {}, created_at: '', updated_at: '' },
];

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/categories');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

function mockSupabase(data: unknown, error: unknown = null) {
  mockCreateClient.mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
  });
}

describe('GET /api/categories', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns flat list by default', async () => {
    mockSupabase(flatCategories);
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(3);
  });

  it('returns nested tree when tree=true', async () => {
    mockSupabase(flatCategories);
    const res = await GET(makeRequest({ tree: 'true' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    // Two root nodes
    expect(body.data).toHaveLength(2);
    const schoolRoot = body.data.find((c: any) => c.id === 'cat-1');
    expect(schoolRoot.children).toHaveLength(1);
    expect(schoolRoot.children[0].id).toBe('cat-2');
  });

  it('returns 500 on database error', async () => {
    mockCreateClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
        }),
      }),
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });
});
