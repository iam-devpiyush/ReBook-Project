/**
 * Property-Based Test: OAuth Authentication Uniqueness
 * **Validates: Requirements 1.5**
 * 
 * This test verifies that the combination of (oauth_provider, oauth_provider_id)
 * must be unique across all users in the database.
 */

import * as fc from 'fast-check';
import { createClient } from '@supabase/supabase-js';

// Supabase client for testing
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';

const supabase = createClient(supabaseUrl, supabaseKey);

describe('Property: OAuth Authentication Uniqueness', () => {
  /**
   * Property: The combination (oauth_provider, oauth_provider_id) must be unique
   * 
   * This property verifies that:
   * 1. A user can be created with a specific (oauth_provider, oauth_provider_id) combination
   * 2. Attempting to create another user with the same combination fails with error code 23505
   * 3. The uniqueness constraint is enforced across all three providers (Google, Apple, Microsoft)
   */
  it('should enforce uniqueness of (oauth_provider, oauth_provider_id) combination', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random OAuth provider and provider ID combinations
        fc.record({
          provider: fc.constantFrom('google', 'apple', 'microsoft'),
          providerId: fc.string({ minLength: 10, maxLength: 50 }),
          email1: fc.emailAddress(),
          email2: fc.emailAddress(),
          name1: fc.string({ minLength: 1, maxLength: 50 }),
          name2: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        async ({ provider, providerId, email1, email2, name1, name2 }) => {
          const testPrefix = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          const uniqueEmail1 = `${testPrefix}_${email1}`;
          const uniqueEmail2 = `${testPrefix}_${email2}`;
          const uniqueProviderId = `${testPrefix}_${providerId}`;

          try {
            // First user with this OAuth combination
            const user1 = {
              email: uniqueEmail1,
              name: name1,
              oauth_provider: provider,
              oauth_provider_id: uniqueProviderId,
              role: 'buyer' as const,
              is_active: true,
              rating: 0.0,
              total_transactions: 0,
              listing_limit: -1,
              books_sold: 0,
              books_bought: 0,
              trees_saved: 0.0,
              water_saved_liters: 0.0,
              co2_reduced_kg: 0.0,
            };

            // Insert first user - should succeed
            const { data: insertedUser1, error: error1 } = await supabase
              .from('users')
              .insert(user1)
              .select('id, oauth_provider, oauth_provider_id, email');

            // Property 1: First insertion should succeed
            expect(error1).toBeNull();
            expect(insertedUser1).not.toBeNull();
            expect(insertedUser1).toHaveLength(1);
            expect(insertedUser1![0].oauth_provider).toBe(provider);
            expect(insertedUser1![0].oauth_provider_id).toBe(uniqueProviderId);

            // Second user with SAME OAuth combination but different email
            const user2 = {
              email: uniqueEmail2,
              name: name2,
              oauth_provider: provider,
              oauth_provider_id: uniqueProviderId, // Same provider ID
              role: 'buyer' as const,
              is_active: true,
              rating: 0.0,
              total_transactions: 0,
              listing_limit: -1,
              books_sold: 0,
              books_bought: 0,
              trees_saved: 0.0,
              water_saved_liters: 0.0,
              co2_reduced_kg: 0.0,
            };

            // Attempt to insert second user - should fail with uniqueness violation
            const { data: insertedUser2, error: error2 } = await supabase
              .from('users')
              .insert(user2)
              .select('id');

            // Property 2: Second insertion should fail with PostgreSQL uniqueness violation
            expect(error2).not.toBeNull();
            expect(error2!.code).toBe('23505'); // PostgreSQL unique constraint violation
            expect(insertedUser2).toBeNull();

            // Property 3: Error message should mention the unique constraint
            expect(error2!.message).toMatch(/unique_oauth_provider|duplicate key/i);

            // Clean up: Delete test user
            await supabase
              .from('users')
              .delete()
              .eq('email', uniqueEmail1);

          } catch (error) {
            // Clean up on error
            await supabase
              .from('users')
              .delete()
              .like('email', `${testPrefix}%`);
            
            throw error;
          }
        }
      ),
      {
        numRuns: 100, // Run 100 random test cases
        timeout: 30000, // 30 second timeout for async operations
      }
    );
  });

  /**
   * Property: Different providers can have the same provider_id
   * 
   * This property verifies that the uniqueness constraint is scoped to
   * the combination of (provider, provider_id), not just provider_id alone.
   */
  it('should allow same provider_id across different providers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          providerId: fc.string({ minLength: 10, maxLength: 50 }),
          email1: fc.emailAddress(),
          email2: fc.emailAddress(),
          email3: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        async ({ providerId, email1, email2, email3, name }) => {
          const testPrefix = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          const uniqueEmail1 = `${testPrefix}_${email1}`;
          const uniqueEmail2 = `${testPrefix}_${email2}`;
          const uniqueEmail3 = `${testPrefix}_${email3}`;
          const uniqueProviderId = `${testPrefix}_${providerId}`;

          try {
            // Create users with same provider_id but different providers
            const users = [
              {
                email: uniqueEmail1,
                name: name,
                oauth_provider: 'google' as const,
                oauth_provider_id: uniqueProviderId,
                role: 'buyer' as const,
                is_active: true,
                rating: 0.0,
                total_transactions: 0,
                listing_limit: -1,
                books_sold: 0,
                books_bought: 0,
                trees_saved: 0.0,
                water_saved_liters: 0.0,
                co2_reduced_kg: 0.0,
              },
              {
                email: uniqueEmail2,
                name: name,
                oauth_provider: 'apple' as const,
                oauth_provider_id: uniqueProviderId, // Same provider ID
                role: 'buyer' as const,
                is_active: true,
                rating: 0.0,
                total_transactions: 0,
                listing_limit: -1,
                books_sold: 0,
                books_bought: 0,
                trees_saved: 0.0,
                water_saved_liters: 0.0,
                co2_reduced_kg: 0.0,
              },
              {
                email: uniqueEmail3,
                name: name,
                oauth_provider: 'microsoft' as const,
                oauth_provider_id: uniqueProviderId, // Same provider ID
                role: 'buyer' as const,
                is_active: true,
                rating: 0.0,
                total_transactions: 0,
                listing_limit: -1,
                books_sold: 0,
                books_bought: 0,
                trees_saved: 0.0,
                water_saved_liters: 0.0,
                co2_reduced_kg: 0.0,
              },
            ];

            // Insert all three users - all should succeed
            for (const user of users) {
              const { data, error } = await supabase
                .from('users')
                .insert(user)
                .select('id, oauth_provider, oauth_provider_id');

              // Property: Each insertion should succeed because providers are different
              expect(error).toBeNull();
              expect(data).not.toBeNull();
              expect(data).toHaveLength(1);
              expect(data![0].oauth_provider).toBe(user.oauth_provider);
              expect(data![0].oauth_provider_id).toBe(uniqueProviderId);
            }

            // Verify all three users exist
            const { data: allUsers, error: fetchError } = await supabase
              .from('users')
              .select('id, oauth_provider, oauth_provider_id')
              .eq('oauth_provider_id', uniqueProviderId);

            expect(fetchError).toBeNull();
            expect(allUsers).not.toBeNull();
            expect(allUsers).toHaveLength(3);

            // Property: All three providers should be represented
            const providers = allUsers!.map(u => u.oauth_provider).sort();
            expect(providers).toEqual(['apple', 'google', 'microsoft']);

            // Clean up: Delete test users
            await supabase
              .from('users')
              .delete()
              .like('email', `${testPrefix}%`);

          } catch (error) {
            // Clean up on error
            await supabase
              .from('users')
              .delete()
              .like('email', `${testPrefix}%`);
            
            throw error;
          }
        }
      ),
      {
        numRuns: 50, // Run 50 random test cases
        timeout: 30000,
      }
    );
  });

  /**
   * Property: Concurrent insertions with same OAuth combination fail
   * 
   * This property verifies that even when multiple insertions with the same
   * (oauth_provider, oauth_provider_id) are attempted concurrently, only one succeeds.
   */
  it('should handle concurrent duplicate OAuth insertions correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          provider: fc.constantFrom('google', 'apple', 'microsoft'),
          providerId: fc.string({ minLength: 10, maxLength: 50 }),
          concurrentCount: fc.integer({ min: 2, max: 5 }),
        }),
        async ({ provider, providerId, concurrentCount }) => {
          const testPrefix = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          const uniqueProviderId = `${testPrefix}_${providerId}`;

          try {
            // Create concurrent insertion promises with same OAuth combination
            const insertionPromises = Array.from({ length: concurrentCount }, (_, index) => {
              return supabase
                .from('users')
                .insert({
                  email: `${testPrefix}_user${index}@example.com`,
                  name: `Test User ${index}`,
                  oauth_provider: provider,
                  oauth_provider_id: uniqueProviderId, // Same for all
                  role: 'buyer' as const,
                  is_active: true,
                  rating: 0.0,
                  total_transactions: 0,
                  listing_limit: -1,
                  books_sold: 0,
                  books_bought: 0,
                  trees_saved: 0.0,
                  water_saved_liters: 0.0,
                  co2_reduced_kg: 0.0,
                })
                .select('id');
            });

            // Execute all insertions concurrently
            const results = await Promise.allSettled(insertionPromises);

            // Count successes and failures
            const successes = results.filter(r => r.status === 'fulfilled' && r.value.error === null);
            const failures = results.filter(r => 
              r.status === 'fulfilled' && r.value.error !== null && r.value.error.code === '23505'
            );

            // Property: Exactly one insertion should succeed
            expect(successes.length).toBe(1);

            // Property: All other insertions should fail with uniqueness violation
            expect(failures.length).toBe(concurrentCount - 1);

            // Clean up: Delete test users
            await supabase
              .from('users')
              .delete()
              .like('email', `${testPrefix}%`);

          } catch (error) {
            // Clean up on error
            await supabase
              .from('users')
              .delete()
              .like('email', `${testPrefix}%`);
            
            throw error;
          }
        }
      ),
      {
        numRuns: 30, // Run 30 random test cases
        timeout: 30000,
      }
    );
  });
});
