/**
 * Supabase Client for Client-Side Operations
 *
 * Uses @supabase/ssr so the PKCE code verifier is stored in cookies,
 * making it accessible to the server-side callback route.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

// Singleton for client-side usage
export const supabase = createClient();
