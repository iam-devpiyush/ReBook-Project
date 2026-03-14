/**
 * Tests for /api/admin/users route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import * as middleware from '@/lib/auth/middleware';
import * as supabaseServer from '@/lib/supabase/server';

// Mock dependencies
vi.mock('@/lib/auth/middleware');
vi.mock('@/lib/supabase/server');

describe('GET /api/admin/users', () => {
  const mockAdmin = {
    id: 'admin-123',
    email: 'admin@example.com',
    role: 'admin',
  };

  const mockUsers = [
    {
      id: 'user-1',
      email: 'buyer1@example.com',
      name: 'Buyer One',
      profile_picture: 'https://example.com/pic1.jpg',
      role: 'buyer',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      rating: 4.5,
      total_transactions: 10,
      is_active: true,
      suspended_until: null,
      listing_limit: -1,
      books_sold: 0,
      books_bought: 5,
      trees_saved: 0.17,
      water_saved_liters: 250,
      co2_reduced_kg: 12.5,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'user-2',
      email: 'seller1@example.com',
      name: 'Seller One',
      profile_picture: 'https://example.com/pic2.jpg',
      role: 'seller',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      rating: 4.8,
      total_transactions: 25,
      is_active: true,
      suspended_until: null,
      listing_limit: 50,
      books_sold: 20,
      books_bought: 5,
      trees_saved: 0.67,
      water_saved_liters: 1000,
      co2_reduced_kg: 50,
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
    {
      id: 'user-3',
      email: 'suspended@example.com',
      name: 'Suspended User',
      profile_picture: null,
      role: 'seller',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      rating: 3.5,
      total_transactions: 5,
      is_active: true,
      suspended_until: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      listing_limit: 10,
      books_sold: 3,
      books_bought: 2,
      trees_saved: 0.1,
      water_saved_liters: 150,
      co2_reduced_kg: 7.5,
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z',
    },
  ];

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

    const request = new NextRequest('http://localhost:3000/api/admin/users');
    const response = await GET(request);

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

    const request = new NextRequest('http://localhost:3000/api/admin/users');
    const response = await GET(request);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden: Admin role required');
  });

  it('should fetch all users with default pagination', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: mockUsers,
        error: null,
        count: 3,
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/users');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(3);
    expect(data.data[0].status).toBe('active');
    expect(data.data[2].status).toBe('suspended');
    expect(data.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 3,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it('should filter users by role', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [mockUsers[1], mockUsers[2]],
        error: null,
        count: 2,
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/users?role=seller');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(mockSupabase.eq).toHaveBeenCalledWith('role', 'seller');
  });

  it('should return 400 for invalid role', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/users?role=invalid_role');
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid role');
    expect(data.validRoles).toEqual(['buyer', 'seller', 'admin']);
  });

  it('should filter users by active status', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [mockUsers[0], mockUsers[1]],
        error: null,
        count: 2,
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/users?status=active');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true);
  });

  it('should filter users by suspended status', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [mockUsers[2]],
        error: null,
        count: 1,
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/users?status=suspended');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(mockSupabase.gt).toHaveBeenCalledWith('suspended_until', expect.any(String));
  });

  it('should return 400 for invalid status', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/users?status=invalid_status');
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid status');
    expect(data.validStatuses).toEqual(['active', 'suspended', 'inactive']);
  });

  it('should search users by name or email', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [mockUsers[0]],
        error: null,
        count: 1,
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/users?search=Buyer');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(mockSupabase.or).toHaveBeenCalledWith('name.ilike.%Buyer%,email.ilike.%Buyer%');
  });

  it('should handle custom pagination parameters', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: mockUsers,
        error: null,
        count: 50,
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/users?page=2&pageSize=10');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.pagination.page).toBe(2);
    expect(data.pagination.pageSize).toBe(10);
    expect(data.pagination.total).toBe(50);
    expect(data.pagination.totalPages).toBe(5);
    expect(data.pagination.hasNextPage).toBe(true);
    expect(data.pagination.hasPreviousPage).toBe(true);
    
    expect(mockSupabase.range).toHaveBeenCalledWith(10, 19);
  });

  it('should enforce maximum page size of 100', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/users?pageSize=200');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.pagination.pageSize).toBe(100);
    expect(mockSupabase.range).toHaveBeenCalledWith(0, 99);
  });

  it('should return 400 for invalid pagination parameters', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const request = new NextRequest('http://localhost:3000/api/admin/users?page=0');
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid pagination parameters');
  });

  it('should return 500 on database error', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
        count: null,
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/users');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch users');
  });

  it('should combine multiple filters', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [mockUsers[1]],
        error: null,
        count: 1,
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/users?role=seller&status=active&search=Seller');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(mockSupabase.eq).toHaveBeenCalledWith('role', 'seller');
    expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true);
    expect(mockSupabase.or).toHaveBeenCalled();
  });

  it('should trim search query before applying', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [mockUsers[0]],
        error: null,
        count: 1,
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/users?search=  Buyer  ');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockSupabase.or).toHaveBeenCalledWith('name.ilike.%Buyer%,email.ilike.%Buyer%');
  });

  it('should not apply search filter for empty string', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      or: vi.fn(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: mockUsers,
        error: null,
        count: 3,
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/users?search=   ');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockSupabase.or).not.toHaveBeenCalled();
  });
});
