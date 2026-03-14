/**
 * Supabase Client for Client-Side Operations
 * 
 * This client is used in browser components and client-side code.
 * It uses the public anon key and respects Row Level Security (RLS) policies.
 * 
 * Session Configuration:
 * - Sessions are stored in httpOnly cookies for security
 * - Session expiration: 7 days (604800 seconds)
 * - Automatic token refresh enabled
 * - Session detection from URL enabled for OAuth callbacks
 */

import { createBrowserClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/database';

/**
 * Session configuration constants
 */
export const SESSION_CONFIG = {
  // 7 days in seconds (Requirement 1.6, 23.3)
  EXPIRATION_SECONDS: 7 * 24 * 60 * 60, // 604800 seconds
  // Auto refresh threshold: refresh when 60 seconds remain
  AUTO_REFRESH_THRESHOLD_SECONDS: 60,
} as const;

export const createClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        // Session cookies configuration (Requirement 23.3)
        name: 'sb-auth-token',
        // 7 days expiration (Requirement 1.6)
        maxAge: SESSION_CONFIG.EXPIRATION_SECONDS,
        // Security flags
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      },
    }
  );
};

// Singleton instance for client-side usage
export const supabase = createClient();
