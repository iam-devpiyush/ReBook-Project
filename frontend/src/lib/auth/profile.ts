/**
 * User Profile Management
 * 
 * Handles syncing OAuth profile data to the users table in Supabase.
 * Ensures (oauth_provider, oauth_provider_id) uniqueness and handles
 * both first-time sign-in (create) and returning users (update).
 */

import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

/**
 * User profile data structure
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  profile_picture?: string | null;
  oauth_provider: 'google' | 'apple' | 'microsoft';
  oauth_provider_id: string;
  role?: 'buyer' | 'seller' | 'admin';
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number;
  total_transactions?: number;
  is_active?: boolean;
  suspended_until?: string | null;
  listing_limit?: number;
  books_sold?: number;
  books_bought?: number;
  trees_saved?: number;
  water_saved_liters?: number;
  co2_reduced_kg?: number;
  created_at?: string;
  updated_at?: string;
}

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
 * Sync OAuth profile to users table (client-side)
 * Creates new user on first sign-in, updates existing user on subsequent sign-ins
 * 
 * NOTE: For server-side profile sync, use syncUserProfileServer from './profile.server'
 * 
 * @param user - Supabase authenticated user
 * @returns User profile data or error
 */
export async function syncUserProfileClient(user: User): Promise<{ data: UserProfile | null; error: Error | null }> {
  try {
    const supabase = createClient();
    
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
        listing_limit: -1,
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

/**
 * Get user profile by ID
 */
export async function getUserProfileById(userId: string): Promise<{ data: UserProfile | null; error: Error | null }> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }
    
    return { data: data as UserProfile, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error occurred');
    return { data: null, error };
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<{ data: UserProfile | null; error: Error | null }> {
  try {
    const supabase = createClient() as any;
    
    // Add updated_at timestamp
    const updatesWithTimestamp = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('users')
      .update(updatesWithTimestamp)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to update user profile: ${error.message}`);
    }
    
    return { data: data as UserProfile, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error occurred');
    return { data: null, error };
  }
}
