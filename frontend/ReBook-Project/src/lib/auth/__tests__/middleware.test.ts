/**
 * Authentication Middleware Tests
 * 
 * Tests for API route middleware functions that verify sessions and enforce
 * role-based access control.
 * 
 * Requirements:
 * - 1.6: Session token verification
 * - 1.8: Role-based access control
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  getUser,
  requireAuth,
  requireSeller,
  requireAdmin,
  hasRole,
  hasAnyRole,
  type UserWithRole,
} from '../middleware';
import { createServerClient } from '@/lib/supabase/server';

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}));

// Mock Next.js modules
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
  })),
}));

describe('Authentication Middleware', () => {
  let mockSupabaseClient: any;
  let mockRequest: NextRequest;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock request
    mockRequest = new NextRequest('http://localhost:3000/api/test');

    // Create mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
    };

    (createServerClient as any).mockReturnValue(mockSupabaseClient);
  });

  describe('getUser', () => {
    it('should return user when authenticated with valid session', async () => {
      // Mock authenticated user
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {},
        app_metadata: {},
      };

      const mockProfile = {
        role: 'buyer',
        is_active: true,
        suspended_until: null,
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const result = await getUser(mockRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.id).toBe('user-123');
        expect(result.user.email).toBe('test@example.com');
        expect(result.user.role).toBe('buyer');
        expect(result.user.is_active).toBe(true);
      }
    });

    it('should return 401 error when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const result = await getUser(mockRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(401);
        const body = await result.response.json();
        expect(body.error).toBe('Unauthorized: Authentication required');
      }
    });

    it('should return 500 error when profile fetch fails', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {},
        app_metadata: {},
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Profile not found' },
            }),
          }),
        }),
      });

      const result = await getUser(mockRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(500);
        const body = await result.response.json();
        expect(body.error).toBe('Failed to fetch user profile');
      }
    });

    it('should return 403 error when user is suspended', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {},
        app_metadata: {},
      };

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const mockProfile = {
        role: 'buyer',
        is_active: true,
        suspended_until: futureDate.toISOString(),
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const result = await getUser(mockRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(403);
        const body = await result.response.json();
        expect(body.error).toBe('Account suspended');
        expect(body.suspended_until).toBe(futureDate.toISOString());
      }
    });

    it('should allow access when suspension has expired', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {},
        app_metadata: {},
      };

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      const mockProfile = {
        role: 'buyer',
        is_active: true,
        suspended_until: pastDate.toISOString(),
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const result = await getUser(mockRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.id).toBe('user-123');
      }
    });

    it('should return 403 error when user is inactive', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {},
        app_metadata: {},
      };

      const mockProfile = {
        role: 'buyer',
        is_active: false,
        suspended_until: null,
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const result = await getUser(mockRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(403);
        const body = await result.response.json();
        expect(body.error).toBe('Account is inactive');
      }
    });
  });

  describe('requireAuth', () => {
    it('should return user when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {},
        app_metadata: {},
      };

      const mockProfile = {
        role: 'buyer',
        is_active: true,
        suspended_until: null,
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const result = await requireAuth(mockRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.id).toBe('user-123');
      }
    });

    it('should return 401 error when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const result = await requireAuth(mockRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(401);
      }
    });
  });

  describe('requireSeller', () => {
    it('should return user when user has seller role', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'seller@example.com',
        user_metadata: {},
        app_metadata: {},
      };

      const mockProfile = {
        role: 'seller',
        is_active: true,
        suspended_until: null,
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const result = await requireSeller(mockRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.role).toBe('seller');
      }
    });

    it('should allow admin to access seller routes', async () => {
      const mockUser = {
        id: 'admin-123',
        email: 'admin@example.com',
        user_metadata: {},
        app_metadata: {},
      };

      const mockProfile = {
        role: 'admin',
        is_active: true,
        suspended_until: null,
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const result = await requireSeller(mockRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.role).toBe('admin');
      }
    });

    it('should return 403 error when user is buyer', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'buyer@example.com',
        user_metadata: {},
        app_metadata: {},
      };

      const mockProfile = {
        role: 'buyer',
        is_active: true,
        suspended_until: null,
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const result = await requireSeller(mockRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(403);
        const body = await result.response.json();
        expect(body.error).toBe('Forbidden: Seller role required');
      }
    });

    it('should return 401 error when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const result = await requireSeller(mockRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(401);
      }
    });
  });

  describe('requireAdmin', () => {
    it('should return user when user has admin role', async () => {
      const mockUser = {
        id: 'admin-123',
        email: 'admin@example.com',
        user_metadata: {},
        app_metadata: {},
      };

      const mockProfile = {
        role: 'admin',
        is_active: true,
        suspended_until: null,
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const result = await requireAdmin(mockRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.role).toBe('admin');
      }
    });

    it('should return 403 error when user is seller', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'seller@example.com',
        user_metadata: {},
        app_metadata: {},
      };

      const mockProfile = {
        role: 'seller',
        is_active: true,
        suspended_until: null,
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const result = await requireAdmin(mockRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(403);
        const body = await result.response.json();
        expect(body.error).toBe('Forbidden: Admin role required');
      }
    });

    it('should return 403 error when user is buyer', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'buyer@example.com',
        user_metadata: {},
        app_metadata: {},
      };

      const mockProfile = {
        role: 'buyer',
        is_active: true,
        suspended_until: null,
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const result = await requireAdmin(mockRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(403);
        const body = await result.response.json();
        expect(body.error).toBe('Forbidden: Admin role required');
      }
    });

    it('should return 401 error when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const result = await requireAdmin(mockRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(401);
      }
    });
  });

  describe('hasRole', () => {
    it('should return true when user has the specified role', () => {
      const user: UserWithRole = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'seller',
        is_active: true,
        suspended_until: null,
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {},
      };

      expect(hasRole(user, 'seller')).toBe(true);
    });

    it('should return false when user does not have the specified role', () => {
      const user: UserWithRole = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'buyer',
        is_active: true,
        suspended_until: null,
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {},
      };

      expect(hasRole(user, 'seller')).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('should return true when user has one of the specified roles', () => {
      const user: UserWithRole = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'seller',
        is_active: true,
        suspended_until: null,
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {},
      };

      expect(hasAnyRole(user, ['buyer', 'seller'])).toBe(true);
    });

    it('should return false when user does not have any of the specified roles', () => {
      const user: UserWithRole = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'buyer',
        is_active: true,
        suspended_until: null,
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {},
      };

      expect(hasAnyRole(user, ['seller', 'admin'])).toBe(false);
    });
  });
});
