/**
 * Authentication Middleware for API Routes
 * 
 * Provides middleware functions to verify sessions and enforce role-based access control.
 * These middleware functions are designed for use in Next.js API routes.
 * 
 * Requirements:
 * - 1.6: Session token verification
 * - 1.8: Role-based access control
 */

import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';

/**
 * User with role information from database
 */
export interface UserWithRole extends User {
  role?: 'buyer' | 'seller' | 'admin';
  is_active?: boolean;
  suspended_until?: string | null;
}

/**
 * Middleware result containing user or error response
 */
export type MiddlewareResult = 
  | { success: true; user: UserWithRole }
  | { success: false; response: NextResponse };

/**
 * Get the current authenticated user from the session
 * Returns user if authenticated, or error response if not
 * 
 * @param _request - Next.js request object (unused but required for API route signature)
 * @returns Middleware result with user or error response
 */
export async function getUser(_request: NextRequest): Promise<MiddlewareResult> {
  const supabase = createServerClient();
  
  // Get user from session
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      ),
    };
  }
  
  // Fetch user profile from database to get role and status
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role, is_active, suspended_until')
    .eq('id', user.id)
    .single();
  
  if (profileError || !profile) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      ),
    };
  }
  
  // Type assertion for profile data
  const userProfile = profile as {
    role: 'buyer' | 'seller' | 'admin';
    is_active: boolean;
    suspended_until: string | null;
  };
  
  // Check if user is suspended
  if (userProfile.suspended_until) {
    const suspendedUntil = new Date(userProfile.suspended_until);
    const now = new Date();
    
    if (suspendedUntil > now) {
      return {
        success: false,
        response: NextResponse.json(
          { 
            error: 'Account suspended',
            suspended_until: userProfile.suspended_until,
          },
          { status: 403 }
        ),
      };
    }
  }
  
  // Check if user is active
  if (!userProfile.is_active) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Account is inactive' },
        { status: 403 }
      ),
    };
  }
  
  // Attach role to user object
  const userWithRole: UserWithRole = {
    ...user,
    role: userProfile.role,
    is_active: userProfile.is_active,
    suspended_until: userProfile.suspended_until,
  };
  
  return {
    success: true,
    user: userWithRole,
  };
}

/**
 * Require authentication for API routes
 * Returns user if authenticated, or 401 error response if not
 * 
 * @param request - Next.js request object
 * @returns Middleware result with user or error response
 */
export async function requireAuth(request: NextRequest): Promise<MiddlewareResult> {
  return getUser(request);
}

/**
 * Require seller role for API routes
 * Returns user if authenticated and has seller role, or error response if not
 * 
 * @param request - Next.js request object
 * @returns Middleware result with user or error response
 */
export async function requireSeller(request: NextRequest): Promise<MiddlewareResult> {
  const result = await getUser(request);
  
  if (!result.success) {
    return result;
  }
  
  const { user } = result;
  
  // Check if user has seller or admin role (admins can access seller routes)
  if (user.role !== 'seller' && user.role !== 'admin') {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Forbidden: Seller role required' },
        { status: 403 }
      ),
    };
  }
  
  return {
    success: true,
    user,
  };
}

/**
 * Require admin role for API routes
 * Returns user if authenticated and has admin role, or error response if not
 * 
 * @param request - Next.js request object
 * @returns Middleware result with user or error response
 */
export async function requireAdmin(request: NextRequest): Promise<MiddlewareResult> {
  const result = await getUser(request);
  
  if (!result.success) {
    return result;
  }
  
  const { user } = result;
  
  // Check if user has admin role
  if (user.role !== 'admin') {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Forbidden: Admin role required' },
        { status: 403 }
      ),
    };
  }
  
  return {
    success: true,
    user,
  };
}

/**
 * Helper function to check if user has a specific role
 * 
 * @param user - User with role information
 * @param role - Role to check
 * @returns True if user has the role, false otherwise
 */
export function hasRole(user: UserWithRole, role: 'buyer' | 'seller' | 'admin'): boolean {
  return user.role === role;
}

/**
 * Helper function to check if user has any of the specified roles
 * 
 * @param user - User with role information
 * @param roles - Array of roles to check
 * @returns True if user has any of the roles, false otherwise
 */
export function hasAnyRole(user: UserWithRole, roles: Array<'buyer' | 'seller' | 'admin'>): boolean {
  return roles.includes(user.role as 'buyer' | 'seller' | 'admin');
}
