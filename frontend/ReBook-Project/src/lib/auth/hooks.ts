/**
 * Authentication React Hooks
 * 
 * Custom hooks for managing authentication state in React components
 * with Supabase auth listeners for real-time updates.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

/**
 * Hook to get the current authenticated user with real-time updates
 * Automatically updates when auth state changes
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    const getSession = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          setError(sessionError);
          setLoading(false);
          return;
        }
        
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setLoading(false);
      } catch (err) {
        setError(err as Error);
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession: Session | null) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
        
        // Handle specific auth events
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, session, loading, error };
}

/**
 * Hook to get only the current user
 */
export function useUser() {
  const { user, loading, error } = useAuth();
  return { user, loading, error };
}

/**
 * Hook to get only the current session
 */
export function useSession() {
  const { session, loading, error } = useAuth();
  return { session, loading, error };
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated() {
  const { user, loading } = useAuth();
  return { isAuthenticated: user !== null, loading };
}

/**
 * Hook to get user profile from database with real-time updates
 */
export function useUserProfile(userId?: string) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const effectiveUserId = userId || user?.id;

  useEffect(() => {
    if (!effectiveUserId) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    // Fetch initial profile
    const fetchProfile = async () => {
      try {
        const { data, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', effectiveUserId)
          .single();

        if (profileError) {
          setError(profileError);
        } else {
          setProfile(data);
        }
        setLoading(false);
      } catch (err) {
        setError(err as Error);
        setLoading(false);
      }
    };

    fetchProfile();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`user-profile-${effectiveUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${effectiveUserId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setProfile(payload.new);
          } else if (payload.eventType === 'DELETE') {
            setProfile(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveUserId]);

  return { profile, loading, error };
}

/**
 * Hook to check if user has a specific role
 */
export function useHasRole(role: string) {
  const { user, loading } = useAuth();
  
  const hasRole = user 
    ? (user.user_metadata?.role === role || user.app_metadata?.role === role)
    : false;

  return { hasRole, loading };
}

/**
 * Hook to check if user is an admin
 */
export function useIsAdmin() {
  return useHasRole('admin');
}

/**
 * Hook to check if user is a seller
 */
export function useIsSeller() {
  return useHasRole('seller');
}

/**
 * Hook to handle auth state changes with custom callback
 */
export function useAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(callback);

    return () => {
      subscription.unsubscribe();
    };
  }, [callback]);
}

/**
 * Hook to refresh session manually
 */
export function useRefreshSession() {
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        setError(refreshError);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  return { refresh, refreshing, error };
}

/**
 * Hook to sign out the current user
 * 
 * Implements Requirement 1.8: Invalidate session token on logout
 * - Provides signOut function that clears session
 * - Tracks loading state during sign out
 * - Handles errors gracefully
 */
export function useSignOut() {
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const signOut = useCallback(async (redirectTo?: string) => {
    setSigningOut(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        setError(signOutError);
        throw signOutError;
      }
      
      // Redirect after successful sign out
      if (redirectTo) {
        window.location.href = redirectTo;
      } else {
        window.location.href = '/';
      }
    } catch (err) {
      setError(err as Error);
      setSigningOut(false);
    }
  }, []);

  return { signOut, signingOut, error };
}
