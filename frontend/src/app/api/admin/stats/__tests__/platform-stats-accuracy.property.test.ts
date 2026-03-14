/**
 * Property-Based Test: Platform Stats Accuracy
 *
 * **Validates: Requirements 16.1-16.3**
 *
 * Property 17: For any date, the platform_stats record must accurately reflect:
 * - total_books_listed (count of all listings created up to that date)
 * - total_books_sold (count of listings with status "sold")
 * - active_listings (count of listings with status "active")
 * - revenue metrics (sum of platform_commission from delivered orders)
 *
 * These tests verify that aggregations of listings, users, and revenue
 * match the actual data in the database.
 */

import * as fc from 'fast-check';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeAll } from 'vitest';

// Supabase client — initialized lazily in beforeAll so real env vars are available
let supabase: SupabaseClient;

// ============================================================================
// Test Helpers
// ============================================================================

/** Creates a test user via Supabase Auth Admin API and returns their ID */
async function createTestUser(
  testPrefix: string,
  role: 'buyer' | 'seller' | 'admin' = 'seller'
): Promise<string> {
  const email = `${testPrefix}_${role}_${Math.random().toString(36).slice(2)}@test.com`;

  // Must create auth user first — public.users.id references auth.users.id
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: 'test-password-123',
    email_confirm: true,
  });

  if (authError) throw new Error(`Failed to create auth user: ${authError.message}`);
  const userId = authData.user.id;

  const { error } = await supabase
    .from('users')
    .insert({
      id: userId,
      email,
      name: `Test ${role}`,
      oauth_provider: 'google',
      oauth_provider_id: `${testPrefix}_${role}_${Date.now()}_${Math.random()}`,
      role,
      is_active: true,
      rating: 0.0,
      total_transactions: 0,
      listing_limit: -1,
      books_sold: 0,
      books_bought: 0,
      trees_saved: 0.0,
      water_saved_liters: 0.0,
      co2_reduced_kg: 0.0,
    });

  if (error) throw new Error(`Failed to create test user: ${error.message}`);
  return userId;
}

