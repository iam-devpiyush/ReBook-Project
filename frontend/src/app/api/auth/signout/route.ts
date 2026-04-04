export const dynamic = 'force-dynamic';
/**
 * Sign Out API Route
 * 
 * POST /api/auth/signout
 * 
 * Implements Requirement 1.8: Logout functionality
 * - Calls Supabase Auth signOut to invalidate session
 * - Clears all session cookies
 * - Returns success response
 * 
 * This route provides server-side logout functionality that can be called
 * from client components or server actions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/signout
 * 
 * Signs out the current user by:
 * 1. Calling Supabase Auth signOut to invalidate the session
 * 2. Clearing all session cookies (handled automatically by Supabase client)
 * 3. Returning a success response
 * 
 * Returns:
 * - 200 OK: Sign out successful
 * - 500 Internal Server Error: Sign out failed
 */
export async function POST(_request: NextRequest) {
  try {
    // Create Supabase client with cookie access
    const supabase = createServerClient();
    
    // Call Supabase signOut - this invalidates the session and clears cookies
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Sign out error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Sign out failed',
          message: error.message 
        },
        { status: 500 }
      );
    }
    
    // Return success response
    return NextResponse.json(
      { 
        success: true,
        message: 'Successfully signed out' 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error during sign out:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
