/**
 * useAuth Hook Tests
 * 
 * Tests for the useAuth hook and related hooks:
 * - useAuth
 * - useUser
 * - useSession
 * - useIsAuthenticated
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth, useUser, useSession, useIsAuthenticated } from '../useAuth';
import { useAuthStore } from '../store';
import type { User, Session } from '@supabase/supabase-js';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      refreshSession: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  }),
}));

describe('useAuth', () => {
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
      loading: false,
      error: null,
      initialized: true,
    });
  });

  describe('useAuth', () => {
    it('should return auth state and actions', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('session');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isAuthenticated');
      expect(result.current).toHaveProperty('signInWithGoogle');
      expect(result.current).toHaveProperty('signInWithApple');
      expect(result.current).toHaveProperty('signInWithMicrosoft');
      expect(result.current).toHaveProperty('signOut');
      expect(result.current).toHaveProperty('refreshSession');
      expect(result.current).toHaveProperty('clearError');
    });

    it('should return null user when not authenticated', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should return user when authenticated', () => {
      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
        loading: false,
        error: null,
        initialized: true,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should initialize store on mount if not initialized', async () => {
      useAuthStore.setState({
        user: null,
        session: null,
        loading: true,
        error: null,
        initialized: false,
      });

      const initializeSpy = vi.spyOn(useAuthStore.getState(), 'initialize');

      renderHook(() => useAuth());

      await waitFor(() => {
        expect(initializeSpy).toHaveBeenCalled();
      });
    });

    it('should provide signInWithGoogle action', () => {
      const { result } = renderHook(() => useAuth());

      expect(typeof result.current.signInWithGoogle).toBe('function');
    });

    it('should provide signInWithApple action', () => {
      const { result } = renderHook(() => useAuth());

      expect(typeof result.current.signInWithApple).toBe('function');
    });

    it('should provide signInWithMicrosoft action', () => {
      const { result } = renderHook(() => useAuth());

      expect(typeof result.current.signInWithMicrosoft).toBe('function');
    });

    it('should provide signOut action', () => {
      const { result } = renderHook(() => useAuth());

      expect(typeof result.current.signOut).toBe('function');
    });

    it('should provide refreshSession action', () => {
      const { result } = renderHook(() => useAuth());

      expect(typeof result.current.refreshSession).toBe('function');
    });

    it('should provide clearError action', () => {
      const { result } = renderHook(() => useAuth());

      expect(typeof result.current.clearError).toBe('function');
    });

    it('should reflect loading state', () => {
      useAuthStore.setState({
        user: null,
        session: null,
        loading: true,
        error: null,
        initialized: true,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.loading).toBe(true);
    });

    it('should reflect error state', () => {
      const error = new Error('Test error');
      useAuthStore.setState({
        user: null,
        session: null,
        loading: false,
        error,
        initialized: true,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useUser', () => {
    it('should return user and loading state', () => {
      const { result } = renderHook(() => useUser());

      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
    });

    it('should return null user when not authenticated', () => {
      const { result } = renderHook(() => useUser());

      expect(result.current.user).toBeNull();
    });

    it('should return user when authenticated', () => {
      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
        loading: false,
        error: null,
        initialized: true,
      });

      const { result } = renderHook(() => useUser());

      expect(result.current.user).toEqual(mockUser);
    });

    it('should initialize store on mount if not initialized', async () => {
      useAuthStore.setState({
        user: null,
        session: null,
        loading: true,
        error: null,
        initialized: false,
      });

      const initializeSpy = vi.spyOn(useAuthStore.getState(), 'initialize');

      renderHook(() => useUser());

      await waitFor(() => {
        expect(initializeSpy).toHaveBeenCalled();
      });
    });
  });

  describe('useSession', () => {
    it('should return session and loading state', () => {
      const { result } = renderHook(() => useSession());

      expect(result.current).toHaveProperty('session');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
    });

    it('should return null session when not authenticated', () => {
      const { result } = renderHook(() => useSession());

      expect(result.current.session).toBeNull();
    });

    it('should return session when authenticated', () => {
      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
        loading: false,
        error: null,
        initialized: true,
      });

      const { result } = renderHook(() => useSession());

      expect(result.current.session).toEqual(mockSession);
    });

    it('should initialize store on mount if not initialized', async () => {
      useAuthStore.setState({
        user: null,
        session: null,
        loading: true,
        error: null,
        initialized: false,
      });

      const initializeSpy = vi.spyOn(useAuthStore.getState(), 'initialize');

      renderHook(() => useSession());

      await waitFor(() => {
        expect(initializeSpy).toHaveBeenCalled();
      });
    });
  });

  describe('useIsAuthenticated', () => {
    it('should return isAuthenticated and loading state', () => {
      const { result } = renderHook(() => useIsAuthenticated());

      expect(result.current).toHaveProperty('isAuthenticated');
      expect(result.current).toHaveProperty('loading');
    });

    it('should return false when not authenticated', () => {
      const { result } = renderHook(() => useIsAuthenticated());

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should return true when authenticated', () => {
      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
        loading: false,
        error: null,
        initialized: true,
      });

      const { result } = renderHook(() => useIsAuthenticated());

      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should initialize store on mount if not initialized', async () => {
      useAuthStore.setState({
        user: null,
        session: null,
        loading: true,
        error: null,
        initialized: false,
      });

      const initializeSpy = vi.spyOn(useAuthStore.getState(), 'initialize');

      renderHook(() => useIsAuthenticated());

      await waitFor(() => {
        expect(initializeSpy).toHaveBeenCalled();
      });
    });
  });
});
