/**
 * Supabase Connection Verification Utility
 * 
 * This utility helps verify that Supabase is properly configured.
 * Run this in a component or API route to test the connection.
 */

import { supabase } from './client';

export async function verifySupabaseConnection() {
  const results = {
    configured: false,
    connected: false,
    authenticated: false,
    errors: [] as string[],
  };

  // Check if environment variables are set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || supabaseUrl === 'your-supabase-project-url') {
    results.errors.push('NEXT_PUBLIC_SUPABASE_URL is not configured');
  }

  if (!supabaseKey || supabaseKey === 'your-supabase-anon-key') {
    results.errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured');
  }

  if (results.errors.length === 0) {
    results.configured = true;
  }

  // Test connection
  try {
    const { error } = await supabase.from('_test').select('*').limit(1);
    
    if (error) {
      // This is expected if the table doesn't exist yet
      // But it means we can connect to Supabase
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        results.connected = true;
      } else {
        results.errors.push(`Connection error: ${error.message}`);
      }
    } else {
      results.connected = true;
    }
  } catch (error) {
    results.errors.push(`Failed to connect: ${error}`);
  }

  // Check authentication status
  try {
    const { data: { session } } = await supabase.auth.getSession();
    results.authenticated = !!session;
  } catch (error) {
    results.errors.push(`Auth check failed: ${error}`);
  }

  return results;
}

/**
 * Pretty print verification results
 */
export function printVerificationResults(results: Awaited<ReturnType<typeof verifySupabaseConnection>>) {
  console.log('=== Supabase Connection Verification ===');
  console.log(`✓ Configured: ${results.configured ? '✅' : '❌'}`);
  console.log(`✓ Connected: ${results.connected ? '✅' : '❌'}`);
  console.log(`✓ Authenticated: ${results.authenticated ? '✅' : '❌'}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(error => console.log(`  - ${error}`));
  } else {
    console.log('\n✅ All checks passed!');
  }
  
  console.log('=====================================');
}
