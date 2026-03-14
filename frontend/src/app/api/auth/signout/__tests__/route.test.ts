/**
 * Integration tests for POST /api/auth/signout
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));

import { createServerClient } from '@/lib/supabase/server';

const mockCreateClient = createServerClient as ReturnType<typeof vi.fn>;

function makeRequest() {
  return new NextRequest('http://localhost/api/auth/signout', { method: 'POST' });
}

describe('POST /api/auth/signout', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 on successful sign out', async () => {
    mockCreateClient.mockReturnValue({
      auth: { signOut: vi.fn().mockResolvedValue({ error: null }) },
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('signed out');
  });

  it('returns 500 when sign out fails', async () => {
    mockCreateClient.mockReturnValue({
      auth: { signOut: vi.fn().mockResolvedValue({ error: new Error('Sign out failed') }) },
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
