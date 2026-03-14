/**
 * API Route: /api/admin/analytics
 * 
 * GET: Generate analytics data for admin dashboard charts
 * 
 * Requirements: 9.12
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { createClient } from '@supabase/supabase-js';

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/admin/analytics
 * 
 * Generate analytics data for charts:
 * - Daily sales: Count of orders per day
 * - Listings per day: Count of listings created per day
 * - Revenue by category: Sum of platform commission by category
 * 
 * Query parameters:
 * - days: Number of days to include in time-series data (optional, defaults to 30, max 365)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await requireAdmin(request);

    if (!authResult.success) {
      return authResult.response;
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const days = Math.min(
      parseInt(searchParams.get('days') || '30', 10),
      365 // Max 365 days
    );

    // Validate days parameter
    if (days < 1) {
      return NextResponse.json(
        { error: 'Invalid days parameter' },
        { status: 400 }
      );
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Create Supabase client
    const supabase = createAdminClient();

    // Fetch daily sales data
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('created_at, platform_commission')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (ordersError) {
      console.error('Error fetching orders data:', ordersError);
      return NextResponse.json(
        { error: 'Failed to fetch orders data' },
        { status: 500 }
      );
    }

    // Fetch listings per day data
    const { data: listingsData, error: listingsError } = await supabase
      .from('listings')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (listingsError) {
      console.error('Error fetching listings data:', listingsError);
      return NextResponse.json(
        { error: 'Failed to fetch listings data' },
        { status: 500 }
      );
    }

    // Fetch revenue by category data
    const { data: revenueData, error: revenueError } = await supabase
      .from('orders')
      .select(`
        platform_commission,
        listing:listings!inner(
          book:books!inner(
            category:categories!inner(
              id,
              name
            )
          )
        )
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (revenueError) {
      console.error('Error fetching revenue data:', revenueError);
      return NextResponse.json(
        { error: 'Failed to fetch revenue data' },
        { status: 500 }
      );
    }

    // Process daily sales data
    const dailySalesMap = new Map<string, number>();

    (ordersData || []).forEach((order: any) => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      dailySalesMap.set(date, (dailySalesMap.get(date) || 0) + 1);
    });

    const dailySales = Array.from(dailySalesMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Process listings per day data
    const listingsPerDayMap = new Map<string, number>();

    (listingsData || []).forEach((listing: any) => {
      const date = new Date(listing.created_at).toISOString().split('T')[0];
      listingsPerDayMap.set(date, (listingsPerDayMap.get(date) || 0) + 1);
    });

    const listingsPerDay = Array.from(listingsPerDayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Process revenue by category data
    const revenueByCategoryMap = new Map<string, { categoryId: string; categoryName: string; revenue: number }>();

    (revenueData || []).forEach((order: any) => {
      const categoryId = order.listing?.book?.category?.id;
      const categoryName = order.listing?.book?.category?.name;
      const commission = parseFloat(order.platform_commission || 0);

      if (categoryId && categoryName) {
        const existing = revenueByCategoryMap.get(categoryId);

        if (existing) {
          existing.revenue += commission;
        } else {
          revenueByCategoryMap.set(categoryId, {
            categoryId,
            categoryName,
            revenue: commission,
          });
        }
      }
    });

    const revenueByCategory = Array.from(revenueByCategoryMap.values())
      .sort((a, b) => b.revenue - a.revenue); // Sort by revenue descending

    return NextResponse.json({
      success: true,
      data: {
        dailySales,
        listingsPerDay,
        revenueByCategory,
      },
      metadata: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        days,
      },
    });

  } catch (error) {
    console.error('Error in GET /api/admin/analytics:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
