/**
 * Authentication Store Tests
 * 
 * Tests for the Zustand auth store including:
 * - State initialization
 * - OAuth sign-in flow
 * - Sign out with session invalidation
 * - Automatic session refresh
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore, stopSessionRefreshTimer } from '../store';
import type { User, Session } from '@supabase/supabase-js';

// Mock Supabase client
const mockSignInWithOAuth = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();
const mockRefreshSession = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
      signOut: mockSignOut,
      getSession: mockGetSession,
      refreshSession: mockRefreshSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}));

describe('useAuthStore', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };

  const mockSession: Session = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: mockUser,
  };

  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      user: null,
      session: null,
      loading: true,
      error: null,
      initialized: false,
    });

    // Clear all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  afterEach(() => {
    stopSessionRefreshTimer();
  });

  describe('initialize', () => {
    it('should fetch initial session and update state', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { initialize } = useAuthStore.getState();
      await initialize();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.session).toEqual(mockSession);
      expect(state.loading).toBe(false);
      expect(state.initialized).toBe(true);
    });

    it('should handle no session on initialization', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { initialize } = useAuthStore.getState();
      await initialize();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.initialized).toBe(true);
    });

    it('should handle session fetch error', async () => {
      const error = new Error('Session fetch failed');
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error,
      });

      const { initialize } = useAuthStore.getState();
      await initialize();

      const state = useAuthStore.getState();
      expect(state.error).toEqual(error);
      expect(state.loading).toBe(false);
      expect(state.initialized).toBe(true);
    });

    it('should not initialize twice', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { initialize } = useAuthStore.getState();
      await initialize();
      await initialize();

      expect(mockGetSession).toHaveBeenCalledTimes(1);
    });

    it('should set up auth state change listener', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { initialize } = useAuthStore.getState();
      await initialize();

      expect(mockOnAuthStateChange).toHaveBeenCalled();
    });
  });

  describe('signInWithOAuth', () => {
    it('should initiate OAuth flow with Google', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth', provider: 'google' },
        error: null,
      });

      const { signInWithOAuth } = useAuthStore.getState();
      await signInWithOAuth('google');

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.stringContaining('/auth/callback'),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
    });

    it('should initiate OAuth flow with Apple', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: 'https://appleid.apple.com/oauth', provider: 'apple' },
        error: null,
      });

      const { signInWithOAuth } = useAuthStore.getState();
      await signInWithOAuth('apple');

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'apple',
        options: {
          redirectTo: expect.stringContaining('/auth/callback'),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
    });

    it('should initiate OAuth flow with Microsoft', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: 'https://login.microsoftonline.com/oauth', provider: 'azure' },
        error: null,
      });

      const { signInWithOAuth } = useAuthStore.getState();
      await signInWithOAuth('azure');

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'azure',
        options: {
          redirectTo: expect.stringContaining('/auth/callback'),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
    });

    it('should use custom redirect URL if provided', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth', provider: 'google' },
        error: null,
      });

      const { signInWithOAuth } = useAuthStore.getState();
      await signInWithOAuth('google', '/dashboard');

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: '/dashboard',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
    });

    it('should handle OAuth sign-in error', async () => {
      const error = new Error('OAuth failed');
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: null, provider: null },
        error,
      });

      const { signInWithOAuth } = useAuthStore.getState();

      await expect(signInWithOAuth('google')).rejects.toThrow('OAuth sign-in failed');

      const state = useAuthStore.getState();
      expect(state.error).toBeTruthy();
      expect(state.loading).toBe(false);
    });
  });

  describe('signOut', () => {
    beforeEach(() => {
      // Set initial authenticated state
      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
        loading: false,
        error: null,
        initialized: true,
      });

      // Mock window.location.href
      delete (window as any).location;
      (window as any).location = { href: '' };
    });

    it('should sign out and clear state', async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const { signOut } = useAuthStore.getState();
      await signOut();

      expect(mockSignOut).toHaveBeenCalled();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.error).toBeNull();
    });

    it('should redirect to home page after sign out', async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const { signOut } = useAuthStore.getState();
      await signOut();

      expect(window.location.href).toBe('/');
    });

    it('should redirect to custom URL after sign out', async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const { signOut } = useAuthStore.getState();
      await signOut('/signin');

      expect(window.location.href).toBe('/signin');
    });

    it('should handle sign out error', async () => {
      const error = new Error('Sign out failed');
      mockSignOut.mockResolvedValue({ error });

      const { signOut } = useAuthStore.getState();

      await expect(signOut()).rejects.toThrow('Sign out failed');

      const state = useAuthStore.getState();
      expect(state.error).toBeTruthy();
      expect(state.loading).toBe(false);
    });
  });

  describe('refreshSession', () => {
    it('should refresh session and update state', async () => {
      const newSession = {
        ...mockSession,
        access_token: 'new-access-token',
        expires_at: Math.floor(Date.now() / 1000) + 7200,
      };

      mockRefreshSession.mockResolvedValue({
        data: { session: newSession },
        error: null,
      });

      const { refreshSession } = useAuthStore.getState();
      await refreshSession();

      expect(mockRefreshSession).toHaveBeenCalled();

      const state = useAuthStore.getState();
      expect(state.session).toEqual(newSession);
      expect(state.user).toEqual(mockUser);
      expect(state.loading).toBe(false);
    });

    it('should handle refresh session error', async () => {
      const error = new Error('Refresh failed');
      mockRefreshSession.mockResolvedValue({
        data: { session: null },
        error,
      });

      const { refreshSession } = useAuthStore.getState();

      await expect(refreshSession()).rejects.toThrow('Session refresh failed');

      const state = useAuthStore.getState();
      expect(state.error).toBeTruthy();
      expect(state.loading).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useAuthStore.setState({ error: new Error('Test error') });

      const { clearError } = useAuthStore.getState();
      clearError();

      const state = useAuthStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('state setters', () => {
    it('should set user', () => {
      const { setUser } = useAuthStore.getState();
      setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
    });

    it('should set session', () => {
      const { setSession } = useAuthStore.getState();
      setSession(mockSession);

      const state = useAuthStore.getState();
      expect(state.session).toEqual(mockSession);
    });

    it('should set loading', () => {
      const { setLoading } = useAuthStore.getState();
      setLoading(false);

      const state = useAuthStore.getState();
      expect(state.loading).toBe(false);
    });

    it('should set error', () => {
      const error = new Error('Test error');
      const { setError } = useAuthStore.getState();
      setError(error);

      const state = useAuthStore.getState();
      expect(state.error).toEqual(error);
    });
  });
});
