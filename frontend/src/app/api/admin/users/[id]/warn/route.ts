/**
 * API Route: /api/admin/users/[id]/warn
 * 
 * POST: Send warning notification to a seller
 * 
 * Requirements: 9.5
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
 * POST /api/admin/users/[id]/warn
 * 
 * Send warning notification to a seller
 * - Requires admin authentication
 * - Sends warning notification to seller via Supabase Realtime
 * - Creates moderation log entry
 * - Returns success response
 * 
 * Request body:
 * - message: Warning message to send to seller (required)
 * - notes: Additional notes for admin records (optional)
 */
export async function POST(
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
    const { message, notes } = body;

    // Validate required fields
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json(
        { error: 'Warning message is required' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createAdminClient();

    // Step 1: Verify user exists and is a seller
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, email, name, role, is_active')
      .eq('id', userId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify user is a seller (warnings are typically for sellers)
    if (targetUser.role !== 'seller') {
      return NextResponse.json(
        { error: 'Warnings can only be sent to sellers' },
        { status: 400 }
      );
    }

    // Step 2: Create moderation log entry
    const moderationLogData = {
      admin_id: admin.id,
      action: 'warn_seller',
      target_type: 'user',
      target_id: userId,
      reason: message.trim(),
      notes: notes ? notes.trim() : null,
      created_at: new Date().toISOString(),
    };

    const { error: logError } = await supabase
      .from('moderation_logs')
      .insert(moderationLogData);

    if (logError) {
      console.error('Failed to create moderation log:', logError);
      return NextResponse.json(
        { error: 'Failed to create moderation log' },
        { status: 500 }
      );
    }

    // Step 3: Supabase Realtime notification
    // Supabase Realtime automatically broadcasts database changes
    // The seller can subscribe to changes on the moderation_logs table filtered by target_id
    // No explicit broadcast needed - Supabase handles this via database triggers

    return NextResponse.json({
      success: true,
      message: 'Warning sent successfully',
      data: {
        userId,
        warningMessage: message.trim(),
        sentAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Error in POST /api/admin/users/[id]/warn:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
