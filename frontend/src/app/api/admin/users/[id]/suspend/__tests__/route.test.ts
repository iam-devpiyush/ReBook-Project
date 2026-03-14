/**
 * Unit Tests: /api/admin/users/[id]/suspend
 * 
 * Tests for user suspension API route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PUT } from '../route';
import * as middleware from '@/lib/auth/middleware';
import * as supabaseServer from '@/lib/supabase/server';

// Mock dependencies
vi.mock('@/lib/auth/middleware');
vi.mock('@/lib/supabase/server');

describe('PUT /api/admin/users/[id]/suspend', () => {
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
      
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/suspend', {
        method: 'PUT',
        body: JSON.stringify({
          reason: 'Spam',
          duration: 7,
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
      const request = new NextRequest('http://localhost:3000/api/admin/users//suspend', {
        method: 'PUT',
        body: JSON.stringify({
          reason: 'Spam',
          duration: 7,
        }),
      });
      
      const response = await PUT(request, { params: { id: '' } });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('User ID is required');
    });
    
    it('should reject request if reason is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/suspend', {
        method: 'PUT',
        body: JSON.stringify({
          duration: 7,
        }),
      });
      
      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Suspension reason is required');
    });
    
    it('should reject request if reason is empty string', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/suspend', {
        method: 'PUT',
        body: JSON.stringify({
          reason: '   ',
          duration: 7,
        }),
      });
      
      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Suspension reason is required');
    });
    
    it('should reject request if duration is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/suspend', {
        method: 'PUT',
        body: JSON.stringify({
          reason: 'Spam',
        }),
      });
      
      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Duration must be a positive number (in days)');
    });
    
    it('should reject request if duration is not a positive number', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/suspend', {
        method: 'PUT',
        body: JSON.stringify({
          reason: 'Spam',
          duration: -5,
        }),
      });
      
      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Duration must be a positive number (in days)');
    });
    
    it('should reject request if duration is zero', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/suspend', {
        method: 'PUT',
        body: JSON.stringify({
          reason: 'Spam',
          duration: 0,
        }),
      });
      
      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Duration must be a positive number (in days)');
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
      
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/suspend', {
        method: 'PUT',
        body: JSON.stringify({
          reason: 'Spam',
          duration: 7,
        }),
      });
      
      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });
    
    it('should reject suspension of admin users', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'user-123',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
          is_active: true,
          suspended_until: null,
        },
        error: null,
      });
      
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/suspend', {
        method: 'PUT',
        body: JSON.stringify({
          reason: 'Spam',
          duration: 7,
        }),
      });
      
      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();
      
      expect(response.status).toBe(403);
      expect(data.error).toBe('Cannot suspend admin users');
    });
  });
  
  describe('Successful Suspension', () => {
    beforeEach(() => {
      vi.mocked(middleware.requireAdmin).mockResolvedValue({
        success: true,
        user: { id: 'admin-123', role: 'admin' },
      } as any);
    });
    
    it('should successfully suspend a user', async () => {
      const targetUser = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        role: 'seller',
        is_active: true,
        suspended_until: null,
      };
      
      const suspendedUser = {
        ...targetUser,
        suspended_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Mock user fetch
      mockSupabase.single
        .mockResolvedValueOnce({
          data: targetUser,
          error: null,
        })
        // Mock user update
        .mockResolvedValueOnce({
          data: suspendedUser,
          error: null,
        });
      
      // Mock moderation log insert
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: null,
      });
      
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/suspend', {
        method: 'PUT',
        body: JSON.stringify({
          reason: 'Spam',
          duration: 7,
          notes: 'Multiple spam listings',
        }),
      });
      
      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(suspendedUser);
      expect(data.message).toContain('User suspended until');
      
      // Verify update was called with correct data
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          suspended_until: expect.any(String),
          updated_at: expect.any(String),
        })
      );
      
      // Verify moderation log was created
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          admin_id: 'admin-123',
          action: 'suspend_user',
          target_type: 'user',
          target_id: 'user-123',
          reason: 'Spam',
          notes: 'Multiple spam listings',
        })
      );
    });
    
    it('should suspend user without notes', async () => {
      const targetUser = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        role: 'seller',
        is_active: true,
        suspended_until: null,
      };
      
      const suspendedUser = {
        ...targetUser,
        suspended_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      mockSupabase.single
        .mockResolvedValueOnce({
          data: targetUser,
          error: null,
        })
        .mockResolvedValueOnce({
          data: suspendedUser,
          error: null,
        });
      
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: null,
      });
      
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/suspend', {
        method: 'PUT',
        body: JSON.stringify({
          reason: 'Policy violation',
          duration: 30,
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
    
    it('should continue even if moderation log creation fails', async () => {
      const targetUser = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        role: 'seller',
        is_active: true,
        suspended_until: null,
      };
      
      const suspendedUser = {
        ...targetUser,
        suspended_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      mockSupabase.single
        .mockResolvedValueOnce({
          data: targetUser,
          error: null,
        })
        .mockResolvedValueOnce({
          data: suspendedUser,
          error: null,
        });
      
      // Mock moderation log insert failure
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Log insert failed' },
      });
      
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/suspend', {
        method: 'PUT',
        body: JSON.stringify({
          reason: 'Spam',
          duration: 7,
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
            email: 'user@example.com',
            name: 'Test User',
            role: 'seller',
            is_active: true,
            suspended_until: null,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Update failed' },
        });
      
      const request = new NextRequest('http://localhost:3000/api/admin/users/user-123/suspend', {
        method: 'PUT',
        body: JSON.stringify({
          reason: 'Spam',
          duration: 7,
        }),
      });
      
      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to suspend user');
    });
  });
});
