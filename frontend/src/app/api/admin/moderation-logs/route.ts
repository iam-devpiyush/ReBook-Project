export const dynamic = 'force-dynamic';
/**
 * API Route: /api/admin/moderation-logs
 *
 * GET: Fetch moderation logs with filters for admin audit trail
 *
 * Requirements: 9.11, 24.3
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
 * GET /api/admin/moderation-logs
 *
 * Fetch moderation logs with optional filters and pagination.
 * - Requires admin authentication
 * - Supports filtering by date range, admin, and action type
 * - Returns logs with admin user info joined
 *
 * Query parameters:
 * - adminId: Filter by admin user ID (optional)
 * - action: Filter by action type (optional)
 * - startDate: ISO date string for range start (optional)
 * - endDate: ISO date string for range end (optional)
 * - page: Page number (optional, defaults to 1)
 * - pageSize: Items per page (optional, defaults to 20, max 100)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await requireAdmin(request);

    if (!authResult.success) {
      return authResult.response;
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('adminId');
    const action = searchParams.get('action');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    // targetType is parsed later after validation setup
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(
      parseInt(searchParams.get('pageSize') || '20', 10),
      100
    );

    // Validate pagination parameters
    if (page < 1 || pageSize < 1) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    // Validate action filter if provided
    const validActions = [
      'approve_listing',
      'reject_listing',
      'request_rescan',
      'suspend_user',
      'warn_user',
      'limit_listings',
      'resolve_dispute',
      'issue_refund',
    ];

    if (action && !validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action type', validActions },
        { status: 400 }
      );
    }

    // Validate targetType filter if provided
    const validTargetTypes = ['user', 'listing', 'order'];
    const targetType = searchParams.get('targetType');

    if (targetType && !validTargetTypes.includes(targetType)) {
      return NextResponse.json(
        { error: 'Invalid targetType', validTargetTypes },
        { status: 400 }
      );
    }

    // Validate date filters if provided
    if (startDate && isNaN(Date.parse(startDate))) {
      return NextResponse.json(
        { error: 'Invalid startDate format. Use ISO 8601 format.' },
        { status: 400 }
      );
    }

    if (endDate && isNaN(Date.parse(endDate))) {
      return NextResponse.json(
        { error: 'Invalid endDate format. Use ISO 8601 format.' },
        { status: 400 }
      );
    }

    const offset = (page - 1) * pageSize;

    // Create Supabase client
    const supabase = createAdminClient();

    // Build query with admin user info joined
    let query = supabase
      .from('moderation_logs')
      .select(
        `
        id,
        admin_id,
        action,
        target_type,
        target_id,
        reason,
        notes,
        created_at,
        admin:users!moderation_logs_admin_id_fkey(
          id,
          name,
          email
        )
      `,
        { count: 'exact' }
      );

    // Apply filters
    if (adminId) {
      query = query.eq('admin_id', adminId);
    }

    if (action) {
      query = query.eq('action', action);
    }

    if (targetType) {
      query = query.eq('target_type', targetType);
    }

    if (startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString());
    }

    if (endDate) {
      // Include the full end date day
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query = query.lte('created_at', end.toISOString());
    }

    // Apply pagination and ordering (newest first)
    const { data: logs, error: logsError, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (logsError) {
      console.error('Error fetching moderation logs:', logsError);
      return NextResponse.json(
        { error: 'Failed to fetch moderation logs' },
        { status: 500 }
      );
    }

    // Calculate pagination metadata
    const totalPages = count ? Math.ceil(count / pageSize) : 0;

    return NextResponse.json({
      success: true,
      data: logs || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/moderation-logs:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
