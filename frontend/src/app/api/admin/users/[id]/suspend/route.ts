/**
 * API Route: /api/admin/users/[id]/suspend
 * 
 * PUT: Suspend a user account
 * 
 * Requirements: 9.3, 9.4, 24.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { createServerClient } from '@/lib/supabase/server';

/**
 * PUT /api/admin/users/[id]/suspend
 * 
 * Suspend a user account by setting suspended_until timestamp
 * - Requires admin authentication
 * - Sets suspended_until timestamp in Supabase
 * - Creates moderation log entry
 * - Sends notification to user via Supabase Realtime
 * - Returns updated user
 * 
 * Request body:
 * - reason: Reason for suspension (required)
 * - duration: Duration in days (required, must be positive)
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
    const { reason, duration, notes } = body;
    
    // Validate required fields
    if (!reason || typeof reason !== 'string' || reason.trim() === '') {
      return NextResponse.json(
        { error: 'Suspension reason is required' },
        { status: 400 }
      );
    }
    
    if (!duration || typeof duration !== 'number' || duration <= 0) {
      return NextResponse.json(
        { error: 'Duration must be a positive number (in days)' },
        { status: 400 }
      );
    }
    
    // Create Supabase client
    const supabase = createServerClient();
    
    // Step 1: Verify user exists and is not an admin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: targetUser, error: userError } = await (supabase as any)
      .from('users')
      .select('id, email, name, role, is_active, suspended_until')
      .eq('id', userId)
      .single();
    
    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Prevent suspending admin users
    if (targetUser.role === 'admin') {
      return NextResponse.json(
        { error: 'Cannot suspend admin users' },
        { status: 403 }
      );
    }
    
    // Step 2: Calculate suspended_until timestamp
    const suspendedUntil = new Date();
    suspendedUntil.setDate(suspendedUntil.getDate() + duration);
    
    // Step 3: Update user with suspended_until timestamp
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedUser, error: updateError } = await (supabase as any)
      .from('users')
      .update({
        suspended_until: suspendedUntil.toISOString(),
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
      console.error('Failed to update user:', updateError);
      return NextResponse.json(
        { error: 'Failed to suspend user' },
        { status: 500 }
      );
    }
    
    // Step 4: Create moderation log entry
    const moderationLogData = {
      admin_id: admin.id,
      action: 'suspend_user',
      target_type: 'user',
      target_id: userId,
      reason: reason.trim(),
      notes: notes ? notes.trim() : null,
      created_at: new Date().toISOString(),
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: logError } = await (supabase as any)
      .from('moderation_logs')
      .insert(moderationLogData);
    
    if (logError) {
      console.error('Failed to create moderation log:', logError);
      // Don't fail the entire operation if logging fails
    }
    
    // Step 5: Supabase Realtime notification
    // Supabase Realtime automatically broadcasts database changes
    // The user can subscribe to changes on the users table filtered by their user ID
    // No explicit broadcast needed - Supabase handles this via database triggers
    
    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: `User suspended until ${suspendedUntil.toISOString()}`,
    });
    
  } catch (error) {
    console.error('Error in PUT /api/admin/users/[id]/suspend:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
