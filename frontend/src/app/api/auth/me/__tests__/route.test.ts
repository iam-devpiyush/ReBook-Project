/**
 * Integration tests for GET /api/auth/me
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));

import { createServerClient } from '@/lib/supabase/server';

const mockCreateClient = createServerClient as ReturnType<typeof vi.fn>;

function makeRequest() {
  return new NextRequest('http://localhost/api/auth/me');
}

function mockSupabase(user: unknown, profile: unknown, profileError: unknown = null) {
  mockCreateClient.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: user ? null : new Error('Not authenticated') }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: profile, error: profileError }),
        }),
      }),
    }),
  });
}

describe('GET /api/auth/me', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockCreateClient.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('Not authenticated') }) },
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 200 with user profile when authenticated', async () => {
    const mockProfile = {
      id: 'user-1', email: 'user@example.com', name: 'Test User',
      profile_picture: null, role: 'buyer', oauth_provider: 'google',
      city: 'Mumbai', state: 'Maharashtra', pincode: '400001',
      latitude: null, longitude: null, rating: 4.5, total_transactions: 10,
      is_active: true, suspended_until: null, listing_limit: -1,
      books_sold: 5, books_bought: 3, trees_saved: 2, water_saved_liters: 100, co2_reduced_kg: 5,
      created_at: '2024-01-01', updated_at: '2024-01-01',
    };
    mockSupabase({ id: 'user-1' }, mockProfile);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.id).toBe('user-1');
    expect(body.user.eco_impact).toBeDefined();
    expect(body.user.eco_impact.books_sold).toBe(5);
  });

  it('returns 404 when user profile not found in database', async () => {
    mockCreateClient.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } }),
          }),
        }),
      }),
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(404);
  });

  it('returns 500 on database error', async () => {
    mockCreateClient.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'DB_ERROR', message: 'DB error' } }),
          }),
        }),
      }),
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });
});
