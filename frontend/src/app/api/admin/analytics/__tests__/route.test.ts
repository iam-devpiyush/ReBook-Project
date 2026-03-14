/**
 * Tests for /api/admin/analytics route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import * as middleware from '@/lib/auth/middleware';
import * as supabaseServer from '@/lib/supabase/server';

// Mock dependencies
vi.mock('@/lib/auth/middleware');
vi.mock('@/lib/supabase/server');

describe('GET /api/admin/analytics', () => {
  const mockAdmin = {
    id: 'admin-123',
    email: 'admin@example.com',
    role: 'admin',
  };

  const mockOrdersData = [
    {
      created_at: '2024-01-01T10:00:00Z',
      platform_commission: 50.00,
    },
    {
      created_at: '2024-01-01T14:00:00Z',
      platform_commission: 75.00,
    },
    {
      created_at: '2024-01-02T09:00:00Z',
      platform_commission: 100.00,
    },
    {
      created_at: '2024-01-03T11:00:00Z',
      platform_commission: 60.00,
    },
  ];

  const mockListingsData = [
    { created_at: '2024-01-01T08:00:00Z' },
    { created_at: '2024-01-01T12:00:00Z' },
    { created_at: '2024-01-01T16:00:00Z' },
    { created_at: '2024-01-02T10:00:00Z' },
    { created_at: '2024-01-03T14:00:00Z' },
  ];

  const mockRevenueData = [
    {
      platform_commission: 50.00,
      listing: {
        book: {
          category: {
            id: 'cat-1',
            name: 'School Books',
          },
        },
      },
    },
    {
      platform_commission: 75.00,
      listing: {
        book: {
          category: {
            id: 'cat-1',
            name: 'School Books',
          },
        },
      },
    },
    {
      platform_commission: 100.00,
      listing: {
        book: {
          category: {
            id: 'cat-2',
            name: 'Competitive Exam',
          },
        },
      },
    },
    {
      platform_commission: 60.00,
      listing: {
        book: {
          category: {
            id: 'cat-3',
            name: 'College Textbooks',
          },
        },
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

    const request = new NextRequest('http://localhost:3000/api/admin/analytics');
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

    const request = new NextRequest('http://localhost:3000/api/admin/analytics');
    const response = await GET(request);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden: Admin role required');
  });

  it('should generate analytics data with default 30 days', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn((fields: string) => {
              if (fields.includes('listing:listings')) {
                // Revenue by category query
                return {
                  gte: vi.fn().mockReturnThis(),
                  lte: vi.fn().mockResolvedValue({
                    data: mockRevenueData,
                    error: null,
                  }),
                };
              } else {
                // Daily sales query
                return {
                  gte: vi.fn().mockReturnThis(),
                  lte: vi.fn().mockReturnThis(),
                  order: vi.fn().mockResolvedValue({
                    data: mockOrdersData,
                    error: null,
                  }),
                };
              }
            }),
          };
        } else if (table === 'listings') {
          return {
            select: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: mockListingsData,
              error: null,
            }),
          };
        }
        return {};
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/analytics');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('dailySales');
    expect(data.data).toHaveProperty('listingsPerDay');
    expect(data.data).toHaveProperty('revenueByCategory');
    expect(data.metadata.days).toBe(30);
  });

  it('should process daily sales data correctly', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn((fields: string) => {
              if (fields.includes('listing:listings')) {
                return {
                  gte: vi.fn().mockReturnThis(),
                  lte: vi.fn().mockResolvedValue({
                    data: mockRevenueData,
                    error: null,
                  }),
                };
              } else {
                return {
                  gte: vi.fn().mockReturnThis(),
                  lte: vi.fn().mockReturnThis(),
                  order: vi.fn().mockResolvedValue({
                    data: mockOrdersData,
                    error: null,
                  }),
                };
              }
            }),
          };
        } else if (table === 'listings') {
          return {
            select: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: mockListingsData,
              error: null,
            }),
          };
        }
        return {};
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/analytics');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.data.dailySales).toEqual([
      { date: '2024-01-01', count: 2 },
      { date: '2024-01-02', count: 1 },
      { date: '2024-01-03', count: 1 },
    ]);
  });

  it('should process listings per day data correctly', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn((fields: string) => {
              if (fields.includes('listing:listings')) {
                return {
                  gte: vi.fn().mockReturnThis(),
                  lte: vi.fn().mockResolvedValue({
                    data: mockRevenueData,
                    error: null,
                  }),
                };
              } else {
                return {
                  gte: vi.fn().mockReturnThis(),
                  lte: vi.fn().mockReturnThis(),
                  order: vi.fn().mockResolvedValue({
                    data: mockOrdersData,
                    error: null,
                  }),
                };
              }
            }),
          };
        } else if (table === 'listings') {
          return {
            select: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: mockListingsData,
              error: null,
            }),
          };
        }
        return {};
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/analytics');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.data.listingsPerDay).toEqual([
      { date: '2024-01-01', count: 3 },
      { date: '2024-01-02', count: 1 },
      { date: '2024-01-03', count: 1 },
    ]);
  });

  it('should process revenue by category data correctly', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn((fields: string) => {
              if (fields.includes('listing:listings')) {
                return {
                  gte: vi.fn().mockReturnThis(),
                  lte: vi.fn().mockResolvedValue({
                    data: mockRevenueData,
                    error: null,
                  }),
                };
              } else {
                return {
                  gte: vi.fn().mockReturnThis(),
                  lte: vi.fn().mockReturnThis(),
                  order: vi.fn().mockResolvedValue({
                    data: mockOrdersData,
                    error: null,
                  }),
                };
              }
            }),
          };
        } else if (table === 'listings') {
          return {
            select: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: mockListingsData,
              error: null,
            }),
          };
        }
        return {};
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/analytics');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    
    // Should be sorted by revenue descending
    expect(data.data.revenueByCategory).toEqual([
      { categoryId: 'cat-1', categoryName: 'School Books', revenue: 125.00 },
      { categoryId: 'cat-2', categoryName: 'Competitive Exam', revenue: 100.00 },
      { categoryId: 'cat-3', categoryName: 'College Textbooks', revenue: 60.00 },
    ]);
  });

  it('should handle custom days parameter', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn((fields: string) => {
              if (fields.includes('listing:listings')) {
                return {
                  gte: vi.fn().mockReturnThis(),
                  lte: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                };
              } else {
                return {
                  gte: vi.fn().mockReturnThis(),
                  lte: vi.fn().mockReturnThis(),
                  order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                };
              }
            }),
          };
        } else if (table === 'listings') {
          return {
            select: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }
        return {};
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/analytics?days=7');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.metadata.days).toBe(7);
  });

  it('should enforce maximum days of 365', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn((fields: string) => {
              if (fields.includes('listing:listings')) {
                return {
                  gte: vi.fn().mockReturnThis(),
                  lte: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                };
              } else {
                return {
                  gte: vi.fn().mockReturnThis(),
                  lte: vi.fn().mockReturnThis(),
                  order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                };
              }
            }),
          };
        } else if (table === 'listings') {
          return {
            select: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }
        return {};
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/analytics?days=500');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.metadata.days).toBe(365);
  });

  it('should return 400 for invalid days parameter', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const request = new NextRequest('http://localhost:3000/api/admin/analytics?days=0');
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid days parameter');
  });

  it('should return 500 on orders data fetch error', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          };
        }
        return {};
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/analytics');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch orders data');
  });

  it('should return 500 on listings data fetch error', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        } else if (table === 'listings') {
          return {
            select: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          };
        }
        return {};
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/analytics');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch listings data');
  });

  it('should return 500 on revenue data fetch error', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn((fields: string) => {
              if (fields.includes('listing:listings')) {
                return {
                  gte: vi.fn().mockReturnThis(),
                  lte: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Database error' },
                  }),
                };
              } else {
                return {
                  gte: vi.fn().mockReturnThis(),
                  lte: vi.fn().mockReturnThis(),
                  order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                };
              }
            }),
          };
        } else if (table === 'listings') {
          return {
            select: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }
        return {};
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/analytics');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch revenue data');
  });

  it('should handle empty data gracefully', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn((fields: string) => {
              if (fields.includes('listing:listings')) {
                return {
                  gte: vi.fn().mockReturnThis(),
                  lte: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                };
              } else {
                return {
                  gte: vi.fn().mockReturnThis(),
                  lte: vi.fn().mockReturnThis(),
                  order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                };
              }
            }),
          };
        } else if (table === 'listings') {
          return {
            select: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }
        return {};
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/analytics');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data.dailySales).toEqual([]);
    expect(data.data.listingsPerDay).toEqual([]);
    expect(data.data.revenueByCategory).toEqual([]);
  });

  it('should skip orders with missing category data', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const revenueDataWithMissing = [
      ...mockRevenueData,
      {
        platform_commission: 50.00,
        listing: {
          book: {
            category: null, // Missing category
          },
        },
      },
      {
        platform_commission: 30.00,
        listing: null, // Missing listing
      },
    ];

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn((fields: string) => {
              if (fields.includes('listing:listings')) {
                return {
                  gte: vi.fn().mockReturnThis(),
                  lte: vi.fn().mockResolvedValue({
                    data: revenueDataWithMissing,
                    error: null,
                  }),
                };
              } else {
                return {
                  gte: vi.fn().mockReturnThis(),
                  lte: vi.fn().mockReturnThis(),
                  order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                };
              }
            }),
          };
        } else if (table === 'listings') {
          return {
            select: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }
        return {};
      }),
    };

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/admin/analytics');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    
    // Should only include valid categories
    expect(data.data.revenueByCategory).toHaveLength(3);
    expect(data.data.revenueByCategory.every((item: any) => item.categoryId && item.categoryName)).toBe(true);
  });
});
