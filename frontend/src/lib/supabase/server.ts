/**
 * Supabase Client for Server-Side Operations
 *
 * Uses @supabase/ssr so cookies (including the PKCE verifier) are
 * read and written correctly in API routes and server components.
 */

import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

export const createServerClient = () => {
  const cookieStore = cookies();

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — safe to ignore
          }
        },
      },
    }
  );
};
