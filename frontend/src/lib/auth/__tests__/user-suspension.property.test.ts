/**
 * Property-Based Tests: User Suspension Enforcement
 * **Validates: Requirements 9.4, 24.5**
 * 
 * This test suite verifies that suspended users cannot create listings or place orders
 * until their suspension expires.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { NextRequest } from 'next/server';
import { requireSeller, requireAuth } from '../middleware';
import * as supabaseServer from '@/lib/supabase/server';

// Mock dependencies
vi.mock('@/lib/supabase/server');

describe('Property: User Suspension Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property Test 22.5: User Suspension Enforcement
   * **Validates: Requirements 9.4, 24.5**
   * 
   * This property verifies that:
   * 1. Users with suspended_until timestamp in the future cannot create listings
   * 2. Users with suspended_until timestamp in the future cannot place orders
   * 3. Users with suspended_until timestamp in the past CAN create listings and place orders
   * 4. Users with null suspended_until CAN create listings and place orders
   * 5. The suspension check returns appropriate error message with suspension timestamp
   */
  it('should reject all listing creation and order placement attempts for suspended users', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data:
        // - User ID
        // - Suspension duration in milliseconds (can be negative for expired suspensions)
        // - User role
        fc.uuid(),
        fc.integer({ min: -86400000, max: 86400000 }), // -1 day to +1 day in milliseconds
        fc.constantFrom('buyer', 'seller', 'admin'),
        async (userId, suspensionDurationMs, role) => {
          const now = new Date();
          const suspendedUntil = new Date(now.getTime() + suspensionDurationMs);
          const isSuspended = suspendedUntil > now;

          // Mock Supabase client
          const mockSupabase = {
            auth: {
              getUser: vi.fn().mockResolvedValue({
                data: {
                  user: {
                    id: userId,
                    email: `user-${userId}@example.com`,
                    aud: 'authenticated',
                    created_at: new Date().toISOString(),
                  },
                },
                error: null,
              }),
            },
            from: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      role,
                      is_active: true,
                      suspended_until: suspendedUntil.toISOString(),
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };

          vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

          // Create mock request
          const request = new NextRequest('http://localhost:3000/api/listings', {
            method: 'POST',
          });

          // Test listing creation (requireSeller middleware)
          if (role === 'seller' || role === 'admin') {
            const result = await requireSeller(request);

            if (isSuspended) {
              // Property 1: Suspended users cannot create listings
              expect(result.success).toBe(false);

              if (!result.success) {
                const responseData = await result.response.json();

                // Property 2: Error message indicates suspension
                expect(responseData.error).toBe('Account suspended');

                // Property 3: Response includes suspended_until timestamp
                expect(responseData.suspended_until).toBe(suspendedUntil.toISOString());

                // Property 4: HTTP status is 403 Forbidden
                expect(result.response.status).toBe(403);
              }
            } else {
              // Property 5: Non-suspended users CAN create listings
              expect(result.success).toBe(true);

              if (result.success) {
                expect(result.user).toBeDefined();
                expect(result.user.id).toBe(userId);
              }
            }
          }

          // Test order placement (requireAuth middleware)
          const authResult = await requireAuth(request);

          if (isSuspended) {
            // Property 6: Suspended users cannot place orders
            expect(authResult.success).toBe(false);

            if (!authResult.success) {
              const responseData = await authResult.response.json();

              // Property 7: Error message indicates suspension
              expect(responseData.error).toBe('Account suspended');

              // Property 8: Response includes suspended_until timestamp
              expect(responseData.suspended_until).toBe(suspendedUntil.toISOString());

              // Property 9: HTTP status is 403 Forbidden
              expect(authResult.response.status).toBe(403);
            }
          } else {
            // Property 10: Non-suspended users CAN place orders
            expect(authResult.success).toBe(true);

            if (authResult.success) {
              expect(authResult.user).toBeDefined();
              expect(authResult.user.id).toBe(userId);
            }
          }
        }
      ),
      {
        numRuns: 1000,
        timeout: 30000,
      }
    );
  });

  /**
   * Property: Null suspended_until allows all operations
   */
  it('should allow all operations for users with null suspended_until', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom('buyer', 'seller', 'admin'),
        async (userId, role) => {
          // Mock Supabase client with null suspended_until
          const mockSupabase = {
            auth: {
              getUser: vi.fn().mockResolvedValue({
                data: {
                  user: {
                    id: userId,
                    email: `user-${userId}@example.com`,
                    aud: 'authenticated',
                    created_at: new Date().toISOString(),
                  },
                },
                error: null,
              }),
            },
            from: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      role,
                      is_active: true,
                      suspended_until: null, // No suspension
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };

          vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

          const request = new NextRequest('http://localhost:3000/api/listings', {
            method: 'POST',
          });

          // Test listing creation
          if (role === 'seller' || role === 'admin') {
            const result = await requireSeller(request);

            // Property: Users with null suspended_until can create listings
            expect(result.success).toBe(true);

            if (result.success) {
              expect(result.user.id).toBe(userId);
              expect(result.user.suspended_until).toBeNull();
            }
          }

          // Test order placement
          const authResult = await requireAuth(request);

          // Property: Users with null suspended_until can place orders
          expect(authResult.success).toBe(true);

          if (authResult.success) {
            expect(authResult.user.id).toBe(userId);
            expect(authResult.user.suspended_until).toBeNull();
          }
        }
      ),
      {
        numRuns: 1000,
        timeout: 30000,
      }
    );
  });

  /**
   * Property: Expired suspensions allow operations
   */
  it('should allow operations for users with expired suspensions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.integer({ min: 1, max: 365 }), // Days in the past
        fc.constantFrom('buyer', 'seller', 'admin'),
        async (userId, daysAgo, role) => {
          const now = new Date();
          const suspendedUntil = new Date(now.getTime() - daysAgo * 86400000); // Past date

          // Mock Supabase client
          const mockSupabase = {
            auth: {
              getUser: vi.fn().mockResolvedValue({
                data: {
                  user: {
                    id: userId,
                    email: `user-${userId}@example.com`,
                    aud: 'authenticated',
                    created_at: new Date().toISOString(),
                  },
                },
                error: null,
              }),
            },
            from: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      role,
                      is_active: true,
                      suspended_until: suspendedUntil.toISOString(),
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };

          vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

          const request = new NextRequest('http://localhost:3000/api/listings', {
            method: 'POST',
          });

          // Property: Expired suspensions should not block operations
          expect(suspendedUntil < now).toBe(true);

          // Test listing creation
          if (role === 'seller' || role === 'admin') {
            const result = await requireSeller(request);

            // Property: Users with expired suspensions can create listings
            expect(result.success).toBe(true);

            if (result.success) {
              expect(result.user.id).toBe(userId);
            }
          }

          // Test order placement
          const authResult = await requireAuth(request);

          // Property: Users with expired suspensions can place orders
          expect(authResult.success).toBe(true);

          if (authResult.success) {
            expect(authResult.user.id).toBe(userId);
          }
        }
      ),
      {
        numRuns: 1000,
        timeout: 30000,
      }
    );
  });

  /**
   * Property: Future suspensions block operations
   */
  it('should block operations for users with future suspensions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.integer({ min: 1, max: 365 }), // Days in the future
        fc.constantFrom('buyer', 'seller', 'admin'),
        async (userId, daysAhead, role) => {
          const now = new Date();
          const suspendedUntil = new Date(now.getTime() + daysAhead * 86400000); // Future date

          // Mock Supabase client
          const mockSupabase = {
            auth: {
              getUser: vi.fn().mockResolvedValue({
                data: {
                  user: {
                    id: userId,
                    email: `user-${userId}@example.com`,
                    aud: 'authenticated',
                    created_at: new Date().toISOString(),
                  },
                },
                error: null,
              }),
            },
            from: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      role,
                      is_active: true,
                      suspended_until: suspendedUntil.toISOString(),
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };

          vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

          const request = new NextRequest('http://localhost:3000/api/listings', {
            method: 'POST',
          });

          // Property: Future suspensions should block operations
          expect(suspendedUntil > now).toBe(true);

          // Test listing creation
          if (role === 'seller' || role === 'admin') {
            const result = await requireSeller(request);

            // Property: Users with future suspensions cannot create listings
            expect(result.success).toBe(false);

            if (!result.success) {
              const responseData = await result.response.json();
              expect(responseData.error).toBe('Account suspended');
              expect(responseData.suspended_until).toBe(suspendedUntil.toISOString());
              expect(result.response.status).toBe(403);
            }
          }

          // Test order placement
          const authResult = await requireAuth(request);

          // Property: Users with future suspensions cannot place orders
          expect(authResult.success).toBe(false);

          if (!authResult.success) {
            const responseData = await authResult.response.json();
            expect(responseData.error).toBe('Account suspended');
            expect(responseData.suspended_until).toBe(suspendedUntil.toISOString());
            expect(authResult.response.status).toBe(403);
          }
        }
      ),
      {
        numRuns: 1000,
        timeout: 30000,
      }
    );
  });

  /**
   * Property: Suspension check is consistent across all middleware functions
   */
  it('should enforce suspension consistently across requireAuth and requireSeller', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.integer({ min: -86400000, max: 86400000 }), // -1 day to +1 day in milliseconds
        async (userId, suspensionDurationMs) => {
          const now = new Date();
          const suspendedUntil = new Date(now.getTime() + suspensionDurationMs);
          const isSuspended = suspendedUntil > now;

          // Mock Supabase client
          const mockSupabase = {
            auth: {
              getUser: vi.fn().mockResolvedValue({
                data: {
                  user: {
                    id: userId,
                    email: `user-${userId}@example.com`,
                    aud: 'authenticated',
                    created_at: new Date().toISOString(),
                  },
                },
                error: null,
              }),
            },
            from: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      role: 'seller',
                      is_active: true,
                      suspended_until: suspendedUntil.toISOString(),
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };

          vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

          const request = new NextRequest('http://localhost:3000/api/test', {
            method: 'POST',
          });

          // Test both middleware functions
          const authResult = await requireAuth(request);

          // Reset mocks for second call
          vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase as any);

          const sellerResult = await requireSeller(request);

          // Property: Both middleware functions should return the same suspension status
          expect(authResult.success).toBe(sellerResult.success);

          if (isSuspended) {
            // Both should reject
            expect(authResult.success).toBe(false);
            expect(sellerResult.success).toBe(false);

            if (!authResult.success && !sellerResult.success) {
              const authData = await authResult.response.json();
              const sellerData = await sellerResult.response.json();

              // Both should have the same error message
              expect(authData.error).toBe('Account suspended');
              expect(sellerData.error).toBe('Account suspended');

              // Both should have the same suspended_until timestamp
              expect(authData.suspended_until).toBe(suspendedUntil.toISOString());
              expect(sellerData.suspended_until).toBe(suspendedUntil.toISOString());
            }
          } else {
            // Both should succeed
            expect(authResult.success).toBe(true);
            expect(sellerResult.success).toBe(true);
          }
        }
      ),
      {
        numRuns: 1000,
        timeout: 30000,
      }
    );
  });
});
