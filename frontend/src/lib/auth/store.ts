/**
 * Authentication State Management Store
 * 
 * Global authentication state using Zustand with Supabase integration.
 * Provides centralized auth state, actions, and automatic session management.
 * 
 * Requirements:
 * - 1.6: Generate secure session token (JWT) stored in httpOnly cookie
 * - 1.7: Automatic session refresh before expiration
 * - 1.8: Invalidate session token on logout
 */

'use client';

import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

/**
 * Authentication state interface
 */
interface AuthState {
  // State
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
  initialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'apple' | 'azure', redirectTo?: string) => Promise<void>;
  signOut: (redirectTo?: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
  
  // Internal state setters
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
}

/**
 * Session configuration constants
 */
const SESSION_CONFIG = {
  // 7 days in seconds (Requirement 1.6)
  EXPIRATION_SECONDS: 7 * 24 * 60 * 60,
  // Proactive refresh: 5 minutes before expiration (Requirement 1.7)
  PROACTIVE_REFRESH_THRESHOLD_SECONDS: 5 * 60,
  // Check interval: every minute
  REFRESH_CHECK_INTERVAL_MS: 60 * 1000,
} as const;

/**
 * Global auth store using Zustand
 * 
 * This store manages authentication state and provides actions for:
 * - OAuth sign-in (Google, Apple, Microsoft)
 * - Sign out with session invalidation
 * - Automatic session refresh
 * - Real-time auth state synchronization
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  session: null,
  loading: true,
  error: null,
  initialized: false,

  // State setters
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  /**
   * Clear error state
   */
  clearError: () => set({ error: null }),

  /**
   * Initialize auth state and set up listeners
   * 
   * This should be called once when the app starts.
   * It fetches the current session and sets up auth state change listeners.
   */
  initialize: async () => {
    const state = get();
    
    // Prevent multiple initializations
    if (state.initialized) {
      return;
    }

    const supabase = createClient();

    try {
      // Get initial session
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        set({ error: sessionError, loading: false, initialized: true });
        return;
      }

      set({
        session: data.session,
        user: data.session?.user ?? null,
        loading: false,
        initialized: true,
      });

      // Set up auth state change listener
      supabase.auth.onAuthStateChange((event: AuthChangeEvent, newSession: Session | null) => {
        console.log('Auth state changed:', event);

        set({
          session: newSession,
          user: newSession?.user ?? null,
          loading: false,
        });

        // Handle specific events
        if (event === 'SIGNED_OUT') {
          set({ user: null, session: null });
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Session token refreshed automatically');
        } else if (event === 'SIGNED_IN') {
          console.log('User signed in');
        }
      });

      // Start automatic session refresh check
      if (data.session) {
        startSessionRefreshTimer();
      }
    } catch (err) {
      set({ error: err as Error, loading: false, initialized: true });
    }
  },

  /**
   * Sign in with OAuth provider
   * 
   * Implements Requirement 1.6: OAuth authentication flow
   * - Redirects to provider authorization page
   * - Handles callback and session creation
   * - Stores session in httpOnly cookie
   * 
   * @param provider - OAuth provider (google, apple, azure)
   * @param redirectTo - Optional redirect URL after authentication
   */
  signInWithOAuth: async (provider, redirectTo) => {
    set({ loading: true, error: null });

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw new Error(`OAuth sign-in failed: ${error.message}`);
      }

      // OAuth redirect happens automatically, no need to update state here
      // State will be updated via onAuthStateChange callback
    } catch (err) {
      set({ error: err as Error, loading: false });
      throw err;
    }
  },

  /**
   * Sign out the current user
   * 
   * Implements Requirement 1.8: Invalidate session token on logout
   * - Calls Supabase Auth signOut to invalidate session
   * - Clears all session cookies
   * - Clears local state
   * - Redirects to specified page
   * 
   * @param redirectTo - Optional redirect URL after sign out
   */
  signOut: async (redirectTo) => {
    set({ loading: true, error: null });

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw new Error(`Sign out failed: ${error.message}`);
      }

      // Clear local state
      set({
        user: null,
        session: null,
        loading: false,
        error: null,
      });

      console.log('User signed out successfully');

      // Redirect after sign out
      if (redirectTo) {
        window.location.href = redirectTo;
      } else {
        window.location.href = '/';
      }
    } catch (err) {
      set({ error: err as Error, loading: false });
      throw err;
    }
  },

  /**
   * Manually refresh the current session
   * 
   * Implements Requirement 1.7: Session refresh capability
   * - Refreshes session token before expiration
   * - Updates session state with new token
   */
  refreshSession: async () => {
    set({ loading: true, error: null });

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        throw new Error(`Session refresh failed: ${error.message}`);
      }

      set({
        session: data.session,
        user: data.session?.user ?? null,
        loading: false,
      });

      console.log('Session refreshed successfully');
    } catch (err) {
      set({ error: err as Error, loading: false });
      throw err;
    }
  },
}));

/**
 * Timer reference for automatic session refresh
 */
let refreshTimer: NodeJS.Timeout | null = null;

/**
 * Start automatic session refresh timer
 * 
 * Implements Requirement 1.7: Automatic session refresh
 * - Checks session expiration every minute
 * - Proactively refreshes when 5 minutes remain
 */
function startSessionRefreshTimer() {
  // Clear existing timer
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  // Check session every minute
  refreshTimer = setInterval(async () => {
    const { session, refreshSession } = useAuthStore.getState();

    if (!session?.expires_at) {
      return;
    }

    const expiresAt = new Date(session.expires_at * 1000);
    const now = new Date();
    const secondsUntilExpiry = (expiresAt.getTime() - now.getTime()) / 1000;

    // If session expired, clear state
    if (secondsUntilExpiry <= 0) {
      console.log('Session expired, clearing state');
      useAuthStore.setState({
        user: null,
        session: null,
        error: new Error('Session expired. Please sign in again.'),
      });
      
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
      return;
    }

    // Proactively refresh if within threshold (5 minutes)
    if (secondsUntilExpiry < SESSION_CONFIG.PROACTIVE_REFRESH_THRESHOLD_SECONDS) {
      console.log(
        'Proactively refreshing session (expires in',
        Math.round(secondsUntilExpiry),
        'seconds)'
      );

      try {
        await refreshSession();
      } catch (error) {
        console.error('Automatic session refresh failed:', error);
      }
    }
  }, SESSION_CONFIG.REFRESH_CHECK_INTERVAL_MS);
}

/**
 * Stop automatic session refresh timer
 */
export function stopSessionRefreshTimer() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}
