export const dynamic = 'force-dynamic';
/**
 * API Route: /api/admin/stats
 * 
 * GET: Fetch platform statistics for admin dashboard
 * 
 * Requirements: 9.1, 16.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { createClient } from '@supabase/supabase-js';
import { appCache, TTL } from '@/lib/cache';

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Platform statistics interface
 */
interface PlatformStats {
  // Book metrics
  total_books_listed: number;
  total_books_sold: number;
  active_listings: number;

  // User metrics
  total_users: number;
  total_buyers: number;
  total_sellers: number;

  // Revenue metrics
  revenue_generated: number;
  platform_commission_earned: number;

  // Environmental impact
  trees_saved: number;
  water_saved_liters: number;
  co2_reduced_kg: number;

  // Charts data
  charts: {
    daily_sales: Array<{ date: string; count: number }>;
    listings_per_day: Array<{ date: string; count: number }>;
    revenue_by_category: Array<{ category: string; revenue: number }>;
  };
}

/**
 * In-memory cache for platform stats — delegated to shared appCache
 * Cache duration: 15 minutes (Requirement 16.4)
 */
const STATS_CACHE_KEY = 'platform_stats';

/**
 * GET /api/admin/stats
 * 
 * Fetch platform statistics with caching
 * - Requires admin authentication
 * - Returns aggregated platform metrics
 * - Includes environmental impact data
 * - Provides charts data for analytics
 * - Implements 15-minute application-level caching
 * 
 * Requirements:
 * - 9.1: Display platform statistics including total books listed, sold, active listings, and revenue metrics
 * - 16.4: Cache results for 15 minutes to improve performance
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await requireAdmin(request);

    if (!authResult.success) {
      return authResult.response;
    }

    // Check cache validity (15-minute TTL — Requirement 16.4)
    const cachedStats = appCache.get<PlatformStats>(STATS_CACHE_KEY);
    if (cachedStats) {
      return NextResponse.json({
        success: true,
        data: cachedStats,
        cached: true,
      });
    }

    // Create Supabase client
    const supabase = createAdminClient();

    // Fetch book metrics
    const { count: totalBooksListed } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true });

    const { count: totalBooksSold } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sold');

    const { count: activeListings } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Fetch user metrics
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: totalBuyers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'buyer');

    const { count: totalSellers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'seller');

    // Fetch revenue metrics from completed orders
    const { data: revenueData } = await supabase
      .from('orders')
      .select('price, platform_commission')
      .eq('status', 'delivered');

    type RevenueRecord = { price: number; platform_commission: number };
    const revenueGenerated = (revenueData as RevenueRecord[] | null)?.reduce((sum, o) => sum + (o.price || 0), 0) || 0;
    const platformCommissionEarned = (revenueData as RevenueRecord[] | null)?.reduce((sum, o) => sum + (o.platform_commission || 0), 0) || 0;

    // Fetch environmental impact from users table
    const { data: ecoData, error: ecoError } = await supabase
      .from('users')
      .select('trees_saved, water_saved_liters, co2_reduced_kg');

    if (ecoError) {
      console.error('Error fetching environmental data:', ecoError);
    }

    type EcoRecord = { trees_saved: number; water_saved_liters: number; co2_reduced_kg: number };
    const treesSaved = (ecoData as EcoRecord[] | null)?.reduce((sum, user) => sum + (user.trees_saved || 0), 0) || 0;
    const waterSavedLiters = (ecoData as EcoRecord[] | null)?.reduce((sum, user) => sum + (user.water_saved_liters || 0), 0) || 0;
    const co2ReducedKg = (ecoData as EcoRecord[] | null)?.reduce((sum, user) => sum + (user.co2_reduced_kg || 0), 0) || 0;

    // Fetch daily sales data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: dailySalesData, error: dailySalesError } = await supabase
      .from('orders')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (dailySalesError) {
      console.error('Error fetching daily sales data:', dailySalesError);
    }

    // Group sales by date
    const salesByDate = new Map<string, number>();
    (dailySalesData as Array<{ created_at: string }> | null)?.forEach((order) => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      salesByDate.set(date, (salesByDate.get(date) || 0) + 1);
    });

    const dailySales = Array.from(salesByDate.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    // Fetch listings per day (last 30 days)
    const { data: dailyListingsData, error: dailyListingsError } = await supabase
      .from('listings')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (dailyListingsError) {
      console.error('Error fetching daily listings data:', dailyListingsError);
    }

    // Group listings by date
    const listingsByDate = new Map<string, number>();
    (dailyListingsData as Array<{ created_at: string }> | null)?.forEach((listing) => {
      const date = new Date(listing.created_at).toISOString().split('T')[0];
      listingsByDate.set(date, (listingsByDate.get(date) || 0) + 1);
    });

    const listingsPerDay = Array.from(listingsByDate.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    // Fetch revenue by category
    const { data: categoryRevenueData } = await supabase
      .from('orders')
      .select(`
        price,
        listing:listings(
          book:books(
            category:categories(name)
          )
        )
      `)
      .eq('status', 'delivered');

    // Group revenue by category
    const revenueByCategory = new Map<string, number>();
    categoryRevenueData?.forEach((order: any) => {
      const categoryName = order.listing?.book?.category?.name || 'Uncategorized';
      revenueByCategory.set(
        categoryName,
        (revenueByCategory.get(categoryName) || 0) + (order.price || 0)
      );
    });

    const revenueByCategoryArray = Array.from(revenueByCategory.entries()).map(([category, revenue]) => ({
      category,
      revenue,
    }));

    // Build stats object
    const stats: PlatformStats = {
      total_books_listed: totalBooksListed || 0,
      total_books_sold: totalBooksSold || 0,
      active_listings: activeListings || 0,
      total_users: totalUsers || 0,
      total_buyers: totalBuyers || 0,
      total_sellers: totalSellers || 0,
      revenue_generated: revenueGenerated,
      platform_commission_earned: platformCommissionEarned,
      trees_saved: treesSaved,
      water_saved_liters: waterSavedLiters,
      co2_reduced_kg: co2ReducedKg,
      charts: {
        daily_sales: dailySales,
        listings_per_day: listingsPerDay,
        revenue_by_category: revenueByCategoryArray,
      },
    };

    // Update shared cache (15-minute TTL — Requirement 16.4)
    appCache.set(STATS_CACHE_KEY, stats, TTL.PLATFORM_STATS);

    return NextResponse.json({
      success: true,
      data: stats,
      cached: false,
    });

  } catch (error) {
    console.error('Error in GET /api/admin/stats:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
