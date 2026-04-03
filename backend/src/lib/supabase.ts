/**
 * Supabase Client Configuration
 * 
 * This file provides a configured Supabase client for backend operations.
 */

import { createClient } from '@supabase/supabase-js';

const logger = {
  error: (msg: string, ...args: unknown[]) => console.error('[supabase]', msg, ...args),
};

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  logger.error('Missing Supabase configuration');
  throw new Error('SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY must be set');
}

/**
 * Supabase client with service role key for backend operations
 * This client bypasses Row Level Security (RLS) policies
 */
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Check if Supabase is healthy and accessible
 */
export async function checkSupabaseHealth(): Promise<boolean> {
  try {
    const { error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      logger.error('Supabase health check failed:', error);
      return false;
    }
    return true;
  } catch (error) {
    logger.error('Supabase health check error:', error);
    return false;
  }
}
