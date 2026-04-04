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
 *
 * Security (Requirements 17.1-17.9, 23.2):
 * - CORS preflight handling with origin whitelist
 * - CSRF protection for state-mutating API routes
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

// ---------------------------------------------------------------------------
// CORS helpers (Requirement 23.2)
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

function addCorsHeaders(res: NextResponse, origin: string | null): void {
  if (origin && isAllowedOrigin(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Vary', 'Origin');
  }
  res.headers.set('Access-Control-Allow-Credentials', 'true');
}

// ---------------------------------------------------------------------------
// CSRF protection (Requirement 23.2)
// State-mutating API routes require the request to originate from an allowed
// origin (checked via the Origin header). This is a lightweight CSRF defence
// that works alongside SameSite=Lax cookies.
// ---------------------------------------------------------------------------

const CSRF_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function isCsrfSafe(req: NextRequest): boolean {
  if (CSRF_SAFE_METHODS.has(req.method)) return true;
  if (!req.nextUrl.pathname.startsWith('/api/')) return true;

  const origin = req.headers.get('origin');
  // Allow requests with no Origin header (e.g. server-to-server, curl in dev)
  if (!origin) return true;
  return isAllowedOrigin(origin);
}

export async function middleware(req: NextRequest) {
  const origin = req.headers.get('origin');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 });
    addCorsHeaders(res, origin);
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    );
    res.headers.set('Access-Control-Max-Age', '86400');
    return res;
  }

  // CSRF check for state-mutating API routes
  if (!isCsrfSafe(req)) {
    return NextResponse.json(
      { error: 'Forbidden: Cross-site request blocked' },
      { status: 403 }
    );
  }

  const res = NextResponse.next();
  addCorsHeaders(res, origin);

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

export async function updateSessionMiddleware(req: NextRequest) {
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

