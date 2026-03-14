/**
 * Property-Based Tests: Admin Approval Service
 * **Validates: Requirements 3.4, 3.5, 3.3-3.11**
 * 
 * This test suite verifies admin approval requirements and listing status transitions.
 */

import * as fc from 'fast-check';
import { createClient } from '@supabase/supabase-js';
import { processAdminApproval } from '../../services/admin-approval.service';

// Supabase client for testing
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to create test data
async function createTestData(testPrefix: string) {
  // Create admin
  const adminData = {
    email: `${testPrefix}_admin@test.com`,
    name: `${testPrefix} Admin`,
    oauth_provider: 'google' as const,
    oauth_provider_id: `${testPrefix}_admin_oauth`,
    role: 'admin' as const,
  };

  const { data: admin, error: adminError } = await supabase
    .from('users')
    .insert(adminData)
    .select()
    .single();

  if (adminError) throw new Error(`Failed to create admin: ${adminError.message}`);

  // Create seller
  const sellerData = {
    email: `${testPrefix}_seller@test.com`,
    name: `${testPrefix} Seller`,
    oauth_provider: 'google' as const,
    oauth_provider_id: `${testPrefix}_seller_oauth`,
    role: 'seller' as const,
  };

  const { data: seller, error: sellerError } = await supabase
    .from('users')
    .insert(sellerData)
    .select()
    .single();

  if (sellerError) throw new Error(`Failed to create seller: ${sellerError.message}`);

  // Create category
  const categoryData = {
    name: `${testPrefix}_category`,
    type: 'general' as const,
    metadata: {},
  };

  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .insert(categoryData)
    .select()
    .single();

  if (categoryError) throw new Error(`Failed to create category: ${categoryError.message}`);

  // Create book
  const bookData = {
    title: `${testPrefix} Book`,
    author: `${testPrefix} Author`,
    category_id: category.id,
  };

  const { data: book, error: bookError } = await supabase
    .from('books')
    .insert(bookData)
    .select()
    .single();

  if (bookError) throw new Error(`Failed to create book: ${bookError.message}`);

  return { admin, seller, category, book };
}

// Helper function to clean up test data
async function cleanupTestData(testPrefix: string) {
  await supabase.from('moderation_logs').delete().like('notes', `${testPrefix}%`);
  await supabase.from('listings').delete().eq('city', 'Mumbai');
  await supabase.from('books').delete().like('title', `${testPrefix}%`);
  await supabase.from('categories').delete().like('name', `${testPrefix}%`);
  await supabase.from('users').delete().like('email', `${testPrefix}%`);
}

