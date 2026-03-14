/**
 * Server-Side User Profile Management
 * 
 * Handles syncing OAuth profile data to the users table in Supabase (server-side only).
 * This file should only be imported in server components or API routes.
 */

import { createServerClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from './profile';

/**
 * Extract OAuth provider from Supabase user metadata
 */
function getOAuthProvider(user: User): 'google' | 'apple' | 'microsoft' {
  const provider = user.app_metadata?.provider;
  
  // Map Supabase provider names to our schema
  if (provider === 'google') return 'google';
  if (provider === 'apple') return 'apple';
  if (provider === 'azure') return 'microsoft';
  
  // Default to google if unknown
  return 'google';
}

/**
 * Extract OAuth provider ID from user metadata
 */
function getOAuthProviderId(user: User): string {
  // Try to get provider-specific ID from user metadata
  const providerId = user.user_metadata?.provider_id || 
                     user.user_metadata?.sub ||
                     user.id;
  
  return providerId;
}

/**
 * Extract user name from OAuth profile
 */
function extractUserName(user: User): string {
  // Try various name fields from different providers
  const name = user.user_metadata?.full_name ||
               user.user_metadata?.name ||
               user.user_metadata?.display_name ||
               user.email?.split('@')[0] ||
               'User';
  
  return name;
}

/**
 * Extract profile picture URL from OAuth profile
 */
function extractProfilePicture(user: User): string | null {
  const picture = user.user_metadata?.avatar_url ||
                  user.user_metadata?.picture ||
                  user.user_metadata?.photo ||
                  null;
  
  return picture;
}

/**
 * Sync OAuth profile to users table (server-side)
 * Creates new user on first sign-in, updates existing user on subsequent sign-ins
 * 
 * @param user - Supabase authenticated user
 * @returns User profile data or error
 */
export async function syncUserProfileServer(user: User): Promise<{ data: UserProfile | null; error: Error | null }> {
  try {
    const supabase = createServerClient();
    
    const oauthProvider = getOAuthProvider(user);
    const oauthProviderId = getOAuthProviderId(user);
    const name = extractUserName(user);
    const profilePicture = extractProfilePicture(user);
    
    // Check if user already exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected for new users
      throw new Error(`Failed to check existing user: ${fetchError.message}`);
    }
    
    if (existingUser) {
      // User exists - update profile with latest OAuth data
      const updates = {
        email: user.email!,
        name,
        profile_picture: profilePicture,
        oauth_provider: oauthProvider,
        oauth_provider_id: oauthProviderId,
        updated_at: new Date().toISOString(),
      };
      
      const supabaseAny = supabase as any;
      const { data: updatedUser, error: updateError } = await supabaseAny
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
      
      if (updateError) {
        throw new Error(`Failed to update user profile: ${updateError.message}`);
      }
      
      return { data: updatedUser as UserProfile, error: null };
    } else {
      // New user - create profile
      const newUser = {
        id: user.id,
        email: user.email!,
        name,
        profile_picture: profilePicture,
        oauth_provider: oauthProvider,
        oauth_provider_id: oauthProviderId,
        role: 'buyer' as const,
        is_active: true,
        rating: 0.0,
        total_transactions: 0,
        listing_limit: -1, // Unlimited by default
        books_sold: 0,
        books_bought: 0,
        trees_saved: 0.0,
        water_saved_liters: 0.0,
        co2_reduced_kg: 0.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const supabaseAny = supabase as any;
      const { data: createdUser, error: insertError } = await supabaseAny
        .from('users')
        .insert(newUser)
        .select()
        .single();
      
      if (insertError) {
        // Check if it's a uniqueness violation
        if (insertError.code === '23505') {
          throw new Error(`User with this OAuth provider already exists: ${insertError.message}`);
        }
        throw new Error(`Failed to create user profile: ${insertError.message}`);
      }
      
      return { data: createdUser as UserProfile, error: null };
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error occurred');
    return { data: null, error };
  }
}
