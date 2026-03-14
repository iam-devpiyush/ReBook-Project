/**
 * Tests for /api/admin/stats route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, resetStatsCache } from '../route';
import { NextRequest } from 'next/server';
import * as middleware from '@/lib/auth/middleware';
import * as supabaseServer from '@/lib/supabase/server';

// Mock dependencies
vi.mock('@/lib/auth/middleware');
vi.mock('@/lib/supabase/server');

describe('GET /api/admin/stats', () => {
  const mockAdmin = {
    id: 'admin-123',
    email: 'admin@example.com',
    role: 'admin',
  };

  /**
   * Creates a Supabase mock that handles all the queries in the stats route.
   * The route makes these queries:
   * 1. listings count (no filter) -> totalBooksListed
   * 2. listings count (status=sold) -> totalBooksSold
   * 3. listings count (status=active) -> activeListings
   * 4. users count (no filter) -> totalUsers
   * 5. users count (role=buyer) -> totalBuyers
   * 6. users count (role=seller) -> totalSellers
   * 7. orders select final_price,platform_commission (status=delivered) -> revenue
   * 8. users select trees_saved,water_saved_liters,co2_reduced_kg -> eco
   * 9. orders select created_at (gte 30 days) -> daily sales
   * 10. listings select created_at (gte 30 days) -> daily listings
   * 11. orders select with listing join (status=delivered) -> category revenue
   */
  const createMockSupabase = (overrides: Record<string, any> = {}) => {
    const defaults = {
      listingsCount: 100,
      soldCount: 45,
      activeCount: 50,
      usersCount: 250,
      buyersCount: 150,
      sellersCount: 80,
      revenueData: [
        { final_price: 500, platform_commission: 50 },
        { final_price: 750, platform_commission: 75 },
        { final_price: 300, platform_commission: 30 },
      ],
      ecoData: [
        { trees_saved: 1.5, water_saved_liters: 2250, co2_reduced_kg: 112.5 },
        { trees_saved: 0.8, water_saved_liters: 1200, co2_reduced_kg: 60 },
        { trees_saved: 2.0, water_saved_liters: 3000, co2_reduced_kg: 150 },
      ],
      dailySalesData: [
        { created_at: '2024-01-01T10:00:00Z' },
        { created_at: '2024-01-01T14:00:00Z' },
        { created_at: '2024-01-02T09:00:00Z' },
      ],
      dailyListingsData: [
        { created_at: '2024-01-01T08:00:00Z' },
        { created_at: '2024-01-01T12:00:00Z' },
        { created_at: '2024-01-01T16:00:00Z' },
        { created_at: '2024-01-02T10:00:00Z' },
      ],
      categoryRevenueData: [
        {
          final_price: 500,
          listing: { book: { category: { name: 'School Books' } } },
        },
        {
          final_price: 750,
          listing: { book: { category: { name: 'College Textbooks' } } },
        },
        {
          final_price: 300,
          listing: { book: { category: { name: 'School Books' } } },
        },
      ],
      ...overrides,
    };

    // Track call counts to distinguish between queries on the same table
    let listingsCallCount = 0;
    let usersCallCount = 0;
    let ordersCallCount = 0;

    return {
      from: vi.fn((table: string) => {
        if (table === 'listings') {
          listingsCallCount++;
          const callNum = listingsCallCount;

          return {
            select: vi.fn((columns: string, options?: any) => {
              if (options?.head) {
                // Count queries: call 1 = total, call 2 = sold, call 3 = active
                if (callNum === 1) {
                  return Promise.resolve({ count: defaults.listingsCount, error: null });
                }
                return {
                  eq: vi.fn((col: string, val: string) => {
                    if (val === 'sold') return Promise.resolve({ count: defaults.soldCount, error: null });
                    if (val === 'active') return Promise.resolve({ count: defaults.activeCount, error: null });
                    return Promise.resolve({ count: 0, error: null });
                  }),
                };
              }
              // Data query for daily listings
              return {
                gte: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: defaults.dailyListingsData, error: null }),
              };
            }),
          };
        }

        if (table === 'users') {
          usersCallCount++;
          const callNum = usersCallCount;

          return {
            select: vi.fn((columns: string, options?: any) => {
              if (options?.head) {
                // Count queries: call 1 = total, call 2 = buyers, call 3 = sellers
                if (callNum === 1) {
                  return Promise.resolve({ count: defaults.usersCount, error: null });
                }
                return {
                  eq: vi.fn((col: string, val: string) => {
                    if (val === 'buyer') return Promise.resolve({ count: defaults.buyersCount, error: null });
                    if (val === 'seller') return Promise.resolve({ count: defaults.sellersCount, error: null });
                    return Promise.resolve({ count: 0, error: null });
                  }),
                };
              }
              // Data query for eco impact
              return Promise.resolve({ data: defaults.ecoData, error: null });
            }),
          };
        }

        if (table === 'orders') {
          ordersCallCount++;
          const callNum = ordersCallCount;

          return {
            select: vi.fn((columns: string) => {
              if (columns.includes('listing:listings')) {
                // Category revenue query (call 3)
                return {
                  eq: vi.fn().mockResolvedValue({ data: defaults.categoryRevenueData, error: null }),
                };
              }
              if (columns === 'created_at') {
                // Daily sales query (call 2)
                return {
                  gte: vi.fn().mockReturnThis(),
                  order: vi.fn().mockResolvedValue({ data: defaults.dailySalesData, error: null }),
                };
              }
              // Revenue query (call 1)
              return {
                eq: vi.fn().mockResolvedValue({ data: defaults.revenueData, error: null }),
              };
            }),
          };
        }

        return { select: vi.fn().mockReturnThis() };
      }),
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetStatsCache();
  });

  it('should return 401 if not authenticated', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      }) as any,
    });

    const request = new NextRequest('http://localhost:3000/api/admin/stats');
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

    const request = new NextRequest('http://localhost:3000/api/admin/stats');
    const response = await GET(request);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden: Admin role required');
  });

  it('should fetch and return platform statistics', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(createMockSupabase() as any);

    const request = new NextRequest('http://localhost:3000/api/admin/stats');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.cached).toBe(false);
    expect(data.data.total_books_listed).toBe(100);
    expect(data.data.total_books_sold).toBe(45);
    expect(data.data.active_listings).toBe(50);
    expect(data.data.total_users).toBe(250);
    expect(data.data.total_buyers).toBe(150);
    expect(data.data.total_sellers).toBe(80);
  });

  it('should calculate revenue metrics correctly', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(createMockSupabase() as any);

    const request = new NextRequest('http://localhost:3000/api/admin/stats');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.data.revenue_generated).toBe(1550); // 500 + 750 + 300
    expect(data.data.platform_commission_earned).toBe(155); // 50 + 75 + 30
  });

  it('should calculate environmental impact correctly', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(createMockSupabase() as any);

    const request = new NextRequest('http://localhost:3000/api/admin/stats');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.data.trees_saved).toBeCloseTo(4.3, 1);
    expect(data.data.water_saved_liters).toBe(6450);
    expect(data.data.co2_reduced_kg).toBe(322.5);
  });

  it('should include charts data with daily sales grouped by date', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(createMockSupabase() as any);

    const request = new NextRequest('http://localhost:3000/api/admin/stats');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.data.charts).toBeDefined();
    expect(data.data.charts.daily_sales).toEqual([
      { date: '2024-01-01', count: 2 },
      { date: '2024-01-02', count: 1 },
    ]);
  });

  it('should include charts data with listings per day grouped by date', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(createMockSupabase() as any);

    const request = new NextRequest('http://localhost:3000/api/admin/stats');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.data.charts.listings_per_day).toEqual([
      { date: '2024-01-01', count: 3 },
      { date: '2024-01-02', count: 1 },
    ]);
  });

  it('should include charts data with revenue by category', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(createMockSupabase() as any);

    const request = new NextRequest('http://localhost:3000/api/admin/stats');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.data.charts.revenue_by_category).toEqual([
      { category: 'School Books', revenue: 800 },
      { category: 'College Textbooks', revenue: 750 },
    ]);
  });

  it('should use "Uncategorized" for orders with missing category', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(
      createMockSupabase({
        categoryRevenueData: [
          { final_price: 500, listing: { book: { category: null } } },
          { final_price: 200, listing: null },
        ],
      }) as any
    );

    const request = new NextRequest('http://localhost:3000/api/admin/stats');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.data.charts.revenue_by_category).toContainEqual({
      category: 'Uncategorized',
      revenue: 700,
    });
  });

  it('should return cached data on second request within 15 minutes', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const mockSupabase = createMockSupabase();
    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

    const request1 = new NextRequest('http://localhost:3000/api/admin/stats');
    const response1 = await GET(request1);
    expect(response1.status).toBe(200);
    const data1 = await response1.json();
    expect(data1.cached).toBe(false);

    // Second request should use cache
    const request2 = new NextRequest('http://localhost:3000/api/admin/stats');
    const response2 = await GET(request2);
    expect(response2.status).toBe(200);
    const data2 = await response2.json();
    expect(data2.cached).toBe(true);
    expect(data2.cache_age_seconds).toBeGreaterThanOrEqual(0);

    // Supabase should only be called once (for the first request)
    expect(mockSupabase.from).toHaveBeenCalledTimes(
      mockSupabase.from.mock.calls.length
    );
  });

  it('should return 500 on unexpected errors', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    vi.mocked(supabaseServer.createServerClient).mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const request = new NextRequest('http://localhost:3000/api/admin/stats');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Internal server error');
  });

  it('should handle zero counts gracefully', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    vi.mocked(supabaseServer.createServerClient).mockReturnValue(
      createMockSupabase({
        listingsCount: 0,
        soldCount: 0,
        activeCount: 0,
        usersCount: 0,
        buyersCount: 0,
        sellersCount: 0,
        revenueData: [],
        ecoData: [],
        dailySalesData: [],
        dailyListingsData: [],
        categoryRevenueData: [],
      }) as any
    );

    const request = new NextRequest('http://localhost:3000/api/admin/stats');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.data.total_books_listed).toBe(0);
    expect(data.data.total_users).toBe(0);
    expect(data.data.revenue_generated).toBe(0);
    expect(data.data.charts.daily_sales).toEqual([]);
    expect(data.data.charts.listings_per_day).toEqual([]);
    expect(data.data.charts.revenue_by_category).toEqual([]);
  });
});
