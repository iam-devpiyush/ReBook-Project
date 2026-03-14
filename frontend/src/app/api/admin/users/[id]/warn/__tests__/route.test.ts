/**
 * Tests for /api/admin/users/[id]/warn route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import * as middleware from '@/lib/auth/middleware';
import * as supabaseServer from '@/lib/supabase/server';

// Mock dependencies
vi.mock('@/lib/auth/middleware');
vi.mock('@/lib/supabase/server');

describe('POST /api/admin/users/[id]/warn', () => {
  const mockAdmin = {
    id: 'admin-123',
    email: 'admin@example.com',
    role: 'admin',
  };

  const mockSeller = {
    id: 'seller-123',
    email: 'seller@example.com',
    name: 'Test Seller',
    role: 'seller',
    is_active: true,
  };

  const mockBuyer = {
    id: 'buyer-123',
    email: 'buyer@example.com',
    name: 'Test Buyer',
    role: 'buyer',
    is_active: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      }) as any,
    });

    const request = new NextRequest('http://localhost:3000/api/admin/users/seller-123/warn', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test warning',
      }),
    });

    const response = await POST(request, { params: { id: 'seller-123' } });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 403 if user is not admin', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: false,
      response: new Response(JSON.stringify({ error: 'Forbidden: Admin role required' }), {
        status: 403,
      }) as any,
    });

    const request = new NextRequest('http://localhost:3000/api/admin/users/seller-123/warn', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test warning',
      }),
    });

    const response = await POST(request, { params: { id: 'seller-123' } });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden: Admin role required');
  });

  it('should return 400 if user ID is missing', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const request = new NextRequest('http://localhost:3000/api/admin/users//warn', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test warning',
      }),
    });

    const response = await POST(request, { params: { id: '' } });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('User ID is required');
  });

  it('should return 400 if warning message is missing', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const request = new NextRequest('http://localhost:3000/api/admin/users/seller-123/warn', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request, { params: { id: 'seller-123' } });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Warning message is required');
  });

  it('should return 400 if warning message is empty string', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const request = new NextRequest('http://localhost:3000/api/admin/users/seller-123/warn', {
      method: 'POST',
      body: JSON.stringify({
        message: '   ',
      }),
    });

    const response = await POST(request, { params: { id: 'seller-123' } });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Warning message is required');
  });

  it('should return 400 if warning message is not a string', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const request = new NextRequest('http://localhost:3000/api/admin/users/seller-123/warn', {
      method: 'POST',
      body: JSON.stringify({
        message: 123,
      }),
    });

    const response = await POST(request, { params: { id: 'seller-123' } });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Warning message is required');
  });

  it('should return 404 if user not found', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'User not found' },
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/users/nonexistent/warn', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test warning',
      }),
    });

    const response = await POST(request, { params: { id: 'nonexistent' } });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('User not found');
  });

  it('should return 400 if user is not a seller', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockBuyer,
        error: null,
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/users/buyer-123/warn', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test warning',
      }),
    });

    const response = await POST(request, { params: { id: 'buyer-123' } });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Warnings can only be sent to sellers');
  });

  it('should successfully send warning to seller', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockSeller,
              error: null,
            }),
          };
        } else if (table === 'moderation_logs') {
          return {
            insert: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          };
        }
        return {};
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/users/seller-123/warn', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Please improve your listing quality',
        notes: 'Multiple low-quality listings detected',
      }),
    });

    const response = await POST(request, { params: { id: 'seller-123' } });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.message).toBe('Warning sent successfully');
    expect(data.data.userId).toBe('seller-123');
    expect(data.data.warningMessage).toBe('Please improve your listing quality');
    expect(data.data.sentAt).toBeDefined();
  });

  it('should create moderation log entry with correct data', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockInsert = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockSeller,
              error: null,
            }),
          };
        } else if (table === 'moderation_logs') {
          return {
            insert: mockInsert,
          };
        }
        return {};
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/users/seller-123/warn', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test warning message',
        notes: 'Test notes',
      }),
    });

    await POST(request, { params: { id: 'seller-123' } });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        admin_id: 'admin-123',
        action: 'warn_seller',
        target_type: 'user',
        target_id: 'seller-123',
        reason: 'Test warning message',
        notes: 'Test notes',
        created_at: expect.any(String),
      })
    );
  });

  it('should trim warning message and notes', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockInsert = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockSeller,
              error: null,
            }),
          };
        } else if (table === 'moderation_logs') {
          return {
            insert: mockInsert,
          };
        }
        return {};
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/users/seller-123/warn', {
      method: 'POST',
      body: JSON.stringify({
        message: '  Test warning  ',
        notes: '  Test notes  ',
      }),
    });

    await POST(request, { params: { id: 'seller-123' } });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'Test warning',
        notes: 'Test notes',
      })
    );
  });

  it('should handle optional notes field', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockInsert = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockSeller,
              error: null,
            }),
          };
        } else if (table === 'moderation_logs') {
          return {
            insert: mockInsert,
          };
        }
        return {};
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/users/seller-123/warn', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test warning',
      }),
    });

    await POST(request, { params: { id: 'seller-123' } });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        notes: null,
      })
    );
  });

  it('should return 500 if moderation log creation fails', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockSeller,
              error: null,
            }),
          };
        } else if (table === 'moderation_logs') {
          return {
            insert: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          };
        }
        return {};
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/users/seller-123/warn', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test warning',
      }),
    });

    const response = await POST(request, { params: { id: 'seller-123' } });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to create moderation log');
  });

  it('should return 500 on unexpected error', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn(() => {
        throw new Error('Unexpected error');
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/users/seller-123/warn', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test warning',
      }),
    });

    const response = await POST(request, { params: { id: 'seller-123' } });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Internal server error');
  });

  it('should handle empty notes as null', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockInsert = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockSeller,
              error: null,
            }),
          };
        } else if (table === 'moderation_logs') {
          return {
            insert: mockInsert,
          };
        }
        return {};
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/users/seller-123/warn', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test warning',
        notes: '',
      }),
    });

    await POST(request, { params: { id: 'seller-123' } });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        notes: null,
      })
    );
  });
});