describe('Property: Admin Approval Requirement', () => {
  /**
   * Property Test 20.2: Admin Approval Requirement
   * **Validates: Requirements 3.4, 3.5**
   * 
   * This property verifies that:
   * 1. Only admins can approve listings
   * 2. Approved listings get approved_at timestamp and approved_by admin ID
   * 3. Approved listings transition to "active" status
   */
  it('should only allow admins to approve listings and set approval metadata', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }), // Number of listings to test
        async (listingCount) => {
          const testPrefix = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;

          try {
            // Create test data
            const { admin, seller, book } = await createTestData(testPrefix);

            // Create listings
            const listingIds: string[] = [];
            for (let i = 0; i < listingCount; i++) {
              const listingData = {
                book_id: book.id,
                seller_id: seller.id,
                original_price: 500,
                condition_score: 4,
                final_price: 400,
                delivery_cost: 50,
                platform_commission: 40,
                payment_fees: 10,
                seller_payout: 350,
                status: 'pending_approval' as const,
                images: ['https://example.com/image1.jpg'],
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400001',
              };

              const { data: listing, error: listingError } = await supabase
                .from('listings')
                .insert(listingData)
                .select()
                .single();

              if (listingError) throw new Error(`Failed to create listing: ${listingError.message}`);
              listingIds.push(listing.id);
            }

            // Test approval for each listing
            for (const listingId of listingIds) {
              const result = await processAdminApproval({
                listingId,
                adminId: admin.id,
                action: 'approve',
              });

              // Property 1: Approval should succeed
              expect(result.success).toBe(true);
              expect(result.listing).toBeDefined();

              // Property 2: Listing status should be "active"
              expect(result.listing.status).toBe('active');

              // Property 3: approved_at should be set
              expect(result.listing.approved_at).not.toBeNull();
              expect(new Date(result.listing.approved_at).getTime()).toBeGreaterThan(0);

              // Property 4: approved_by should be set to admin ID
              expect(result.listing.approved_by).toBe(admin.id);

              // Verify in database
              const { data: dbListing } = await supabase
                .from('listings')
                .select('*')
                .eq('id', listingId)
                .single();

              expect(dbListing?.status).toBe('active');
              expect(dbListing?.approved_at).not.toBeNull();
              expect(dbListing?.approved_by).toBe(admin.id);
            }

            // Clean up
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
   * Property: Non-admins cannot approve listings
   */
  it('should reject approval attempts by non-admin users', async () => {
    const testPrefix = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      const { seller, book } = await createTestData(testPrefix);

      // Create listing
      const listingData = {
        book_id: book.id,
        seller_id: seller.id,
        original_price: 500,
        condition_score: 4,
        final_price: 400,
        delivery_cost: 50,
        platform_commission: 40,
        payment_fees: 10,
        seller_payout: 350,
        status: 'pending_approval' as const,
        images: ['https://example.com/image1.jpg'],
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      };

      const { data: listing } = await supabase
        .from('listings')
        .insert(listingData)
        .select()
        .single();

      // Attempt approval with seller (non-admin)
      const result = await processAdminApproval({
        listingId: listing!.id,
        adminId: seller.id, // Using seller ID instead of admin
        action: 'approve',
      });

      // Property: Approval should fail
      expect(result.success).toBe(false);
      expect(result.error).toContain('admin');

      // Verify listing status unchanged
      const { data: dbListing } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listing!.id)
        .single();

      expect(dbListing?.status).toBe('pending_approval');
      expect(dbListing?.approved_at).toBeNull();

      await cleanupTestData(testPrefix);
    } catch (error) {
      await cleanupTestData(testPrefix);
      throw error;
    }
  });
});

