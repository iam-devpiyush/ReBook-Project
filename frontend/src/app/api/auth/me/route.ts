export const dynamic = 'force-dynamic';
/**
 * Get Current User API Route
 * 
 * GET /api/auth/me
 * 
 * Implements: User profile access requirement
 * - Returns current authenticated user from Supabase
 * - Includes user profile data and eco_impact metrics
 * - Returns 401 if not authenticated
 * 
 * This route provides server-side access to the current user's profile
 * and can be called from client components or server actions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * User profile response type
 */
interface UserProfile {
  id: string;
  email: string;
  name: string;
  profile_picture: string | null;
  role: 'buyer' | 'seller' | 'admin';
  oauth_provider: 'google' | 'apple' | 'microsoft';
  
  // Location
  city: string | null;
  state: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  
  // User metrics
  rating: number;
  total_transactions: number;
  
  // Admin controls
  is_active: boolean;
  suspended_until: string | null;
  listing_limit: number;
  
  // Environmental impact
  eco_impact: {
    books_sold: number;
    books_bought: number;
    trees_saved: number;
    water_saved_liters: number;
    co2_reduced_kg: number;
  };
  
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/auth/me
 * 
 * Returns the current authenticated user's profile including:
 * 1. Basic profile information (name, email, profile picture)
 * 2. OAuth provider information
 * 3. Location data
 * 4. User metrics (rating, transactions)
 * 5. Environmental impact metrics
 * 
 * Returns:
 * - 200 OK: User profile data
 * - 401 Unauthorized: Not authenticated
 * - 404 Not Found: User profile not found in database
 * - 500 Internal Server Error: Database or server error
 */
export async function GET(_request: NextRequest) {
  try {
    // Create Supabase client with cookie access
    const supabase = createServerClient();
    
    // Get the current authenticated user from Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'You must be logged in to access this resource' 
        },
        { status: 401 }
      );
    }
    
    // Fetch user profile from the public.users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      
      // If user not found in database, return 404
      if (profileError.code === 'PGRST116') {
        return NextResponse.json(
          { 
            error: 'Not Found',
            message: 'User profile not found' 
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Database error',
          message: profileError.message 
        },
        { status: 500 }
      );
    }
    
    // Format the response with eco_impact as a nested object
    const profileData = profile as any;
    const userProfile: UserProfile = {
      id: profileData.id,
      email: profileData.email,
      name: profileData.name,
      profile_picture: profileData.profile_picture,
      role: profileData.role,
      oauth_provider: profileData.oauth_provider,
      
      // Location
      city: profileData.city,
      state: profileData.state,
      pincode: profileData.pincode,
      latitude: profileData.latitude,
      longitude: profileData.longitude,
      
      // User metrics
      rating: profileData.rating,
      total_transactions: profileData.total_transactions,
      
      // Admin controls
      is_active: profileData.is_active,
      suspended_until: profileData.suspended_until,
      listing_limit: profileData.listing_limit,
      
      // Environmental impact (grouped)
      eco_impact: {
        books_sold: profileData.books_sold,
        books_bought: profileData.books_bought,
        trees_saved: profileData.trees_saved,
        water_saved_liters: profileData.water_saved_liters,
        co2_reduced_kg: profileData.co2_reduced_kg,
      },
      
      created_at: profileData.created_at,
      updated_at: profileData.updated_at,
    };
    
    return NextResponse.json(
      { 
        user: userProfile 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in /api/auth/me:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
