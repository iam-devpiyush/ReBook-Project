/**
 * OAuth Sign-In Flows Tests
 * 
 * Tests for OAuth authentication flows with Google, Apple, and Microsoft providers.
 * Validates Requirements 1.1, 1.2, and 1.3.
 */

import { describe, it, expect, vi, beforeEach } from '@jest/globals';
import {
  signInWithGoogle,
  signInWithApple,
  signInWithMicrosoft,
  signInWithOAuth,
} from '@/lib/auth';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithOAuth: vi.fn(),
    },
  })),
}));

describe('OAuth Sign-In Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signInWithGoogle', () => {
    it('should initiate Google OAuth flow with correct parameters', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const mockClient = createClient();
      
      (mockClient.auth.signInWithOAuth as any).mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth' },
        error: null,
      });

      await signInWithGoogle();

      expect(mockClient.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/callback'),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }),
      });
    });

    it('should use custom redirect URL when provided', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const mockClient = createClient();
      
      (mockClient.auth.signInWithOAuth as any).mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth' },
        error: null,
      });

      await signInWithGoogle('/dashboard');

      expect(mockClient.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: expect.objectContaining({
          redirectTo: '/dashboard',
        }),
      });
    });

    it('should throw error when OAuth fails', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const mockClient = createClient();
      
      (mockClient.auth.signInWithOAuth as any).mockResolvedValue({
        data: null,
        error: { message: 'OAuth failed' },
      });

      await expect(signInWithGoogle()).rejects.toThrow('OAuth sign-in failed');
    });
  });

  describe('signInWithApple', () => {
    it('should initiate Apple OAuth flow with correct parameters', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const mockClient = createClient();
      
      (mockClient.auth.signInWithOAuth as any).mockResolvedValue({
        data: { url: 'https://appleid.apple.com/auth' },
        error: null,
      });

      await signInWithApple();

      expect(mockClient.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'apple',
        options: expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/callback'),
        }),
      });
    });

    it('should handle Apple OAuth errors', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const mockClient = createClient();
      
      (mockClient.auth.signInWithOAuth as any).mockResolvedValue({
        data: null,
        error: { message: 'Apple OAuth failed' },
      });

      await expect(signInWithApple()).rejects.toThrow('OAuth sign-in failed');
    });
  });

  describe('signInWithMicrosoft', () => {
    it('should initiate Microsoft OAuth flow with correct parameters', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const mockClient = createClient();
      
      (mockClient.auth.signInWithOAuth as any).mockResolvedValue({
        data: { url: 'https://login.microsoftonline.com/oauth' },
        error: null,
      });

      await signInWithMicrosoft();

      expect(mockClient.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'azure',
        options: expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/callback'),
        }),
      });
    });

    it('should handle Microsoft OAuth errors', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const mockClient = createClient();
      
      (mockClient.auth.signInWithOAuth as any).mockResolvedValue({
        data: null,
        error: { message: 'Microsoft OAuth failed' },
      });

      await expect(signInWithMicrosoft()).rejects.toThrow('OAuth sign-in failed');
    });
  });

  describe('OAuth Callback Handling', () => {
    it('should redirect to provider authorization page', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const mockClient = createClient();
      
      const authUrl = 'https://accounts.google.com/oauth?client_id=123';
      (mockClient.auth.signInWithOAuth as any).mockResolvedValue({
        data: { url: authUrl },
        error: null,
      });

      const result = await signInWithOAuth('google');

      expect(result.url).toBe(authUrl);
    });

    it('should include offline access for token refresh', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const mockClient = createClient();
      
      (mockClient.auth.signInWithOAuth as any).mockResolvedValue({
        data: { url: 'https://oauth.provider.com' },
        error: null,
      });

      await signInWithGoogle();

      expect(mockClient.auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            queryParams: expect.objectContaining({
              access_type: 'offline',
            }),
          }),
        })
      );
    });

    it('should request consent for proper authorization', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const mockClient = createClient();
      
      (mockClient.auth.signInWithOAuth as any).mockResolvedValue({
        data: { url: 'https://oauth.provider.com' },
        error: null,
      });

      await signInWithGoogle();

      expect(mockClient.auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            queryParams: expect.objectContaining({
              prompt: 'consent',
            }),
          }),
        })
      );
    });
  });

  describe('OAuth Provider Support', () => {
    it('should support all three OAuth providers', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const mockClient = createClient();
      
      (mockClient.auth.signInWithOAuth as any).mockResolvedValue({
        data: { url: 'https://oauth.provider.com' },
        error: null,
      });

      // Test Google
      await signInWithGoogle();
      expect(mockClient.auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'google' })
      );

      // Test Apple
      await signInWithApple();
      expect(mockClient.auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'apple' })
      );

      // Test Microsoft (Azure)
      await signInWithMicrosoft();
      expect(mockClient.auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'azure' })
      );
    });
  });

  describe('Redirect URL Configuration', () => {
    it('should use default callback URL when no redirect specified', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const mockClient = createClient();
      
      // Mock window.location.origin
      Object.defineProperty(window, 'location', {
        value: { origin: 'https://example.com' },
        writable: true,
      });

      (mockClient.auth.signInWithOAuth as any).mockResolvedValue({
        data: { url: 'https://oauth.provider.com' },
        error: null,
      });

      await signInWithGoogle();

      expect(mockClient.auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            redirectTo: 'https://example.com/auth/callback',
          }),
        })
      );
    });

    it('should use custom redirect URL when provided', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const mockClient = createClient();
      
      (mockClient.auth.signInWithOAuth as any).mockResolvedValue({
        data: { url: 'https://oauth.provider.com' },
        error: null,
      });

      const customRedirect = '/custom/redirect';
      await signInWithGoogle(customRedirect);

      expect(mockClient.auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            redirectTo: customRedirect,
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw descriptive error on OAuth failure', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const mockClient = createClient();
      
      const errorMessage = 'Provider configuration error';
      (mockClient.auth.signInWithOAuth as any).mockResolvedValue({
        data: null,
        error: { message: errorMessage },
      });

      await expect(signInWithGoogle()).rejects.toThrow(
        `OAuth sign-in failed: ${errorMessage}`
      );
    });

    it('should handle network errors gracefully', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const mockClient = createClient();
      
      (mockClient.auth.signInWithOAuth as any).mockRejectedValue(
        new Error('Network error')
      );

      await expect(signInWithGoogle()).rejects.toThrow();
    });
  });
});

/**
 * Requirements Validation:
 * 
 * Requirement 1.1: OAuth Authentication Flow ✅
 * - OAuth flow initiation with provider redirect
 * - Authorization code exchange (handled by Supabase)
 * - Token verification (handled by Supabase)
 * - User account creation (handled in callback route)
 * - Session token generation (handled by Supabase)
 * 
 * Requirement 1.2: Multiple OAuth Providers ✅
 * - Google OAuth support
 * - Apple OAuth support
 * - Microsoft OAuth support
 * 
 * Requirement 1.3: OAuth Callback Handling ✅
 * - Callback route implementation
 * - Redirect URL configuration
 * - Error handling
 */
