/**
 * Platform Statistics Service
 * 
 * Handles calculation and aggregation of platform-wide statistics including:
 * - Book metrics (total listed, sold, active listings)
 * - User metrics (total users, buyers, sellers)
 * - Revenue metrics (total revenue, platform commission)
 * - Environmental impact (trees saved, water saved, CO₂ reduced)
 * 
 * Requirements: 9.1, 16.1-16.6
 */

import { supabase } from '../lib/supabase';

const logger = {
  info: (msg: string, ...args: unknown[]) => console.info('[platform-stats]', msg, ...args),
  error: (msg: string, ...args: unknown[]) => console.error('[platform-stats]', msg, ...args),
  warn: (msg: string, ...args: unknown[]) => console.warn('[platform-stats]', msg, ...args),
};

export interface PlatformStats {
  date: string;
  total_books_listed: number;
  total_books_sold: number;
  active_listings: number;
  total_users: number;
  total_buyers: number;
  total_sellers: number;
  revenue_generated: number;
  platform_commission_earned: number;
  trees_saved: number;
  water_saved_liters: number;
  co2_reduced_kg: number;
}

export interface CalculatePlatformStatsResult {
  success: boolean;
  stats?: PlatformStats;
  error?: string;
}

/**
 * Calculate environmental impact metrics
 * 
 * Requirements: 10.1-10.3
 * - trees_saved = books_reused / 30
 * - water_saved_liters = books_reused × 50
 * - co2_reduced_kg = books_reused × 2.5
 */
function calculateEnvironmentalImpact(booksReused: number): {
  trees_saved: number;
  water_saved_liters: number;
  co2_reduced_kg: number;
} {
  const trees_saved = booksReused / 30;
  const water_saved_liters = booksReused * 50;
  const co2_reduced_kg = booksReused * 2.5;

  return {
    trees_saved: Number(trees_saved.toFixed(2)),
    water_saved_liters: Number(water_saved_liters.toFixed(2)),
    co2_reduced_kg: Number(co2_reduced_kg.toFixed(2)),
  };
}

/**
 * Calculate platform-wide statistics
 * 
 * Requirements: 9.1, 16.1-16.6
 * - Aggregates total_books_listed, total_books_sold, active_listings
 * - Calculates total_users, total_buyers, total_sellers
 * - Calculates revenue_generated and platform_commission_earned
 * - Calculates environmental impact metrics
 * - Stores daily stats in platform_stats table
 */