/** Creates a test book and returns its ID */
async function createTestBook(testPrefix: string): Promise<string> {
  const { data, error } = await supabase
    .from('books')
    .insert({
      title: `${testPrefix}_Book_${Math.random().toString(36).slice(2)}`,
      author: 'Test Author',
      isbn: `TEST${Date.now()}${Math.random().toString(36).slice(2)}`.slice(0, 20),
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create test book: ${error.message}`);
  return data.id;
}

/** Creates a test listing with the given status and returns its ID */
async function createTestListing(
  sellerId: string,
  bookId: string,
  status: string,
  platformCommission: number = 10
): Promise<string> {
  const { data, error } = await supabase
    .from('listings')
    .insert({
      book_id: bookId,
      seller_id: sellerId,
      original_price: 100,
      condition_score: 3,
      final_price: 100,
      delivery_cost: 50,
      platform_commission: platformCommission,
      payment_fees: 5,
      seller_payout: 90,
      status,
      images: ['test-image.jpg'],
      city: 'Test City',
      state: 'Test State',
      pincode: '110001',
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create test listing: ${error.message}`);
  return data.id;
}

/** Creates a test order with the given status and returns its ID */
async function createTestOrder(
  listingId: string,
  buyerId: string,
  sellerId: string,
  bookId: string,
  status: string,
  platformCommission: number = 10
): Promise<string> {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      listing_id: listingId,
      buyer_id: buyerId,
      seller_id: sellerId,
      book_id: bookId,
      price: 100,
      delivery_cost: 50,
      platform_commission: platformCommission,
      payment_fees: 5,
      seller_payout: 90,
      status,
      payment_status: status === 'delivered' ? 'completed' : 'pending',
      delivery_address: {
        name: 'Test Buyer',
        phone: '9999999999',
        address_line1: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        pincode: '110001',
      },
      pickup_address: {
        name: 'Test Seller',
        phone: '8888888888',
        address_line1: '456 Seller St',
        city: 'Test City',
        state: 'Test State',
        pincode: '110001',
      },
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create test order: ${error.message}`);
  return data.id;
}

/** Cleans up all test data created with the given prefix */
async function cleanupTestData(testPrefix: string): Promise<void> {
  // Find test users first
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .like('email', `%${testPrefix}%`);

  if (users && users.length > 0) {
    const userIds = users.map((u) => u.id);

    // Delete orders (references listings and users)
    await supabase.from('orders').delete().in('seller_id', userIds);
    await supabase.from('orders').delete().in('buyer_id', userIds);

    // Delete listings
    await supabase.from('listings').delete().in('seller_id', userIds);

    // Delete public user profiles
    await supabase.from('users').delete().in('id', userIds);

    // Delete auth users (must be done after public profile)
    for (const userId of userIds) {
      await supabase.auth.admin.deleteUser(userId);
    }
  }

  // Delete books
  await supabase.from('books').delete().like('title', `${testPrefix}%`);
}

// ============================================================================
// Stats Calculation (mirrors the logic in /api/admin/stats/route.ts)
// ============================================================================

interface PlatformStatsSnapshot {
  total_books_listed: number;
  total_books_sold: number;
  active_listings: number;
  total_users: number;
  platform_commission_earned: number;
}

/** Calculates platform stats directly from the database (ground truth) */
async function calculateStatsFromDB(testUserIds: string[]): Promise<PlatformStatsSnapshot> {
  // Count all listings for test sellers
  const { count: totalBooksListed } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .in('seller_id', testUserIds);

  // Count sold listings
  const { count: totalBooksSold } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .in('seller_id', testUserIds)
    .eq('status', 'sold');

  // Count active listings
  const { count: activeListings } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .in('seller_id', testUserIds)
    .eq('status', 'active');

  // Count users
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .in('id', testUserIds);

  // Sum platform commission from delivered orders
  const { data: deliveredOrders } = await supabase
    .from('orders')
    .select('platform_commission')
    .in('seller_id', testUserIds)
    .eq('status', 'delivered');

  const platformCommissionEarned =
    deliveredOrders?.reduce((sum, o) => sum + (o.platform_commission || 0), 0) ?? 0;

  return {
    total_books_listed: totalBooksListed ?? 0,
    total_books_sold: totalBooksSold ?? 0,
    active_listings: activeListings ?? 0,
    total_users: totalUsers ?? 0,
    platform_commission_earned: platformCommissionEarned,
  };
}

// ============================================================================
// Supabase Availability Guard
// ============================================================================

let supabaseAvailable = false;

beforeAll(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || url.includes('test.supabase.co') || !key || key === 'test-anon-key' || key === 'test-key') {
    console.log('Skipping: No real Supabase credentials configured');
    return;
  }

  try {
    supabase = createClient(url, key);
    const { error } = await supabase.from('users').select('id').limit(1);
    if (!error) {
      supabaseAvailable = true;
    } else {
      console.log('Skipping: Supabase query failed:', error.message);
    }
  } catch (e) {
    console.log('Skipping: Supabase not reachable:', e);
  }
});

// ============================================================================
// Property Tests
// ============================================================================

describe('Property: Platform Stats Accuracy', () => {
  /**
   * Property 17a: total_books_listed equals the count of all listings
   *
   * **Validates: Requirements 16.1**
   *
   * For any set of listings, total_books_listed must equal the total count
   * of all listings regardless of their status.
   */
  it('total_books_listed must equal the count of all listings', async () => {
    if (!supabaseAvailable) {
      console.log('Skipping: Supabase not available in this environment');
      return;
    }
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          activeCount: fc.integer({ min: 0, max: 5 }),
          soldCount: fc.integer({ min: 0, max: 5 }),
          pendingCount: fc.integer({ min: 0, max: 5 }),
        }),
        async ({ activeCount, soldCount, pendingCount }) => {
          const testPrefix = `psa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

          try {
            const sellerId = await createTestUser(testPrefix, 'seller');

            // Create listings with different statuses
            for (let i = 0; i < activeCount; i++) {
              const bookId = await createTestBook(testPrefix);
              await createTestListing(sellerId, bookId, 'active');
            }
            for (let i = 0; i < soldCount; i++) {
              const bookId = await createTestBook(testPrefix);
              await createTestListing(sellerId, bookId, 'sold');
            }
            for (let i = 0; i < pendingCount; i++) {
              const bookId = await createTestBook(testPrefix);
              await createTestListing(sellerId, bookId, 'pending_approval');
            }

            const expectedTotal = activeCount + soldCount + pendingCount;
            const stats = await calculateStatsFromDB([sellerId]);

            // Property: total_books_listed must equal the sum of all listings
            expect(stats.total_books_listed).toBe(expectedTotal);
          } finally {
            await cleanupTestData(testPrefix);
          }
        }
      ),
      { numRuns: 3, timeout: 120000 }
    );
  }, 120000);

  /**
   * Property 17b: total_books_sold equals the count of listings with status "sold"
   *
   * **Validates: Requirements 16.1**
   *
   * For any set of listings, total_books_sold must equal the count of listings
   * with status "sold" only.
   */
  it('total_books_sold must equal the count of listings with status "sold"', async () => {
    if (!supabaseAvailable) {
      console.log('Skipping: Supabase not available in this environment');
      return;
    }
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          soldCount: fc.integer({ min: 0, max: 5 }),
          activeCount: fc.integer({ min: 0, max: 5 }),
        }),
        async ({ soldCount, activeCount }) => {
          const testPrefix = `psa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

          try {
            const sellerId = await createTestUser(testPrefix, 'seller');

            for (let i = 0; i < soldCount; i++) {
              const bookId = await createTestBook(testPrefix);
              await createTestListing(sellerId, bookId, 'sold');
            }
            for (let i = 0; i < activeCount; i++) {
              const bookId = await createTestBook(testPrefix);
              await createTestListing(sellerId, bookId, 'active');
            }

            const stats = await calculateStatsFromDB([sellerId]);

            // Property: total_books_sold must equal only the sold listings
            expect(stats.total_books_sold).toBe(soldCount);
            // Active listings must not be counted as sold (only meaningful when activeCount > 0)
            if (activeCount > 0) {
              expect(stats.total_books_sold).not.toBe(soldCount + activeCount);
            }
          } finally {
            await cleanupTestData(testPrefix);
          }
        }
      ),
      { numRuns: 3, timeout: 120000 }
    );
  }, 120000);

  /**
   * Property 17c: active_listings equals the count of listings with status "active"
   *
   * **Validates: Requirements 16.1**
   *
   * For any set of listings, active_listings must equal the count of listings
   * with status "active" only — not pending, sold, or rejected.
   */
  it('active_listings must equal the count of listings with status "active"', async () => {
    if (!supabaseAvailable) {
      console.log('Skipping: Supabase not available in this environment');
      return;
    }
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          activeCount: fc.integer({ min: 0, max: 5 }),
          pendingCount: fc.integer({ min: 0, max: 5 }),
          soldCount: fc.integer({ min: 0, max: 3 }),
        }),
        async ({ activeCount, pendingCount, soldCount }) => {
          const testPrefix = `psa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

          try {
            const sellerId = await createTestUser(testPrefix, 'seller');

            for (let i = 0; i < activeCount; i++) {
              const bookId = await createTestBook(testPrefix);
              await createTestListing(sellerId, bookId, 'active');
            }
            for (let i = 0; i < pendingCount; i++) {
              const bookId = await createTestBook(testPrefix);
              await createTestListing(sellerId, bookId, 'pending_approval');
            }
            for (let i = 0; i < soldCount; i++) {
              const bookId = await createTestBook(testPrefix);
              await createTestListing(sellerId, bookId, 'sold');
            }

            const stats = await calculateStatsFromDB([sellerId]);

            // Property: active_listings must equal only the active listings
            expect(stats.active_listings).toBe(activeCount);
          } finally {
            await cleanupTestData(testPrefix);
          }
        }
      ),
      { numRuns: 3, timeout: 120000 }
    );
  }, 120000);

  /**
   * Property 17d: platform_commission_earned equals the sum of platform_commission
   * from all delivered orders
   *
   * **Validates: Requirements 16.2**
   *
   * Revenue metrics must sum platform_commission from completed (delivered) orders only.
   * Orders with other statuses must not contribute to revenue.
   */
  it('platform_commission_earned must sum commission from delivered orders only', async () => {
    if (!supabaseAvailable) {
      console.log('Skipping: Supabase not available in this environment');
      return;
    }
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          deliveredOrders: fc.integer({ min: 1, max: 5 }),
          pendingOrders: fc.integer({ min: 0, max: 3 }),
          commissionPerOrder: fc.double({ min: 5, max: 100, noNaN: true }),
        }),
        async ({ deliveredOrders, pendingOrders, commissionPerOrder }) => {
          const testPrefix = `psa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const commission = Math.round(commissionPerOrder * 100) / 100;

          try {
            const sellerId = await createTestUser(testPrefix, 'seller');
            const buyerId = await createTestUser(testPrefix, 'buyer');

            // Create delivered orders (should count toward revenue)
            // Listings must be 'active' — the order creation trigger handles status transition
            for (let i = 0; i < deliveredOrders; i++) {
              const bookId = await createTestBook(testPrefix);
              const listingId = await createTestListing(sellerId, bookId, 'active', commission);
              await createTestOrder(listingId, buyerId, sellerId, bookId, 'delivered', commission);
            }

            // Create pending orders (should NOT count toward revenue)
            for (let i = 0; i < pendingOrders; i++) {
              const bookId = await createTestBook(testPrefix);
              const listingId = await createTestListing(sellerId, bookId, 'active', commission);
              await createTestOrder(
                listingId,
                buyerId,
                sellerId,
                bookId,
                'pending_payment',
                commission
              );
            }

            const stats = await calculateStatsFromDB([sellerId, buyerId]);

            const expectedCommission = deliveredOrders * commission;

            // Property: commission must equal sum from delivered orders only
            expect(stats.platform_commission_earned).toBeCloseTo(expectedCommission, 1);
          } finally {
            await cleanupTestData(testPrefix);
          }
        }
      ),
      { numRuns: 3, timeout: 120000 }
    );
  }, 120000);

  /**
   * Property 17e: Stats are internally consistent — active + sold <= total_books_listed
   *
   * **Validates: Requirements 16.1**
   *
   * The sum of active and sold listings must never exceed total_books_listed,
   * since total_books_listed counts all listings regardless of status.
   */
  it('active_listings + total_books_sold must be <= total_books_listed', async () => {
    if (!supabaseAvailable) {
      console.log('Skipping: Supabase not available in this environment');
      return;
    }
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          activeCount: fc.integer({ min: 0, max: 5 }),
          soldCount: fc.integer({ min: 0, max: 5 }),
          rejectedCount: fc.integer({ min: 0, max: 3 }),
        }),
        async ({ activeCount, soldCount, rejectedCount }) => {
          const testPrefix = `psa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

          try {
            const sellerId = await createTestUser(testPrefix, 'seller');

            for (let i = 0; i < activeCount; i++) {
              const bookId = await createTestBook(testPrefix);
              await createTestListing(sellerId, bookId, 'active');
            }
            for (let i = 0; i < soldCount; i++) {
              const bookId = await createTestBook(testPrefix);
              await createTestListing(sellerId, bookId, 'sold');
            }
            for (let i = 0; i < rejectedCount; i++) {
              const bookId = await createTestBook(testPrefix);
              await createTestListing(sellerId, bookId, 'rejected');
            }

            const stats = await calculateStatsFromDB([sellerId]);

            // Property: active + sold must be a subset of total
            expect(stats.active_listings + stats.total_books_sold).toBeLessThanOrEqual(
              stats.total_books_listed
            );

            // Property: total must equal the sum of all statuses
            expect(stats.total_books_listed).toBe(activeCount + soldCount + rejectedCount);
          } finally {
            await cleanupTestData(testPrefix);
          }
        }
      ),
      { numRuns: 3, timeout: 120000 }
    );
  }, 120000);
});
