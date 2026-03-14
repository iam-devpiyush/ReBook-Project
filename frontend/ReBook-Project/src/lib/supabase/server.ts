/**
 * Supabase Client for Server-Side Operations
 * 
 * This client is used in API routes, server components, and server actions.
 * It has access to cookies for session management.
 * 
 * Session Configuration:
 * - Sessions are stored in httpOnly cookies for security
 * - Session expiration: 7 days (604800 seconds)
 * - Automatic token refresh enabled
 */

import { createServerClient as createSupabaseServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
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

export const createServerClient = () => {
  const cookieStore = cookies();
  
  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ 
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
          cookieStore.set({ 
            name, 
            value: '', 
            ...options,
            maxAge: 0,
          });
        },
      },
    }
  );
};
