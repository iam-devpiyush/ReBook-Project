/**
 * Supabase Middleware for Next.js
 * 
 * This middleware handles session refresh and authentication state
 * for all routes in the application.
 * 
 * Session Management (Requirements 1.6, 1.7, 23.3):
 * - Automatic session refresh before expiration
 * - Session stored in httpOnly cookies
 * - 7-day session expiration
 * - Refresh when 60 seconds remain before expiration
 */

import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Database } from '@/types/database';

/**
 * Session configuration constants
 */
const SESSION_CONFIG = {
  // 7 days in seconds (Requirement 1.6)
  EXPIRATION_SECONDS: 7 * 24 * 60 * 60, // 604800 seconds
  // Auto refresh threshold: refresh when 60 seconds remain (Requirement 1.7)
  AUTO_REFRESH_THRESHOLD_SECONDS: 60,
} as const;

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Create Supabase client with cookie handling
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // Set cookie in both request and response
          req.cookies.set({
            name,
            value,
            ...options,
          });
          res.cookies.set({
            name,
            value,
            ...options,
            // Enforce session configuration (Requirement 1.6, 23.3)
            maxAge: SESSION_CONFIG.EXPIRATION_SECONDS,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
          });
        },
        remove(name: string, options: any) {
          // Remove cookie from both request and response
          req.cookies.set({
            name,
            value: '',
            ...options,
          });
          res.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: 0,
          });
        },
      },
    }
  );

  // Get current session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Automatic session refresh (Requirement 1.7)
  if (session) {
    const expiresAt = new Date(session.expires_at! * 1000);
    const now = new Date();
    const secondsUntilExpiry = (expiresAt.getTime() - now.getTime()) / 1000;

    // Refresh session if it's about to expire (within threshold)
    if (secondsUntilExpiry < SESSION_CONFIG.AUTO_REFRESH_THRESHOLD_SECONDS) {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh failed:', error.message);
        // Continue with existing session even if refresh fails
      } else if (data.session) {
        console.log('Session automatically refreshed');
      }
    }
  }

  return res;
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
