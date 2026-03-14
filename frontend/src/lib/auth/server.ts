/**
 * Server-Side Authentication Utilities
 * 
 * These utilities are used in API routes, server components, and server actions
 * to handle authentication, session management, and protected routes.
 */

import { createServerClient } from '@/lib/supabase/server';
import type { User, Session } from '@supabase/supabase-js';

/**
 * Get the current authenticated user from the server
 * Returns null if no user is authenticated
 */
export async function getServerUser(): Promise<User | null> {
  const supabase = createServerClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

/**
 * Get the current session from the server
 * Returns null if no session exists
 */
export async function getServerSession(): Promise<Session | null> {
  const supabase = createServerClient();
  
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    return null;
  }
  
  return session;
}

/**
 * Require authentication for server components/actions
 * Throws an error if user is not authenticated
 */
export async function requireAuth(): Promise<User> {
  const user = await getServerUser();
  
  if (!user) {
    throw new Error('Unauthorized: Authentication required');
  }
  
  return user;
}

/**
 * Check if user has a specific role
 * Requires user metadata to include a 'role' field
 */
export async function hasRole(role: string): Promise<boolean> {
  const user = await getServerUser();
  
  if (!user) {
    return false;
  }
  
  // Check user metadata for role
  const userRole = user.user_metadata?.role || user.app_metadata?.role;
  return userRole === role;
}

/**
 * Require a specific role for server components/actions
 * Throws an error if user doesn't have the required role
 */
export async function requireRole(role: string): Promise<User> {
  const user = await requireAuth();
  
  const userRole = user.user_metadata?.role || user.app_metadata?.role;
  
  if (userRole !== role) {
    throw new Error(`Forbidden: ${role} role required`);
  }
  
  return user;
}

/**
 * Sign out the current user on the server
 * 
 * Implements Requirement 1.8: Invalidate session token on logout
 * - Calls Supabase Auth signOut to invalidate session
 * - Clears all session cookies via Supabase client
 * 
 * @throws Error if sign out fails
 */
export async function signOutServer(): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw new Error(`Server sign out failed: ${error.message}`);
  }
}

/**
 * Get user profile data from the database
 * This fetches additional user information beyond what's in the auth token
 */
export async function getUserProfile(userId: string) {
  const supabase = createServerClient();
  
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
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole('admin');
}

/**
 * Check if the current user is a seller
 */
export async function isSeller(): Promise<boolean> {
  return hasRole('seller');
}

/**
 * Verify session token validity
 * Returns true if session is valid, false otherwise
 */
export async function verifySession(): Promise<boolean> {
  const session = await getServerSession();
  return session !== null;
}