describe('Property: Listing Status Transitions with Approval', () => {
  /**
   * Property Test 20.3: Listing Status Transitions with Approval
   * **Validates: Requirements 3.3-3.11**
   * 
   * This property verifies that:
   * 1. Listings start with status "pending_approval"
   * 2. Admin can approve (status -> "active")
   * 3. Admin can reject (status -> "rejected") with reason
   * 4. Admin can request rescan (status -> "rescan_required")
   * 5. Moderation log entries are created for all actions
   * 6. Rejection stores rejection_reason
   */
  it('should correctly transition listing status for all admin actions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('approve', 'reject', 'request_rescan'),
        fc.string({ minLength: 5, maxLength: 100 }),
        async (action, reasonText) => {
          const testPrefix = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;

          try {
            const { admin, seller, book } = await createTestData(testPrefix);

            // Create listing with pending_approval status
            const listingData = {
              book_id: book.id,
              seller_id: seller.id,
              original_price: 500,
              condition_score: 3,
              final_price: 350,
              delivery_cost: 50,
              platform_commission: 35,
              payment_fees: 10,
              seller_payout: 265,
              status: 'pending_approval' as const,
              images: ['https://example.com/image1.jpg'],
              city: 'Mumbai',
              state: 'Maharashtra',
              pincode: '400001',
            };

            const { data: listing } = await supabase
              .from('listings')
              .insert(listingData)
              .select()
              .single();

            // Property 1: Listing starts with pending_approval
            expect(listing?.status).toBe('pending_approval');

            // Process the action
            const params: any = {
              listingId: listing!.id,
              adminId: admin.id,
              action,
            };

            if (action === 'reject') {
              params.reason = reasonText;
            } else if (action === 'request_rescan') {
              params.notes = reasonText;
            }

            const result = await processAdminApproval(params);

            // Property 2: Action should succeed
            expect(result.success).toBe(true);

            // Property 3: Status transitions correctly
            const expectedStatus = {
              approve: 'active',
              reject: 'rejected',
              request_rescan: 'rescan_required',
            }[action];

            expect(result.listing.status).toBe(expectedStatus);

            // Verify in database
            const { data: dbListing } = await supabase
              .from('listings')
              .select('*')
              .eq('id', listing!.id)
              .single();

            expect(dbListing?.status).toBe(expectedStatus);

            // Property 4: Rejection stores rejection_reason
            if (action === 'reject') {
              expect(dbListing?.rejection_reason).toBe(reasonText);
            }

            // Property 5: Rescan stores notes
            if (action === 'request_rescan') {
              expect(dbListing?.rejection_reason).toBe(reasonText);
            }

            // Property 6: Approval sets approved_at and approved_by
            if (action === 'approve') {
              expect(dbListing?.approved_at).not.toBeNull();
              expect(dbListing?.approved_by).toBe(admin.id);
            }

            // Property 7: Moderation log entry is created
            const { data: logs } = await supabase
              .from('moderation_logs')
              .select('*')
              .eq('target_id', listing!.id)
              .eq('admin_id', admin.id);

            expect(logs).not.toBeNull();
            expect(logs!.length).toBeGreaterThan(0);

            const log = logs![0];
            expect(log.action).toBe(action);
            expect(log.target_type).toBe('listing');
            expect(log.target_id).toBe(listing!.id);
            expect(log.admin_id).toBe(admin.id);

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
   * Property: Only pending_approval listings can be processed
   */
  it('should reject actions on non-pending listings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('active', 'rejected', 'sold', 'inactive'),
        async (invalidStatus) => {
          const testPrefix = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;

          try {
            const { admin, seller, book } = await createTestData(testPrefix);

            // Create listing with non-pending status
            const listingData = {
              book_id: book.id,
              seller_id: seller.id,
              original_price: 500,
              condition_score: 3,
              final_price: 350,
              delivery_cost: 50,
              platform_commission: 35,
              payment_fees: 10,
              seller_payout: 265,
              status: invalidStatus as any,
              images: ['https://example.com/image1.jpg'],
              city: 'Mumbai',
              state: 'Maharashtra',
              pincode: '400001',
            };

            const { data: listing } = await supabase
              .from('listings')
              .insert(listingData)
              .select()
              .single();

            // Attempt to approve
            const result = await processAdminApproval({
              listingId: listing!.id,
              adminId: admin.id,
              action: 'approve',
            });

            // Property: Action should fail for non-pending listings
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();

            // Verify status unchanged
            const { data: dbListing } = await supabase
              .from('listings')
              .select('status')
              .eq('id', listing!.id)
              .single();

            expect(dbListing?.status).toBe(invalidStatus);

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
   * Property: Rejection requires a reason
   */
  it('should require a reason when rejecting a listing', async () => {
    const testPrefix = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      const { admin, seller, book } = await createTestData(testPrefix);

      const listingData = {
        book_id: book.id,
        seller_id: seller.id,
        original_price: 500,
        condition_score: 3,
        final_price: 350,
        delivery_cost: 50,
        platform_commission: 35,
        payment_fees: 10,
        seller_payout: 265,
        status: 'pending_approval' as const,
        images: ['https://example.com/image1.jpg'],
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      };

      const { data: listing } = await supabase
        .from('listings')
        .insert(listingData)
        .select()
        .single();

      // Attempt rejection without reason
      const result = await processAdminApproval({
        listingId: listing!.id,
        adminId: admin.id,
        action: 'reject',
        // No reason provided
      });

      // Property: Rejection without reason should fail
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      await cleanupTestData(testPrefix);
    } catch (error) {
      await cleanupTestData(testPrefix);
      throw error;
    }
  });
});
