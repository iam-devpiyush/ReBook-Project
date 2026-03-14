/**
 * Tests for /api/admin/listings route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import * as middleware from '@/lib/auth/middleware';
import * as supabaseServer from '@/lib/supabase/server';

// Mock dependencies
vi.mock('@/lib/auth/middleware');
vi.mock('@/lib/supabase/server');

describe('GET /api/admin/listings', () => {
  const mockAdmin = {
    id: 'admin-123',
    email: 'admin@example.com',
    role: 'admin',
  };

  const mockListings = [
    {
      id: 'listing-1',
      book_id: 'book-1',
      seller_id: 'seller-1',
      status: 'pending_approval',
      original_price: 500,
      final_price: 450,
      condition_score: 4,
      created_at: '2024-01-01T00:00:00Z',
      book: {
        id: 'book-1',
        title: 'Test Book 1',
        author: 'Author 1',
        isbn: '1234567890',
      },
      seller: {
        id: 'seller-1',
        name: 'Seller One',
        email: 'seller1@example.com',
        rating: 4.5,
      },
    },
    {
      id: 'listing-2',
      book_id: 'book-2',
      seller_id: 'seller-2',
      status: 'pending_approval',
      original_price: 600,
      final_price: 550,
      condition_score: 5,
      created_at: '2024-01-02T00:00:00Z',
      book: {
        id: 'book-2',
        title: 'Test Book 2',
        author: 'Author 2',
        isbn: '0987654321',
      },
      seller: {
        id: 'seller-2',
        name: 'Seller Two',
        email: 'seller2@example.com',
        rating: 4.8,
      },
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

    const request = new NextRequest('http://localhost:3000/api/admin/listings');
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

    const request = new NextRequest('http://localhost:3000/api/admin/listings');
    const response = await GET(request);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden: Admin role required');
  });

  it('should fetch all listings with default pagination', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: mockListings,
        error: null,
        count: 2,
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/listings');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(data.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 2,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it('should filter listings by status', async () => {
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
        data: [mockListings[0]],
        error: null,
        count: 1,
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/listings?status=pending_approval');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'pending_approval');
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

    const request = new NextRequest('http://localhost:3000/api/admin/listings?status=invalid_status');
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid status');
    expect(data.validStatuses).toBeDefined();
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
        data: mockListings,
        error: null,
        count: 50,
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/listings?page=2&pageSize=10');
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

    const request = new NextRequest('http://localhost:3000/api/admin/listings?pageSize=200');
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

    const request = new NextRequest('http://localhost:3000/api/admin/listings?page=0');
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

    const request = new NextRequest('http://localhost:3000/api/admin/listings');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch listings');
  });
});
