/**
 * Authentication Context Provider
 * 
 * Provides global authentication state management using React Context.
 * Wraps the application to make auth state available to all components.
 * 
 * Session Management (Requirements 1.6, 1.7, 23.3):
 * - Automatic session refresh before expiration
 * - Session stored in httpOnly cookies
 * - 7-day session expiration
 * - Proactive refresh when 5 minutes remain
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Session configuration constants
 */
const SESSION_CONFIG = {
  // 7 days in seconds (Requirement 1.6)
  EXPIRATION_SECONDS: 7 * 24 * 60 * 60, // 604800 seconds
  // Proactive refresh: 5 minutes before expiration (Requirement 1.7)
  PROACTIVE_REFRESH_THRESHOLD_SECONDS: 5 * 60, // 300 seconds
  // Check interval: every minute
  REFRESH_CHECK_INTERVAL_MS: 60 * 1000, // 60000 ms
} as const;

/**
 * Authentication Provider Component
 * 
 * Wrap your app with this provider to enable authentication state management
 * 
 * @example
 * ```tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Check if session needs refresh and refresh if necessary
   * (Requirement 1.7: Automatic session refresh)
   * (Requirement 1.9: Handle session expiration gracefully)
   */
  const checkAndRefreshSession = async (currentSession: Session | null) => {
    if (!currentSession?.expires_at) return;

    const expiresAt = new Date(currentSession.expires_at * 1000);
    const now = new Date();
    const secondsUntilExpiry = (expiresAt.getTime() - now.getTime()) / 1000;

    // If session has already expired, require re-authentication
    if (secondsUntilExpiry <= 0) {
      console.log('Session expired, requiring re-authentication');
      setSession(null);
      setUser(null);
      setError(new Error('Session expired. Please sign in again.'));
      return;
    }

    // Proactively refresh if within threshold (5 minutes)
    if (secondsUntilExpiry < SESSION_CONFIG.PROACTIVE_REFRESH_THRESHOLD_SECONDS) {
      console.log('Proactively refreshing session (expires in', Math.round(secondsUntilExpiry), 'seconds)');
      
      const supabase = createClient();
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Session refresh failed:', refreshError.message);
        setError(refreshError);
        // If refresh fails and session is expired, clear session
        if (secondsUntilExpiry < 60) {
          console.log('Session refresh failed and session near expiry, clearing session');
          setSession(null);
          setUser(null);
        }
      } else if (data.session) {
        console.log('Session successfully refreshed');
        setSession(data.session);
        setUser(data.session.user);
      }
    }
  };

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          setError(sessionError);
        } else {
          setSession(data.session);
          setUser(data.session?.user ?? null);
          
          // Start proactive refresh timer if session exists
          if (data.session) {
            await checkAndRefreshSession(data.session);
          }
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Set up periodic session refresh check (Requirement 1.7)
    refreshTimerRef.current = setInterval(() => {
      if (session) {
        checkAndRefreshSession(session);
      }
    }, SESSION_CONFIG.REFRESH_CHECK_INTERVAL_MS);

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);

        // Handle specific auth events
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          // Clear refresh timer on sign out
          if (refreshTimerRef.current) {
            clearInterval(refreshTimerRef.current);
            refreshTimerRef.current = null;
          }
        } else if (event === 'TOKEN_REFRESHED') {
          // Session was refreshed
          console.log('Session token refreshed');
        } else if (event === 'SIGNED_IN') {
          console.log('User signed in');
          // Start refresh timer on sign in
          if (newSession) {
            await checkAndRefreshSession(newSession);
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      // Clean up refresh timer
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [session]);

  /**
   * Sign out the current user
   * 
   * Implements Requirement 1.8: Invalidate session token on logout
   * - Calls Supabase Auth signOut to invalidate session
   * - Clears all session cookies
   * - Clears local state
   * - Stops refresh timer
   */
  const signOut = async () => {
    const supabase = createClient();
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      setError(signOutError);
      throw signOutError;
    }
    
    // Clear local state
    setUser(null);
    setSession(null);
    setError(null);
    
    // Clear refresh timer
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    
    console.log('User signed out successfully');
  };

  const refreshSession = async () => {
    const supabase = createClient();
    const { data, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      setError(refreshError);
      throw refreshError;
    }
    
    setSession(data.session);
    setUser(data.session?.user ?? null);
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use the Auth Context
 * Must be used within an AuthProvider
 */
export function useAuthContext() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  
  return context;
}
