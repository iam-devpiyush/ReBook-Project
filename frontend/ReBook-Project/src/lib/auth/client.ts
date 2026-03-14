/**
 * Client-Side Authentication Utilities
 * 
 * These utilities are used in client components for OAuth sign-in,
 * sign-out, and authentication state management.
 */

'use client';

import { createClient } from '@/lib/supabase/client';
import type { Provider } from '@supabase/supabase-js';

/**
 * OAuth provider types supported by the platform
 */
export type OAuthProvider = 'google' | 'apple' | 'azure';

/**
 * Sign in with OAuth provider
 * Redirects to the provider's authorization page
 * 
 * @param provider - OAuth provider (google, apple, azure)
 * @param redirectTo - Optional redirect URL after successful authentication
 */
export async function signInWithOAuth(
  provider: OAuthProvider,
  redirectTo?: string
) {
  const supabase = createClient();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as Provider,
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
  
  return data;
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(redirectTo?: string) {
  return signInWithOAuth('google', redirectTo);
}

/**
 * Sign in with Apple OAuth
 */
export async function signInWithApple(redirectTo?: string) {
  return signInWithOAuth('apple', redirectTo);
}

/**
 * Sign in with Microsoft OAuth (Azure AD)
 */
export async function signInWithMicrosoft(redirectTo?: string) {
  return signInWithOAuth('azure', redirectTo);
}

/**
 * Sign out the current user
 * Clears the session and redirects to home page
 * 
 * Implements Requirement 1.8: Invalidate session token on logout
 * - Calls Supabase Auth signOut to invalidate session
 * - Clears all session cookies
 * - Redirects to home page
 */
export async function signOut(redirectTo?: string) {
  const supabase = createClient();
  
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw new Error(`Sign out failed: ${error.message}`);
  }
  
  // Redirect to specified page or home page after sign out
  window.location.href = redirectTo || '/';
}

/**
 * Get the current user
 * Returns null if no user is authenticated
 */
export async function getCurrentUser() {
  const supabase = createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

/**
 * Get the current session
 * Returns null if no session exists
 */
export async function getCurrentSession() {
  const supabase = createClient();
  
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    return null;
  }
  
  return session;
}

/**
 * Refresh the current session
 * Useful for extending session lifetime
 */
export async function refreshSession() {
  const supabase = createClient();
  
  const { data, error } = await supabase.auth.refreshSession();
  
  if (error) {
    throw new Error(`Session refresh failed: ${error.message}`);
  }
  
  return data.session;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Get user profile from database
 */
export async function getUserProfile(userId: string) {
  const supabase = createClient() as any;
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    throw new Error(`Failed to fetch user profile: ${error.message}`);
  }
  
  return data;
}

/**
 * Update user profile in database
 */
export async function updateUserProfile(userId: string, updates: Record<string, unknown>) {
  const supabase = createClient() as any;
  
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to update user profile: ${error.message}`);
  }
  
  return data;
}
