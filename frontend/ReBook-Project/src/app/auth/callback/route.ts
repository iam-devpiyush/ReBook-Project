/**
 * OAuth Callback Route Handler
 * 
 * This route handles OAuth callbacks from providers (Google, Apple, Microsoft)
 * after successful authentication. It exchanges the authorization code for
 * a session and redirects the user to the appropriate page.
 */

import { createServerClient } from '@/lib/supabase/server';
import { syncUserProfileServer } from '@/lib/auth/profile.server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || '')}`
    );
  }

  // Exchange code for session
  if (code) {
    const supabase = createServerClient();
    
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      console.error('Code exchange error:', exchangeError);
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/error?error=exchange_failed&description=${encodeURIComponent(exchangeError.message)}`
      );
    }

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Sync OAuth profile to users table
      // This handles both first-time sign-in (create) and returning users (update)
      const { error: syncError } = await syncUserProfileServer(user);
      
      if (syncError) {
        console.error('User profile sync error:', syncError);
        // Continue anyway - user is authenticated even if profile sync fails
        // The profile can be synced later when the user accesses their profile
      }
    }

    // Successful authentication - redirect to dashboard
    return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
  }

  // No code or error - redirect to home
  return NextResponse.redirect(requestUrl.origin);
}
