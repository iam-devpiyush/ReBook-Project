/**
 * API Route: /api/admin/users/[id]/limit-listings
 * 
 * PUT: Set listing limit for a seller
 * 
 * Requirements: 9.6, 9.7, 18.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { createClient } from '@supabase/supabase-js';

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * PUT /api/admin/users/[id]/limit-listings
 * 
 * Set listing limit for a seller in Supabase
 * - Requires admin authentication
 * - Sets listing_limit for seller in Supabase
 * - Creates moderation log entry
 * - Returns updated user
 * 
 * Request body:
 * - listing_limit: Maximum number of listings allowed (required, -1 for unlimited, >= 0 for specific limit)
 * - reason: Reason for setting the limit (required)
 * - notes: Additional notes (optional)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const authResult = await requireAdmin(request);

    if (!authResult.success) {
      return authResult.response;
    }

    const { user: admin } = authResult;
    const userId = params.id;

    // Validate user ID
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { listing_limit, reason, notes } = body;

    // Validate required fields
    if (typeof listing_limit !== 'number') {
      return NextResponse.json(
        { error: 'listing_limit must be a number' },
        { status: 400 }
      );
    }

    if (listing_limit < -1) {
      return NextResponse.json(
        { error: 'listing_limit must be -1 (unlimited) or a non-negative number' },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== 'string' || reason.trim() === '') {
      return NextResponse.json(
        { error: 'Reason is required' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createAdminClient();

    // Step 1: Verify user exists and is a seller
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, email, name, role, is_active, listing_limit')
      .eq('id', userId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify user is a seller (only sellers can have listing limits)
    if (targetUser.role !== 'seller') {
      return NextResponse.json(
        { error: 'Listing limits can only be set for sellers' },
        { status: 400 }
      );
    }

    // Step 2: Update user with new listing_limit
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        listing_limit: listing_limit,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select(`
        id,
        email,
        name,
        role,
        is_active,
        suspended_until,
        listing_limit,
        created_at,
        updated_at
      `)
      .single();

    if (updateError || !updatedUser) {
      console.error('Failed to update user listing limit:', updateError);
      return NextResponse.json(
        { error: 'Failed to update listing limit' },
        { status: 500 }
      );
    }

    // Step 3: Create moderation log entry
    const moderationLogData = {
      admin_id: admin.id,
      action: 'limit_listings',
      target_type: 'user',
      target_id: userId,
      reason: reason.trim(),
      notes: notes ? notes.trim() : null,
      created_at: new Date().toISOString(),
    };

    const { error: logError } = await supabase
      .from('moderation_logs')
      .insert(moderationLogData);

    if (logError) {
      console.error('Failed to create moderation log:', logError);
      // Don't fail the entire operation if logging fails
    }

    // Step 4: Supabase Realtime notification
    // Supabase Realtime automatically broadcasts database changes
    // The user can subscribe to changes on the users table filtered by their user ID
    // No explicit broadcast needed - Supabase handles this via database triggers

    const limitMessage = listing_limit === -1
      ? 'unlimited listings'
      : `${listing_limit} listing${listing_limit === 1 ? '' : 's'}`;

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: `Listing limit set to ${limitMessage}`,
    });

  } catch (error) {
    console.error('Error in PUT /api/admin/users/[id]/limit-listings:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
