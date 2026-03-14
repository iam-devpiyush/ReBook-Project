/**
 * API Route: /api/admin/stats
 * 
 * GET: Fetch platform statistics for admin dashboard
 * 
 * Requirements: 9.1, 16.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { createServerClient } from '@/lib/supabase/server';

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
 * In-memory cache for platform stats
 * Cache duration: 15 minutes (as per Requirement 16.4)
 */
export let statsCache: {
  data: PlatformStats | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0,
};

export const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Reset the stats cache (used for testing)
 */
export function resetStatsCache(): void {
  statsCache = {
    data: null,
    timestamp: 0,
  };
}

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
    
    // Check cache validity
    const now = Date.now();
    const cacheAge = now - statsCache.timestamp;
    
    if (statsCache.data && cacheAge < CACHE_DURATION_MS) {
      return NextResponse.json({
        success: true,
        data: statsCache.data,
        cached: true,
        cache_age_seconds: Math.floor(cacheAge / 1000),
      });
    }
    
    // Create Supabase client
    const supabase = createServerClient();
    
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
    const { data: revenueData, error: revenueError } = await supabase
      .from('orders')
      .select('final_price, platform_commission')
      .eq('status', 'delivered');
    
    if (revenueError) {
      console.error('Error fetching revenue data:', revenueError);
    }
    
    const revenueGenerated = (revenueData as Array<{ final_price: number; platform_commission: number }> | null)?.reduce((sum, order) => sum + (order.final_price || 0), 0) || 0;
    const platformCommissionEarned = (revenueData as Array<{ final_price: number; platform_commission: number }> | null)?.reduce((sum, order) => sum + (order.platform_commission || 0), 0) || 0;
    
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
    const { data: categoryRevenueData, error: categoryRevenueError } = await supabase
      .from('orders')
      .select(`
        final_price,
        listing:listings(
          book:books(
            category:categories(name)
          )
        )
      `)
      .eq('status', 'delivered');
    
    if (categoryRevenueError) {
      console.error('Error fetching category revenue data:', categoryRevenueError);
    }
    
    // Group revenue by category
    const revenueByCategory = new Map<string, number>();
    categoryRevenueData?.forEach((order: any) => {
      const categoryName = order.listing?.book?.category?.name || 'Uncategorized';
      revenueByCategory.set(
        categoryName,
        (revenueByCategory.get(categoryName) || 0) + (order.final_price || 0)
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
    
    // Update cache
    statsCache = {
      data: stats,
      timestamp: now,
    };
    
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
