/**
 * Unit Tests: /api/admin/users/[id]/limit-listings
 * 
 * Tests for listing limit API route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PUT } from '../route';
import * as middleware from '@/lib/auth/middleware';
import * as supabaseServer from '@/lib/supabase/server';

// Mock dependencies
vi.mock('@/lib/auth/middleware');
vi.mock('@/lib/supabase/server');

describe('PUT /api/admin/users/[id]/limit-listings', () => {
  let mockSupabase: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };
    
    vi.mocked(supabaseServer.createServerClient).mockReturnValue(mockSupabase);
  });
  
  describe('Authentication', () => {
    it('should reject request if admin authentication fails', async () => {
      vi.mocked(middleware.requireAdmin).mockResolvedValue({
        success: false,
        response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
        }),
      } as any);
      
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/limit-listings', {
        method: 'PUT',
        body: JSON.stringify({
          listing_limit: 10,
          reason: 'Quality control',
        }),
      });
      
      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });
  
  describe('Input Validation', () => {
    beforeEach(() => {
      vi.mocked(middleware.requireAdmin).mockResolvedValue({
        success: true,
        user: { id: 'admin-123', role: 'admin' },
      } as any);
    });
    
    it('should reject request if user ID is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/users//limit-listings', {
        method: 'PUT',
        body: JSON.stringify({
          listing_limit: 10,
          reason: 'Quality control',
        }),
      });
      
      const response = await PUT(request, { params: { id: '' } });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('User ID is required');
    });
    
    it('should reject request if listing_limit is not a number', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/limit-listings', {
        method: 'PUT',
        body: JSON.stringify({
          listing_limit: 'ten',
          reason: 'Quality control',
        }),
      });
      
      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('listing_limit must be a number');
    });
    
    it('should reject request if listing_limit is less than -1', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/limit-listings', {
        method: 'PUT',
        body: JSON.stringify({
          listing_limit: -5,
          reason: 'Quality control',
        }),
      });
      
      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('listing_limit must be -1 (unlimited) or a non-negative number');
    });
    
    it('should reject request if reason is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/limit-listings', {
        method: 'PUT',
        body: JSON.stringify({
          listing_limit: 10,
        }),
      });
      
      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Reason is required');
    });
    
    it('should reject request if reason is empty string', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/limit-listings', {
        method: 'PUT',
        body: JSON.stringify({
          listing_limit: 10,
          reason: '   ',
        }),
      });
      
      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Reason is required');
    });
    
    it('should accept listing_limit of -1 for unlimited', async () => {
      const targetUser = {
        id: 'user-123',
        email: 'seller@example.com',
        name: 'Test Seller',
        role: 'seller',
        is_active: true,
        listing_limit: 10,
      };
      
      const updatedUser = {
        ...targetUser,
        listing_limit: -1,
        updated_at: new Date().toISOString(),
      };
      
      mockSupabase.single
        .mockResolvedValueOnce({
          data: targetUser,
          error: null,
        })
        .mockResolvedValueOnce({
          data: updatedUser,
          error: null,
        });
      
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: null,
      });
      
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/limit-listings', {
        method: 'PUT',
        body: JSON.stringify({
          listing_limit: -1,
          reason: 'Removing limit',
        }),
      });
      
      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('unlimited listings');
    });
    
    it('should accept listing_limit of 0', async () => {
      const targetUser = {
        id: 'user-123',
        email: 'seller@example.com',
        name: 'Test Seller',
        role: 'seller',
        is_active: true,
        listing_limit: 10,
      };
      
      const updatedUser = {
        ...targetUser,
        listing_limit: 0,
        updated_at: new Date().toISOString(),
      };
      
      mockSupabase.single
        .mockResolvedValueOnce({
          data: targetUser,
          error: null,
        })
        .mockResolvedValueOnce({
          data: updatedUser,
          error: null,
        });
      
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: null,
      });
      
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/limit-listings', {
        method: 'PUT',
        body: JSON.stringify({
          listing_limit: 0,
          reason: 'Temporary restriction',
        }),
      });
      
      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('0 listings');
    });
  });
  
  describe('User Validation', () => {
    beforeEach(() => {
      vi.mocked(middleware.requireAdmin).mockResolvedValue({
        success: true,
        user: { id: 'admin-123', role: 'admin' },
      } as any);
    });
    
    it('should return 404 if user not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'User not found' },
      });
      
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/limit-listings', {
        method: 'PUT',
        body: JSON.stringify({
          listing_limit: 10,
          reason: 'Quality control',
        }),
      });
      
      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });
    
    it('should reject setting limit for non-seller users', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'user-123',
          email: 'buyer@example.com',
          name: 'Buyer User',
          role: 'buyer',
          is_active: true,
          listing_limit: -1,
        },
        error: null,
      });
      
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/limit-listings', {
        method: 'PUT',
        body: JSON.stringify({
          listing_limit: 10,
          reason: 'Quality control',
        }),
      });
      
      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Listing limits can only be set for sellers');
    });
    
    it('should reject setting limit for admin users', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'user-123',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
          is_active: true,
          listing_limit: -1,
        },
        error: null,
      });
      
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/limit-listings', {
        method: 'PUT',
        body: JSON.stringify({
          listing_limit: 10,
          reason: 'Quality control',
        }),
      });
      
      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Listing limits can only be set for sellers');
    });
  });
  
  describe('Successful Limit Setting', () => {
    beforeEach(() => {
      vi.mocked(middleware.requireAdmin).mockResolvedValue({
        success: true,
        user: { id: 'admin-123', role: 'admin' },
      } as any);
    });
    
    it('should successfully set listing limit for a seller', async () => {
      const targetUser = {
        id: 'user-123',
        email: 'seller@example.com',
        name: 'Test Seller',
        role: 'seller',
        is_active: true,
        listing_limit: -1,
      };
      
      const updatedUser = {
        ...targetUser,
        listing_limit: 10,
        updated_at: new Date().toISOString(),
      };
      
      mockSupabase.single
        .mockResolvedValueOnce({
          data: targetUser,
          error: null,
        })
        .mockResolvedValueOnce({
          data: updatedUser,
          error: null,
        });
      
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: null,
      });
      
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/limit-listings', {
        method: 'PUT',
        body: JSON.stringify({
          listing_limit: 10,
          reason: 'Quality control',
          notes: 'New seller with limited track record',
        }),
      });
      
      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(updatedUser);
      expect(data.message).toContain('10 listings');
      
      // Verify update was called with correct data
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          listing_limit: 10,
          updated_at: expect.any(String),
        })
      );
      
      // Verify moderation log was created
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          admin_id: 'admin-123',
          action: 'limit_listings',
          target_type: 'user',
          target_id: 'user-123',
          reason: 'Quality control',
          notes: 'New seller with limited track record',
        })
      );
    });
    
    it('should set limit without notes', async () => {
      const targetUser = {
        id: 'user-123',
        email: 'seller@example.com',
        name: 'Test Seller',
        role: 'seller',
        is_active: true,
        listing_limit: -1,
      };
      
      const updatedUser = {
        ...targetUser,
        listing_limit: 5,
        updated_at: new Date().toISOString(),
      };
      
      mockSupabase.single
        .mockResolvedValueOnce({
          data: targetUser,
          error: null,
        })
        .mockResolvedValueOnce({
          data: updatedUser,
          error: null,
        });
      
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: null,
      });
      
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/limit-listings', {
        method: 'PUT',
        body: JSON.stringify({
          listing_limit: 5,
          reason: 'Policy enforcement',
        }),
      });
      
      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verify moderation log was created with null notes
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: null,
        })
      );
    });
    
    it('should handle singular listing message correctly', async () => {
      const targetUser = {
        id: 'user-123',
        email: 'seller@example.com',
        name: 'Test Seller',
        role: 'seller',
        is_active: true,
        listing_limit: -1,
      };
      
      const updatedUser = {
        ...targetUser,
        listing_limit: 1,
        updated_at: new Date().toISOString(),
      };
      
      mockSupabase.single
        .mockResolvedValueOnce({
          data: targetUser,
          error: null,
        })
        .mockResolvedValueOnce({
          data: updatedUser,
          error: null,
        });
      
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: null,
      });
      
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/limit-listings', {
        method: 'PUT',
        body: JSON.stringify({
          listing_limit: 1,
          reason: 'Trial period',
        }),
      });
      
      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.message).toBe('Listing limit set to 1 listing');
    });
    
    it('should continue even if moderation log creation fails', async () => {
      const targetUser = {
        id: 'user-123',
        email: 'seller@example.com',
        name: 'Test Seller',
        role: 'seller',
        is_active: true,
        listing_limit: -1,
      };
      
      const updatedUser = {
        ...targetUser,
        listing_limit: 10,
        updated_at: new Date().toISOString(),
      };
      
      mockSupabase.single
        .mockResolvedValueOnce({
          data: targetUser,
          error: null,
        })
        .mockResolvedValueOnce({
          data: updatedUser,
          error: null,
        });
      
      // Mock moderation log insert failure
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Log insert failed' },
      });
      
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/limit-listings', {
        method: 'PUT',
        body: JSON.stringify({
          listing_limit: 10,
          reason: 'Quality control',
        }),
      });
      
      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();
      
      // Should still succeed even if logging fails
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
  
  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(middleware.requireAdmin).mockResolvedValue({
        success: true,
        user: { id: 'admin-123', role: 'admin' },
      } as any);
    });
    
    it('should return 500 if user update fails', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'user-123',
            email: 'seller@example.com',
            name: 'Test Seller',
            role: 'seller',
            is_active: true,
            listing_limit: -1,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Update failed' },
        });
      
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/limit-listings', {
        method: 'PUT',
        body: JSON.stringify({
          listing_limit: 10,
          reason: 'Quality control',
        }),
      });
      
      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update listing limit');
    });
  });
});
