/**
 * Tests for /api/admin/moderation-logs route
 *
 * Requirements: 9.11
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import * as middleware from '@/lib/auth/middleware';
import * as supabaseServer from '@/lib/supabase/server';

// Mock dependencies
vi.mock('@/lib/auth/middleware');
vi.mock('@/lib/supabase/server');

describe('GET /api/admin/moderation-logs', () => {
  const mockAdmin = {
    id: 'admin-123',
    email: 'admin@example.com',
    role: 'admin',
  };

  const mockLogs = [
    {
      id: 'log-1',
      admin_id: 'admin-123',
      action: 'approve_listing',
      target_type: 'listing',
      target_id: 'listing-1',
      reason: 'Looks good',
      notes: null,
      created_at: '2024-03-01T10:00:00Z',
      admin: { id: 'admin-123', name: 'Admin User', email: 'admin@example.com' },
    },
    {
      id: 'log-2',
      admin_id: 'admin-123',
      action: 'suspend_user',
      target_type: 'user',
      target_id: 'user-1',
      reason: 'Spam activity',
      notes: 'Repeated violations',
      created_at: '2024-03-02T12:00:00Z',
      admin: { id: 'admin-123', name: 'Admin User', email: 'admin@example.com' },
    },
    {
      id: 'log-3',
      admin_id: 'admin-456',
      action: 'reject_listing',
      target_type: 'listing',
      target_id: 'listing-2',
      reason: 'Poor image quality',
      notes: null,
      created_at: '2024-03-03T09:00:00Z',
      admin: { id: 'admin-456', name: 'Second Admin', email: 'admin2@example.com' },
    },
  ];

  // Helper to build a chainable Supabase mock
  function buildMockSupabase(resolvedValue: any) {
    const mock: any = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue(resolvedValue),
    };
    return mock;
  }

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

    const request = new NextRequest('http://localhost:3000/api/admin/moderation-logs');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 403 if user is not admin', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: false,
      response: new Response(
        JSON.stringify({ error: 'Forbidden: Admin role required' }),
        { status: 403 }
      ) as any,
    });

    const request = new NextRequest('http://localhost:3000/api/admin/moderation-logs');
    const response = await GET(request);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden: Admin role required');
  });

  it('should fetch all logs with default pagination', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = buildMockSupabase({ data: mockLogs, error: null, count: 3 });
    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/moderation-logs');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(3);
    expect(data.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 3,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it('should filter logs by startDate', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = buildMockSupabase({ data: [mockLogs[1], mockLogs[2]], error: null, count: 2 });
    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest(
      'http://localhost:3000/api/admin/moderation-logs?startDate=2024-03-02'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockSupabase.gte).toHaveBeenCalledWith('created_at', expect.any(String));
  });

  it('should filter logs by endDate', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = buildMockSupabase({ data: [mockLogs[0]], error: null, count: 1 });
    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest(
      'http://localhost:3000/api/admin/moderation-logs?endDate=2024-03-01'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockSupabase.lte).toHaveBeenCalledWith('created_at', expect.any(String));
  });

  it('should filter logs by adminId', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = buildMockSupabase({
      data: [mockLogs[0], mockLogs[1]],
      error: null,
      count: 2,
    });
    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest(
      'http://localhost:3000/api/admin/moderation-logs?adminId=admin-123'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockSupabase.eq).toHaveBeenCalledWith('admin_id', 'admin-123');
  });

  it('should filter logs by action type', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = buildMockSupabase({ data: [mockLogs[0]], error: null, count: 1 });
    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest(
      'http://localhost:3000/api/admin/moderation-logs?action=approve_listing'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockSupabase.eq).toHaveBeenCalledWith('action', 'approve_listing');
  });

  it('should filter logs by targetType', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = buildMockSupabase({ data: [mockLogs[1]], error: null, count: 1 });
    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest(
      'http://localhost:3000/api/admin/moderation-logs?targetType=user'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockSupabase.eq).toHaveBeenCalledWith('target_type', 'user');
  });

  it('should return 400 for invalid action type', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    vi.mocked(supabaseServer.createServerClient).mockReturnValue({} as any);

    const request = new NextRequest(
      'http://localhost:3000/api/admin/moderation-logs?action=invalid_action'
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid action type');
    expect(data.validActions).toBeDefined();
  });

  it('should return 400 for invalid targetType', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    vi.mocked(supabaseServer.createServerClient).mockReturnValue({} as any);

    const request = new NextRequest(
      'http://localhost:3000/api/admin/moderation-logs?targetType=invalid_type'
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid targetType');
    expect(data.validTargetTypes).toBeDefined();
  });

  it('should return 400 for invalid startDate format', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    vi.mocked(supabaseServer.createServerClient).mockReturnValue({} as any);

    const request = new NextRequest(
      'http://localhost:3000/api/admin/moderation-logs?startDate=not-a-date'
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid startDate');
  });

  it('should return 400 for invalid endDate format', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    vi.mocked(supabaseServer.createServerClient).mockReturnValue({} as any);

    const request = new NextRequest(
      'http://localhost:3000/api/admin/moderation-logs?endDate=not-a-date'
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid endDate');
  });

  it('should return 400 for invalid pagination parameters', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const request = new NextRequest(
      'http://localhost:3000/api/admin/moderation-logs?page=0'
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid pagination parameters');
  });

  it('should handle custom pagination parameters', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = buildMockSupabase({ data: mockLogs, error: null, count: 50 });
    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest(
      'http://localhost:3000/api/admin/moderation-logs?page=2&pageSize=10'
    );
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

    const mockSupabase = buildMockSupabase({ data: [], error: null, count: 0 });
    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest(
      'http://localhost:3000/api/admin/moderation-logs?pageSize=500'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.pagination.pageSize).toBe(100);
    expect(mockSupabase.range).toHaveBeenCalledWith(0, 99);
  });

  it('should return 500 on database error', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = buildMockSupabase({
      data: null,
      error: { message: 'Database error' },
      count: null,
    });
    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/moderation-logs');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch moderation logs');
  });

  it('should combine multiple filters', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = buildMockSupabase({ data: [mockLogs[0]], error: null, count: 1 });
    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest(
      'http://localhost:3000/api/admin/moderation-logs?adminId=admin-123&action=approve_listing&targetType=listing&startDate=2024-03-01&endDate=2024-03-31'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockSupabase.eq).toHaveBeenCalledWith('admin_id', 'admin-123');
    expect(mockSupabase.eq).toHaveBeenCalledWith('action', 'approve_listing');
    expect(mockSupabase.eq).toHaveBeenCalledWith('target_type', 'listing');
    expect(mockSupabase.gte).toHaveBeenCalled();
    expect(mockSupabase.lte).toHaveBeenCalled();
  });

  it('should return empty array when no logs match filters', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = buildMockSupabase({ data: [], error: null, count: 0 });
    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest(
      'http://localhost:3000/api/admin/moderation-logs?adminId=nonexistent-admin'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toEqual([]);
    expect(data.pagination.total).toBe(0);
    expect(data.pagination.totalPages).toBe(0);
  });

  it('should include admin details in response', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = buildMockSupabase({ data: [mockLogs[0]], error: null, count: 1 });
    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/moderation-logs');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data[0].admin).toBeDefined();
    expect(data.data[0].admin.name).toBe('Admin User');
    expect(data.data[0].admin.email).toBe('admin@example.com');
  });
});
