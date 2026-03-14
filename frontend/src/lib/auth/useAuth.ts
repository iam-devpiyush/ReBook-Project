/**
 * useAuth Hook
 * 
 * Convenient hook for accessing authentication state and actions in components.
 * Wraps the Zustand auth store with a clean, React-friendly interface.
 * 
 * Requirements:
 * - 1.6: Access secure session token and user data
 * - 1.7: Automatic session refresh
 * - 1.8: Logout with session invalidation
 */

'use client';

import { useEffect } from 'react';
import { useAuthStore } from './store';
import { useAuthContext } from './provider';

/**
 * Hook to access authentication state and actions
 * 
 * Automatically initializes the auth store on first use.
 * Provides access to user, session, loading state, and auth actions.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, loading, signOut } = useAuth();
 * 
 *   if (loading) return <div>Loading...</div>;
 *   if (!user) return <div>Not authenticated</div>;
 * 
 *   return (
 *     <div>
 *       <p>Welcome, {user.email}</p>
 *       <button onClick={() => signOut()}>Sign Out</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAuth() {
  const {
    user,
    session,
    loading,
    error,
    signOut,
    refreshSession,
  } = useAuthContext();

  return {
    user,
    session,
    loading,
    error,
    isAuthenticated: user !== null,
    signOut,
    refreshSession,
    clearError: () => {},
  };
}

/**
 * Hook to get only the current user
 * 
 * @example
 * ```tsx
 * function UserProfile() {
 *   const { user, loading } = useUser();
 *   
 *   if (loading) return <div>Loading...</div>;
 *   if (!user) return <div>Not signed in</div>;
 *   
 *   return <div>Email: {user.email}</div>;
 * }
 * ```
 */
export function useUser() {
  const { user, loading, error, initialized, initialize } = useAuthStore();

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  return { user, loading, error };
}

/**
 * Hook to get only the current session
 * 
 * @example
 * ```tsx
 * function SessionInfo() {
 *   const { session, loading } = useSession();
 *   
 *   if (loading) return <div>Loading...</div>;
 *   if (!session) return <div>No active session</div>;
 *   
 *   return <div>Expires: {new Date(session.expires_at! * 1000).toLocaleString()}</div>;
 * }
 * ```
 */
export function useSession() {
  const { session, loading, error, initialized, initialize } = useAuthStore();

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  return { session, loading, error };
}

/**
 * Hook to check if user is authenticated
 * 
 * @example
 * ```tsx
 * function ProtectedContent() {
 *   const { isAuthenticated, loading } = useIsAuthenticated();
 *   
 *   if (loading) return <div>Loading...</div>;
 *   if (!isAuthenticated) return <div>Please sign in</div>;
 *   
 *   return <div>Protected content</div>;
 * }
 * ```
 */
export function useIsAuthenticated() {
  const { user, loading, initialized, initialize } = useAuthStore();

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  return {
    isAuthenticated: user !== null,
    loading,
  };
}
