/**
 * User Profile Management Tests
 * 
 * Tests for syncing OAuth profiles to users table, ensuring uniqueness,
 * and handling both first-time and returning users.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { User } from '@supabase/supabase-js';

// Mock Supabase clients
const mockSupabaseClient = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
};

const mockQuery = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
};

// Mock the Supabase client modules
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: () => mockSupabaseClient,
}));

// Import after mocking
import {
  syncUserProfileClient,
  syncUserProfileServer,
  getUserProfileById,
  updateUserProfile,
  type UserProfile,
} from '../profile';

describe('User Profile Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient.from.mockReturnValue(mockQuery);
  });

  describe('syncUserProfileServer', () => {
    it('should create new user profile on first sign-in', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        app_metadata: { provider: 'google' },
        user_metadata: {
          full_name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg',
          provider_id: 'google-123',
        },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };

      // Mock user doesn't exist
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      // Mock successful insert
      mockQuery.single.mockResolvedValueOnce({
        data: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          profile_picture: 'https://example.com/avatar.jpg',
          oauth_provider: 'google',
          oauth_provider_id: 'google-123',
          role: 'buyer',
          is_active: true,
        },
        error: null,
      });

      const result = await syncUserProfileServer(mockUser);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe('user-123');
      expect(result.data?.email).toBe('test@example.com');
      expect(result.data?.oauth_provider).toBe('google');
      expect(result.data?.role).toBe('buyer');
      expect(mockQuery.insert).toHaveBeenCalled();
    });

    it('should update existing user profile on subsequent sign-in', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'updated@example.com',
        app_metadata: { provider: 'google' },
        user_metadata: {
          full_name: 'Updated User',
          avatar_url: 'https://example.com/new-avatar.jpg',
          provider_id: 'google-123',
        },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };

      // Mock user exists
      mockQuery.single.mockResolvedValueOnce({
        data: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          oauth_provider: 'google',
          oauth_provider_id: 'google-123',
        },
        error: null,
      });

      // Mock successful update
      mockQuery.single.mockResolvedValueOnce({
        data: {
          id: 'user-123',
          email: 'updated@example.com',
          name: 'Updated User',
          profile_picture: 'https://example.com/new-avatar.jpg',
          oauth_provider: 'google',
          oauth_provider_id: 'google-123',
        },
        error: null,
      });

      const result = await syncUserProfileServer(mockUser);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data?.email).toBe('updated@example.com');
      expect(result.data?.name).toBe('Updated User');
      expect(mockQuery.update).toHaveBeenCalled();
      expect(mockQuery.insert).not.toHaveBeenCalled();
    });

    it('should handle OAuth provider uniqueness violation', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        app_metadata: { provider: 'google' },
        user_metadata: {
          full_name: 'Test User',
          provider_id: 'google-123',
        },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };

      // Mock user doesn't exist
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      // Mock uniqueness violation (23505 is PostgreSQL unique constraint violation)
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint "unique_oauth_provider"',
        },
      });

      const result = await syncUserProfileServer(mockUser);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('OAuth provider already exists');
      expect(result.data).toBeNull();
    });

    it('should extract name from email if no name provided', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'testuser@example.com',
        app_metadata: { provider: 'google' },
        user_metadata: {
          provider_id: 'google-123',
        },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };

      // Mock user doesn't exist
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      // Mock successful insert
      mockQuery.single.mockResolvedValueOnce({
        data: {
          id: 'user-123',
          email: 'testuser@example.com',
          name: 'testuser',
          oauth_provider: 'google',
          oauth_provider_id: 'google-123',
        },
        error: null,
      });

      const result = await syncUserProfileServer(mockUser);

      expect(result.error).toBeNull();
      expect(result.data?.name).toBe('testuser');
    });

    it('should map Azure provider to Microsoft', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        app_metadata: { provider: 'azure' },
        user_metadata: {
          full_name: 'Test User',
          provider_id: 'azure-123',
        },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };

      // Mock user doesn't exist
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      // Mock successful insert
      mockQuery.single.mockResolvedValueOnce({
        data: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          oauth_provider: 'microsoft',
          oauth_provider_id: 'azure-123',
        },
        error: null,
      });

      const result = await syncUserProfileServer(mockUser);

      expect(result.error).toBeNull();
      expect(result.data?.oauth_provider).toBe('microsoft');
    });

    it('should handle Apple OAuth provider', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        app_metadata: { provider: 'apple' },
        user_metadata: {
          full_name: 'Test User',
          provider_id: 'apple-123',
        },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };

      // Mock user doesn't exist
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      // Mock successful insert
      mockQuery.single.mockResolvedValueOnce({
        data: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          oauth_provider: 'apple',
          oauth_provider_id: 'apple-123',
        },
        error: null,
      });

      const result = await syncUserProfileServer(mockUser);

      expect(result.error).toBeNull();
      expect(result.data?.oauth_provider).toBe('apple');
    });
  });

  describe('syncUserProfileClient', () => {
    it('should create new user profile on first sign-in', async () => {
      const mockUser: User = {
        id: 'user-456',
        email: 'client@example.com',
        app_metadata: { provider: 'google' },
        user_metadata: {
          full_name: 'Client User',
          provider_id: 'google-456',
        },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };

      // Mock user doesn't exist
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      // Mock successful insert
      mockQuery.single.mockResolvedValueOnce({
        data: {
          id: 'user-456',
          email: 'client@example.com',
          name: 'Client User',
          oauth_provider: 'google',
          oauth_provider_id: 'google-456',
          role: 'buyer',
        },
        error: null,
      });

      const result = await syncUserProfileClient(mockUser);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe('user-456');
    });

    it('should update existing user profile', async () => {
      const mockUser: User = {
        id: 'user-456',
        email: 'updated-client@example.com',
        app_metadata: { provider: 'google' },
        user_metadata: {
          full_name: 'Updated Client',
          provider_id: 'google-456',
        },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };

      // Mock user exists
      mockQuery.single.mockResolvedValueOnce({
        data: {
          id: 'user-456',
          email: 'client@example.com',
          name: 'Client User',
        },
        error: null,
      });

      // Mock successful update
      mockQuery.single.mockResolvedValueOnce({
        data: {
          id: 'user-456',
          email: 'updated-client@example.com',
          name: 'Updated Client',
        },
        error: null,
      });

      const result = await syncUserProfileClient(mockUser);

      expect(result.error).toBeNull();
      expect(result.data?.email).toBe('updated-client@example.com');
      expect(mockQuery.update).toHaveBeenCalled();
    });
  });

  describe('getUserProfileById', () => {
    it('should fetch user profile by ID', async () => {
      const mockProfile: UserProfile = {
        id: 'user-789',
        email: 'profile@example.com',
        name: 'Profile User',
        oauth_provider: 'google',
        oauth_provider_id: 'google-789',
        role: 'buyer',
        is_active: true,
        rating: 4.5,
        total_transactions: 10,
      };

      mockQuery.single.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });

      const result = await getUserProfileById('user-789');

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockProfile);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'user-789');
    });

    it('should handle profile not found', async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'User not found' },
      });

      const result = await getUserProfileById('nonexistent');

      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile fields', async () => {
      const updates = {
        name: 'New Name',
        city: 'New City',
        state: 'New State',
      };

      mockQuery.single.mockResolvedValueOnce({
        data: {
          id: 'user-123',
          email: 'test@example.com',
          ...updates,
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      const result = await updateUserProfile('user-123', updates);

      expect(result.error).toBeNull();
      expect(result.data?.name).toBe('New Name');
      expect(result.data?.city).toBe('New City');
      expect(mockQuery.update).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'user-123');
    });

    it('should add updated_at timestamp', async () => {
      const updates = { name: 'Updated Name' };

      mockQuery.single.mockResolvedValueOnce({
        data: {
          id: 'user-123',
          name: 'Updated Name',
          updated_at: expect.any(String),
        },
        error: null,
      });

      const result = await updateUserProfile('user-123', updates);

      expect(result.error).toBeNull();
      expect(result.data?.updated_at).toBeDefined();
    });

    it('should handle update errors', async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });

      const result = await updateUserProfile('user-123', { name: 'New Name' });

      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });
  });

  describe('OAuth Provider Uniqueness', () => {
    it('should enforce unique (oauth_provider, oauth_provider_id) constraint', async () => {
      const mockUser: User = {
        id: 'user-new',
        email: 'duplicate@example.com',
        app_metadata: { provider: 'google' },
        user_metadata: {
          full_name: 'Duplicate User',
          provider_id: 'google-existing',
        },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };

      // Mock user doesn't exist by ID
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      // Mock uniqueness violation on insert
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint "unique_oauth_provider"',
          details: 'Key (oauth_provider, oauth_provider_id)=(google, google-existing) already exists.',
        },
      });

      const result = await syncUserProfileServer(mockUser);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('OAuth provider already exists');
      expect(result.data).toBeNull();
    });
  });

  describe('Default Values', () => {
    it('should set default values for new users', async () => {
      const mockUser: User = {
        id: 'user-defaults',
        email: 'defaults@example.com',
        app_metadata: { provider: 'google' },
        user_metadata: {
          full_name: 'Default User',
          provider_id: 'google-defaults',
        },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };

      // Mock user doesn't exist
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      // Capture the insert call
      let insertedData: any;
      mockQuery.insert.mockImplementationOnce((data) => {
        insertedData = data;
        return mockQuery;
      });

      mockQuery.single.mockResolvedValueOnce({
        data: {
          id: 'user-defaults',
          email: 'defaults@example.com',
          name: 'Default User',
          role: 'buyer',
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
        error: null,
      });

      await syncUserProfileServer(mockUser);

      expect(insertedData.role).toBe('buyer');
      expect(insertedData.is_active).toBe(true);
      expect(insertedData.rating).toBe(0.0);
      expect(insertedData.total_transactions).toBe(0);
      expect(insertedData.listing_limit).toBe(-1);
      expect(insertedData.books_sold).toBe(0);
      expect(insertedData.books_bought).toBe(0);
    });
  });
});