export async function calculatePlatformStats(
  date?: Date
): Promise<CalculatePlatformStatsResult> {
  try {
    const statsDate = date || new Date();
    const dateString = statsDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    logger.info(`Calculating platform stats for date: ${dateString}`);

    // Step 1: Aggregate book metrics
    // Total books listed (all time)
    const { count: totalBooksListed, error: listedError } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true });

    if (listedError) {
      logger.error('Failed to count total books listed:', listedError);
      return {
        success: false,
        error: 'Failed to count total books listed',
      };
    }

    // Total books sold (all time)
    const { count: totalBooksSold, error: soldError } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sold');

    if (soldError) {
      logger.error('Failed to count total books sold:', soldError);
      return {
        success: false,
        error: 'Failed to count total books sold',
      };
    }

    // Active listings (current)
    const { count: activeListings, error: activeError } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (activeError) {
      logger.error('Failed to count active listings:', activeError);
      return {
        success: false,
        error: 'Failed to count active listings',
      };
    }

    // Step 2: Calculate user metrics
    // Total users (all time)
    const { count: totalUsers, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (usersError) {
      logger.error('Failed to count total users:', usersError);
      return {
        success: false,
        error: 'Failed to count total users',
      };
    }

    // Total buyers (users who have placed orders)
    const { data: buyersData, error: buyersError } = await supabase
      .from('orders')
      .select('buyer_id')
      .not('buyer_id', 'is', null);

    if (buyersError) {
      logger.error('Failed to fetch buyers:', buyersError);
      return {
        success: false,
        error: 'Failed to fetch buyers',
      };
    }

    const uniqueBuyers = new Set(buyersData?.map((order: any) => order.buyer_id) || []);
    const totalBuyers = uniqueBuyers.size;

    // Total sellers (users who have created listings)
    const { data: sellersData, error: sellersError } = await supabase
      .from('listings')
      .select('seller_id')
      .not('seller_id', 'is', null);

    if (sellersError) {
      logger.error('Failed to fetch sellers:', sellersError);
      return {
        success: false,
        error: 'Failed to fetch sellers',
      };
    }

    const uniqueSellers = new Set(sellersData?.map((listing: any) => listing.seller_id) || []);
    const totalSellers = uniqueSellers.size;

    // Step 3: Calculate revenue metrics
    // Revenue generated (sum of final_price from completed orders)
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('price, platform_commission')
      .eq('status', 'delivered');

    if (ordersError) {
      logger.error('Failed to fetch orders for revenue calculation:', ordersError);
      return {
        success: false,
        error: 'Failed to fetch orders for revenue calculation',
      };
    }

    const revenueGenerated = ordersData?.reduce(
      (sum: number, order: any) => sum + (Number(order.price) || 0),
      0
    ) || 0;

    const platformCommissionEarned = ordersData?.reduce(
      (sum: number, order: any) => sum + (Number(order.platform_commission) || 0),
      0
    ) || 0;

    // Step 4: Calculate environmental impact
    const booksReused = totalBooksSold || 0;
    const environmentalImpact = calculateEnvironmentalImpact(booksReused);

    // Step 5: Create platform stats object
    const stats: PlatformStats = {
      date: dateString,
      total_books_listed: totalBooksListed || 0,
      total_books_sold: totalBooksSold || 0,
      active_listings: activeListings || 0,
      total_users: totalUsers || 0,
      total_buyers: totalBuyers,
      total_sellers: totalSellers,
      revenue_generated: Number(revenueGenerated.toFixed(2)),
      platform_commission_earned: Number(platformCommissionEarned.toFixed(2)),
      trees_saved: environmentalImpact.trees_saved,
      water_saved_liters: environmentalImpact.water_saved_liters,
      co2_reduced_kg: environmentalImpact.co2_reduced_kg,
    };

    // Step 6: Store daily stats in platform_stats table
    // Use upsert to handle duplicate dates
    const { error: saveError } = await supabase
      .from('platform_stats')
      .upsert(
        {
          date: dateString,
          total_books_listed: stats.total_books_listed,
          total_books_sold: stats.total_books_sold,
          active_listings: stats.active_listings,
          total_users: stats.total_users,
          total_buyers: stats.total_buyers,
          total_sellers: stats.total_sellers,
          revenue_generated: stats.revenue_generated,
          platform_commission_earned: stats.platform_commission_earned,
          trees_saved: stats.trees_saved,
          water_saved_liters: stats.water_saved_liters,
          co2_reduced_kg: stats.co2_reduced_kg,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'date',
        }
      )
      .select()
      .single();

    if (saveError) {
      logger.error('Failed to save platform stats:', saveError);
      return {
        success: false,
        error: 'Failed to save platform stats',
      };
    }

    logger.info(`Successfully calculated and saved platform stats for ${dateString}`);

    return {
      success: true,
      stats,
    };
  } catch (error) {
    logger.error('Error calculating platform stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get platform stats for a specific date
 */
export async function getPlatformStats(
  date?: Date
): Promise<CalculatePlatformStatsResult> {
  try {
    const statsDate = date || new Date();
    const dateString = statsDate.toISOString().split('T')[0];

    logger.info(`Fetching platform stats for date: ${dateString}`);

    const { data: stats, error } = await supabase
      .from('platform_stats')
      .select('*')
      .eq('date', dateString)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No stats found for this date, calculate them
        logger.info(`No stats found for ${dateString}, calculating...`);
        return await calculatePlatformStats(statsDate);
      }

      logger.error('Failed to fetch platform stats:', error);
      return {
        success: false,
        error: 'Failed to fetch platform stats',
      };
    }

    return {
      success: true,
      stats: stats as any,
    };
  } catch (error) {
    logger.error('Error fetching platform stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get platform stats for a date range
 */
export async function getPlatformStatsRange(
  startDate: Date,
  endDate: Date
): Promise<{ success: boolean; stats?: PlatformStats[]; error?: string }> {
  try {
    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

    logger.info(`Fetching platform stats from ${startDateString} to ${endDateString}`);

    const { data: stats, error } = await supabase
      .from('platform_stats')
      .select('*')
      .gte('date', startDateString)
      .lte('date', endDateString)
      .order('date', { ascending: true });

    if (error) {
      logger.error('Failed to fetch platform stats range:', error);
      return {
        success: false,
        error: 'Failed to fetch platform stats range',
      };
    }

    return {
      success: true,
      stats: stats as any,
    };
  } catch (error) {
    logger.error('Error fetching platform stats range:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
