/**
 * Authentication Utilities Index
 * 
 * Central export point for all authentication utilities
 * 
 * NOTE: Server-side utilities are NOT exported from this file to avoid
 * importing next/headers in client components. Import them directly from
 * './server' or './profile' when needed in server components or API routes.
 */

// Client-side utilities (for client components)
export {
  signInWithOAuth,
  signInWithGoogle,
  signInWithApple,
  signInWithMicrosoft,
  signOut,
  getCurrentUser,
  getCurrentSession,
  refreshSession,
  isAuthenticated,
  getUserProfile,
  updateUserProfile,
  type OAuthProvider,
} from './client';

// Profile management utilities (client-side only)
export {
  syncUserProfileClient,
  getUserProfileById,
  updateUserProfile as updateUserProfileById,
  type UserProfile,
} from './profile';

// React hooks (for client components)
export {
  useUser,
  useSession,
  useIsAuthenticated,
  useUserProfile,
  useHasRole,
  useIsAdmin,
  useIsSeller,
  useAuthStateChange,
  useRefreshSession,
  useSignOut,
} from './hooks';

// Zustand store and hooks (for client components)
export { useAuthStore, stopSessionRefreshTimer } from './store';
export {
  useAuth,
  useUser as useUserFromStore,
  useSession as useSessionFromStore,
  useIsAuthenticated as useIsAuthenticatedFromStore,
} from './useAuth';

// Auth context provider
export { AuthProvider, useAuthContext } from './provider';

/**
 * Server-side utilities are available via direct import:
 * 
 * // Server-side auth utilities
 * import {
 *   getServerUser,
 *   getServerSession,
 *   requireAuth,
 *   // ... other server utilities
 * } from '@/lib/auth/server';
 * 
 * // Server-side profile sync
 * import { syncUserProfileServer } from '@/lib/auth/profile';
 */
