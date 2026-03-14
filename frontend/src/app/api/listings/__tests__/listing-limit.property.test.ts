/**
 * Property-Based Test: Listing Limit Enforcement
 * **Validates: Requirements 9.6, 9.7, 18.6**
 * 
 * This test verifies that:
 * - Sellers cannot exceed their listing_limit
 * - The system rejects listing creation when limit is reached
 * - Listing limits are properly enforced across different statuses
 */

import * as fc from 'fast-check';
import { createClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Supabase client for testing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key';

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to create a test user
async function createTestUser(email: string, listingLimit: number) {
  const { data, error } = await supabase
    .from('users')
    .insert({
      email,
      name: 'Test Seller',
      oauth_provider: 'google',
      oauth_provider_id: `test_${Date.now()}_${Math.random()}`,
      role: 'seller',
      is_active: true,
      rating: 0.0,
      total_transactions: 0,
      listing_limit: listingLimit,
      books_sold: 0,
      books_bought: 0,
      trees_saved: 0.0,
      water_saved_liters: 0.0,
      co2_reduced_kg: 0.0,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  return data.id;
}

// Helper function to create a test book
async function createTestBook(title: string) {
  const { data, error } = await supabase
    .from('books')
    .insert({
      title,
      author: 'Test Author',
      isbn: `TEST${Date.now()}${Math.random()}`,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create test book: ${error.message}`);
  }

  return data.id;
}

// Helper function to create a test listing
async function createTestListing(sellerId: string, bookId: string, status: string = 'pending_approval') {
  const { data, error } = await supabase
    .from('listings')
    .insert({
      book_id: bookId,
      seller_id: sellerId,
      original_price: 100,
      condition_score: 4,
      final_price: 100,
      delivery_cost: 50,
      platform_commission: 10,
      payment_fees: 5,
      seller_payout: 90,
      status,
      images: ['test-image.jpg'],
      location: { city: 'Test City', state: 'Test State', pincode: '123456' },
    })
    .select('id')
    .single();

  return { data, error };
}

// Helper function to count listings for a seller
async function countSellerListings(sellerId: string, statuses: string[]) {
  const { count, error } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('seller_id', sellerId)
    .in('status', statuses);

  if (error) {
    throw new Error(`Failed to count listings: ${error.message}`);
  }

  return count || 0;
}

// Helper function to cleanup test data
async function cleanupTestData(testPrefix: string) {
  // Delete listings first (foreign key constraint)
  await supabase
    .from('listings')
    .delete()
    .like('seller_id', `${testPrefix}%`);

  // Delete books
  await supabase
    .from('books')
    .delete()
    .like('title', `${testPrefix}%`);

  // Delete users
  await supabase
    .from('users')
    .delete()
    .like('email', `${testPrefix}%`);
}

describe('Property: Listing Limit Enforcement', () => {
  /**
   * Property 1: Sellers with listing_limit set cannot exceed their limit
   * 
   * This property verifies that when a seller has a listing_limit set,
   * they cannot create more listings than the limit allows.
   */
  it('should enforce listing limit when seller reaches their limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          listingLimit: fc.integer({ min: 1, max: 10 }),
          attemptedListings: fc.integer({ min: 1, max: 15 }),
        }),
        async ({ listingLimit, attemptedListings }) => {
          const testPrefix = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          const email = `${testPrefix}@example.com`;

          try {
            // Create test user with specific listing limit
            const sellerId = await createTestUser(email, listingLimit);

            // Track successful and failed listing creations
            let successfulListings = 0;
            let failedListings = 0;

            // Attempt to create listings up to attemptedListings count
            for (let i = 0; i < attemptedListings; i++) {
              const bookId = await createTestBook(`${testPrefix}_Book_${i}`);
              const result = await createTestListing(sellerId, bookId, 'pending_approval');

              if (result.error) {
                failedListings++;
              } else {
                successfulListings++;
              }
            }

            // Property: Successful listings should not exceed the limit
            expect(successfulListings).toBeLessThanOrEqual(listingLimit);

            // Property: If attempted listings exceed limit, some should fail
            if (attemptedListings > listingLimit) {
              expect(failedListings).toBeGreaterThan(0);
              expect(failedListings).toBe(attemptedListings - listingLimit);
            }

            // Verify actual count in database matches successful listings
            const actualCount = await countSellerListings(sellerId, ['pending_approval', 'active']);
            expect(actualCount).toBe(successfulListings);
            expect(actualCount).toBeLessThanOrEqual(listingLimit);

            // Cleanup
            await cleanupTestData(testPrefix);

          } catch (error) {
            await cleanupTestData(testPrefix);
            throw error;
          }
        }
      ),
      {
        numRuns: 50,
        timeout: 60000,
      }
    );
  });

  /**
   * Property 2: Sellers with listing_limit = -1 have unlimited listings
   * 
   * This property verifies that sellers with listing_limit set to -1
   * can create any number of listings without restriction.
   */
  it('should allow unlimited listings when listing_limit is -1', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 20 }),
        async (listingCount) => {
          const testPrefix = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          const email = `${testPrefix}@example.com`;

          try {
            // Create test user with unlimited listing limit
            const sellerId = await createTestUser(email, -1);

            // Create multiple listings
            let successfulListings = 0;

            for (let i = 0; i < listingCount; i++) {
              const bookId = await createTestBook(`${testPrefix}_Book_${i}`);
              const result = await createTestListing(sellerId, bookId, 'pending_approval');

              if (!result.error) {
                successfulListings++;
              }
            }

            // Property: All listings should succeed when limit is -1
            expect(successfulListings).toBe(listingCount);

            // Verify actual count in database
            const actualCount = await countSellerListings(sellerId, ['pending_approval', 'active']);
            expect(actualCount).toBe(listingCount);

            // Cleanup
            await cleanupTestData(testPrefix);

          } catch (error) {
            await cleanupTestData(testPrefix);
            throw error;
          }
        }
      ),
      {
        numRuns: 30,
        timeout: 60000,
      }
    );
  });

  /**
   * Property 3: Only active and pending_approval listings count toward limit
   * 
   * This property verifies that only listings with status 'active' or 'pending_approval'
   * count toward the seller's listing limit. Sold, rejected, or inactive listings
   * should not count.
   */
  it('should only count active and pending_approval listings toward limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          listingLimit: fc.integer({ min: 2, max: 5 }),
          soldListings: fc.integer({ min: 0, max: 3 }),
          rejectedListings: fc.integer({ min: 0, max: 3 }),
        }),
        async ({ listingLimit, soldListings, rejectedListings }) => {
          const testPrefix = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          const email = `${testPrefix}@example.com`;

          try {
            // Create test user with specific listing limit
            const sellerId = await createTestUser(email, listingLimit);

            // Create sold listings (should not count toward limit)
            for (let i = 0; i < soldListings; i++) {
              const bookId = await createTestBook(`${testPrefix}_Sold_${i}`);
              await createTestListing(sellerId, bookId, 'sold');
            }

            // Create rejected listings (should not count toward limit)
            for (let i = 0; i < rejectedListings; i++) {
              const bookId = await createTestBook(`${testPrefix}_Rejected_${i}`);
              await createTestListing(sellerId, bookId, 'rejected');
            }

            // Now create active/pending listings up to the limit
            let successfulActiveListings = 0;

            for (let i = 0; i < listingLimit; i++) {
              const bookId = await createTestBook(`${testPrefix}_Active_${i}`);
              const result = await createTestListing(sellerId, bookId, 'pending_approval');

              if (!result.error) {
                successfulActiveListings++;
              }
            }

            // Property: Should be able to create up to listingLimit active/pending listings
            // regardless of sold/rejected listings
            expect(successfulActiveListings).toBe(listingLimit);

            // Verify counts
            const activeCount = await countSellerListings(sellerId, ['pending_approval', 'active']);
            expect(activeCount).toBe(listingLimit);

            // Try to create one more - should fail
            const bookId = await createTestBook(`${testPrefix}_Extra`);
            const extraResult = await createTestListing(sellerId, bookId, 'pending_approval');

            // Property: Creating beyond limit should fail
            expect(extraResult.error).not.toBeNull();

            // Cleanup
            await cleanupTestData(testPrefix);

          } catch (error) {
            await cleanupTestData(testPrefix);
            throw error;
          }
        }
      ),
      {
        numRuns: 30,
        timeout: 60000,
      }
    );
  });

  /**
   * Property 4: Listing limit enforcement is consistent across concurrent requests
   * 
   * This property verifies that when multiple listing creation requests
   * are made concurrently, the listing limit is still enforced correctly.
   */
  it('should enforce listing limit correctly with concurrent requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          listingLimit: fc.integer({ min: 2, max: 5 }),
          concurrentRequests: fc.integer({ min: 3, max: 8 }),
        }),
        async ({ listingLimit, concurrentRequests }) => {
          const testPrefix = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          const email = `${testPrefix}@example.com`;

          try {
            // Create test user with specific listing limit
            const sellerId = await createTestUser(email, listingLimit);

            // Create books for concurrent requests
            const bookIds = await Promise.all(
              Array.from({ length: concurrentRequests }, async (_, i) => {
                return await createTestBook(`${testPrefix}_Concurrent_${i}`);
              })
            );

            // Make concurrent listing creation requests
            const results = await Promise.allSettled(
              bookIds.map(bookId => createTestListing(sellerId, bookId, 'pending_approval'))
            );

            // Count successes and failures
            const successes = results.filter(
              r => r.status === 'fulfilled' && r.value.data !== null && !r.value.error
            ).length;

            const failures = results.filter(
              r => r.status === 'fulfilled' && (r.value.data === null || r.value.error !== null)
            ).length;

            // Property: Successful listings should not exceed the limit
            expect(successes).toBeLessThanOrEqual(listingLimit);

            // Property: If concurrent requests exceed limit, some should fail
            if (concurrentRequests > listingLimit) {
              expect(failures).toBeGreaterThan(0);
            }

            // Verify actual count in database
            const actualCount = await countSellerListings(sellerId, ['pending_approval', 'active']);
            expect(actualCount).toBeLessThanOrEqual(listingLimit);

            // Cleanup
            await cleanupTestData(testPrefix);

          } catch (error) {
            await cleanupTestData(testPrefix);
            throw error;
          }
        }
      ),
      {
        numRuns: 20,
        timeout: 60000,
      }
    );
  });

  /**
   * Property 5: Listing limit can be updated by admin and takes effect immediately
   * 
   * This property verifies that when an admin updates a seller's listing_limit,
   * the new limit is enforced on subsequent listing creation attempts.
   */
  it('should enforce updated listing limit immediately after admin changes it', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          initialLimit: fc.integer({ min: 3, max: 8 }),
          newLimit: fc.integer({ min: 1, max: 5 }),
        }),
        async ({ initialLimit, newLimit }) => {
          const testPrefix = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          const email = `${testPrefix}@example.com`;

          try {
            // Create test user with initial listing limit
            const sellerId = await createTestUser(email, initialLimit);

            // Create listings up to initial limit
            const initialListings = Math.min(initialLimit, 3); // Create a few listings
            for (let i = 0; i < initialListings; i++) {
              const bookId = await createTestBook(`${testPrefix}_Initial_${i}`);
              await createTestListing(sellerId, bookId, 'pending_approval');
            }

            // Admin updates the listing limit
            const { error: updateError } = await supabase
              .from('users')
              .update({ listing_limit: newLimit })
              .eq('id', sellerId);

            expect(updateError).toBeNull();

            // Try to create a new listing
            const bookId = await createTestBook(`${testPrefix}_AfterUpdate`);
            const result = await createTestListing(sellerId, bookId, 'pending_approval');

            // Property: If current listings >= new limit, creation should fail
            if (initialListings >= newLimit) {
              expect(result.error).not.toBeNull();
            } else {
              // If current listings < new limit, creation should succeed
              expect(result.error).toBeNull();
            }

            // Verify final count respects the new limit
            const finalCount = await countSellerListings(sellerId, ['pending_approval', 'active']);
            expect(finalCount).toBeLessThanOrEqual(Math.max(initialListings, newLimit));

            // Cleanup
            await cleanupTestData(testPrefix);

          } catch (error) {
            await cleanupTestData(testPrefix);
            throw error;
          }
        }
      ),
      {
        numRuns: 25,
        timeout: 60000,
      }
    );
  });
});
