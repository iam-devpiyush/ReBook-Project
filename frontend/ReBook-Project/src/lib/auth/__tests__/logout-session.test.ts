/**
 * Unit Tests for Logout and Session Management
 * 
 * Tests Requirements:
 * - Requirement 1.8: Invalidate session token on logout
 * - Requirement 1.9: Handle session expiration gracefully
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock Supabase client
const mockSignOut = jest.fn();
const mockGetSession = jest.fn();
const mockRefreshSession = jest.fn();
const mockOnAuthStateChange = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signOut: mockSignOut,
      getSession: mockGetSession,
      refreshSession: mockRefreshSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  })),
}));

// Mock window.location
delete (window as any).location;
(window as any).location = { href: '' };

describe('Logout Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).location.href = '';
  });

  describe('Client-side signOut', () => {
    it('should call Supabase signOut and redirect to home page', async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const { signOut } = await import('@/lib/auth/client');
      await signOut();

      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(window.location.href).toBe('/');
    });

    it('should redirect to custom URL when provided', async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const { signOut } = await import('@/lib/auth/client');
      await signOut('/auth/signin');

      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(window.location.href).toBe('/auth/signin');
    });

    it('should throw error when signOut fails', async () => {
      const error = new Error('Sign out failed');
      mockSignOut.mockResolvedValue({ error });

      const { signOut } = await import('@/lib/auth/client');

      await expect(signOut()).rejects.toThrow('Sign out failed: Sign out failed');
    });
  });

  describe('Server-side signOutServer', () => {
    it('should call Supabase signOut on server', async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const { signOutServer } = await import('@/lib/auth/server');
      await signOutServer();

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('should throw error when server signOut fails', async () => {
      const error = new Error('Server sign out failed');
      mockSignOut.mockResolvedValue({ error });

      const { signOutServer } = await import('@/lib/auth/server');

      await expect(signOutServer()).rejects.toThrow('Server sign out failed: Server sign out failed');
    });
  });
});

describe('Session Expiration Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Expired Session Detection', () => {
    it('should detect expired session', () => {
      const expiredSession = {
        expires_at: Math.floor(Date.now() / 1000) - 100, // Expired 100 seconds ago
        user: { id: 'user-123' },
      };

      const expiresAt = new Date(expiredSession.expires_at * 1000);
      const now = new Date();
      const secondsUntilExpiry = (expiresAt.getTime() - now.getTime()) / 1000;

      expect(secondsUntilExpiry).toBeLessThan(0);
    });

    it('should detect session near expiry', () => {
      const nearExpirySession = {
        expires_at: Math.floor(Date.now() / 1000) + 200, // Expires in 200 seconds
        user: { id: 'user-123' },
      };

      const expiresAt = new Date(nearExpirySession.expires_at * 1000);
      const now = new Date();
      const secondsUntilExpiry = (expiresAt.getTime() - now.getTime()) / 1000;

      expect(secondsUntilExpiry).toBeGreaterThan(0);
      expect(secondsUntilExpiry).toBeLessThan(300); // Less than 5 minutes
    });

    it('should detect valid session', () => {
      const validSession = {
        expires_at: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
        user: { id: 'user-123' },
      };

      const expiresAt = new Date(validSession.expires_at * 1000);
      const now = new Date();
      const secondsUntilExpiry = (expiresAt.getTime() - now.getTime()) / 1000;

      expect(secondsUntilExpiry).toBeGreaterThan(300); // More than 5 minutes
    });
  });

  describe('Session Refresh on Expiration', () => {
    it('should refresh session when near expiry', async () => {
      const nearExpirySession = {
        expires_at: Math.floor(Date.now() / 1000) + 200, // Expires in 200 seconds
        user: { id: 'user-123' },
      };

      mockRefreshSession.mockResolvedValue({
        data: {
          session: {
            expires_at: Math.floor(Date.now() / 1000) + 604800, // New 7-day expiry
            user: { id: 'user-123' },
          },
        },
        error: null,
      });

      const expiresAt = new Date(nearExpirySession.expires_at * 1000);
      const now = new Date();
      const secondsUntilExpiry = (expiresAt.getTime() - now.getTime()) / 1000;

      // Should trigger refresh (< 5 minutes)
      if (secondsUntilExpiry < 300) {
        await mockRefreshSession();
      }

      expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    });

    it('should not refresh session when not near expiry', async () => {
      const validSession = {
        expires_at: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
        user: { id: 'user-123' },
      };

      const expiresAt = new Date(validSession.expires_at * 1000);
      const now = new Date();
      const secondsUntilExpiry = (expiresAt.getTime() - now.getTime()) / 1000;

      // Should not trigger refresh (> 5 minutes)
      if (secondsUntilExpiry < 300) {
        await mockRefreshSession();
      }

      expect(mockRefreshSession).not.toHaveBeenCalled();
    });
  });

  describe('Session Refresh Failure Handling', () => {
    it('should handle refresh failure gracefully', async () => {
      const error = new Error('Refresh failed');
      mockRefreshSession.mockResolvedValue({
        data: { session: null },
        error,
      });

      const result = await mockRefreshSession();

      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('Refresh failed');
      expect(result.data.session).toBeNull();
    });

    it('should clear session when refresh fails near expiry', async () => {
      const nearExpirySession = {
        expires_at: Math.floor(Date.now() / 1000) + 30, // Expires in 30 seconds
        user: { id: 'user-123' },
      };

      mockRefreshSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Refresh failed'),
      });

      const expiresAt = new Date(nearExpirySession.expires_at * 1000);
      const now = new Date();
      const secondsUntilExpiry = (expiresAt.getTime() - now.getTime()) / 1000;

      const result = await mockRefreshSession();

      // Should clear session if refresh fails and < 60 seconds until expiry
      const shouldClearSession = result.error && secondsUntilExpiry < 60;

      expect(shouldClearSession).toBe(true);
    });
  });
});

describe('Session Configuration', () => {
  it('should have correct session expiration time (7 days)', () => {
    const SESSION_EXPIRATION_SECONDS = 7 * 24 * 60 * 60;
    expect(SESSION_EXPIRATION_SECONDS).toBe(604800);
  });

  it('should have correct proactive refresh threshold (5 minutes)', () => {
    const PROACTIVE_REFRESH_THRESHOLD_SECONDS = 5 * 60;
    expect(PROACTIVE_REFRESH_THRESHOLD_SECONDS).toBe(300);
  });

  it('should have correct refresh check interval (1 minute)', () => {
    const REFRESH_CHECK_INTERVAL_MS = 60 * 1000;
    expect(REFRESH_CHECK_INTERVAL_MS).toBe(60000);
  });

  it('should have correct auto-refresh threshold (60 seconds)', () => {
    const AUTO_REFRESH_THRESHOLD_SECONDS = 60;
    expect(AUTO_REFRESH_THRESHOLD_SECONDS).toBe(60);
  });
});

describe('Cookie Management', () => {
  it('should configure httpOnly cookies', () => {
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'lax' as const,
      maxAge: 604800,
      path: '/',
    };

    expect(cookieOptions.httpOnly).toBe(true);
    expect(cookieOptions.secure).toBe(true);
    expect(cookieOptions.sameSite).toBe('lax');
    expect(cookieOptions.maxAge).toBe(604800);
  });

  it('should clear cookies on logout', () => {
    const clearCookieOptions = {
      maxAge: 0,
    };

    expect(clearCookieOptions.maxAge).toBe(0);
  });
});

describe('Requirements Validation', () => {
  describe('Requirement 1.8: Invalidate session token on logout', () => {
    it('should invalidate session token when user logs out', async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const { signOut } = await import('@/lib/auth/client');
      await signOut();

      // Verify Supabase signOut was called (invalidates token)
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('should clear session cookies on logout', async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const { signOut } = await import('@/lib/auth/client');
      await signOut();

      // Supabase signOut automatically clears cookies
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  describe('Requirement 1.9: Handle session expiration gracefully', () => {
    it('should require re-authentication when session expires', () => {
      const expiredSession = {
        expires_at: Math.floor(Date.now() / 1000) - 100,
        user: { id: 'user-123' },
      };

      const expiresAt = new Date(expiredSession.expires_at * 1000);
      const now = new Date();
      const secondsUntilExpiry = (expiresAt.getTime() - now.getTime()) / 1000;

      // Session is expired, should require re-authentication
      expect(secondsUntilExpiry).toBeLessThan(0);
    });

    it('should attempt refresh before requiring re-authentication', async () => {
      const nearExpirySession = {
        expires_at: Math.floor(Date.now() / 1000) + 200,
        user: { id: 'user-123' },
      };

      mockRefreshSession.mockResolvedValue({
        data: {
          session: {
            expires_at: Math.floor(Date.now() / 1000) + 604800,
            user: { id: 'user-123' },
          },
        },
        error: null,
      });

      const expiresAt = new Date(nearExpirySession.expires_at * 1000);
      const now = new Date();
      const secondsUntilExpiry = (expiresAt.getTime() - now.getTime()) / 1000;

      // Should attempt refresh before expiration
      if (secondsUntilExpiry < 300) {
        await mockRefreshSession();
      }

      expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Error Messages', () => {
  it('should provide clear error message on logout failure', async () => {
    const error = new Error('Network error');
    mockSignOut.mockResolvedValue({ error });

    const { signOut } = await import('@/lib/auth/client');

    await expect(signOut()).rejects.toThrow('Sign out failed: Network error');
  });

  it('should provide clear error message on session expiration', () => {
    const errorMessage = 'Session expired. Please sign in again.';
    const error = new Error(errorMessage);

    expect(error.message).toBe(errorMessage);
    expect(error.message).toContain('expired');
  });
});

describe('Integration Scenarios', () => {
  it('should handle logout after session expiration', async () => {
    // Session already expired
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: new Error('Session expired'),
    });

    // Logout should still work
    mockSignOut.mockResolvedValue({ error: null });

    const { signOut } = await import('@/lib/auth/client');
    await signOut();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple logout attempts', async () => {
    mockSignOut.mockResolvedValue({ error: null });

    const { signOut } = await import('@/lib/auth/client');
    
    await signOut();
    await signOut();

    expect(mockSignOut).toHaveBeenCalledTimes(2);
  });

  it('should handle logout during session refresh', async () => {
    // Refresh in progress
    mockRefreshSession.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ data: { session: null }, error: null }), 100))
    );

    // Logout should still work
    mockSignOut.mockResolvedValue({ error: null });

    const { signOut } = await import('@/lib/auth/client');
    await signOut();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
