/**
 * API Route: /api/admin/users
 * 
 * GET: Fetch users with filters for admin user management
 * 
 * Requirements: 9.3
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
 * GET /api/admin/users
 * 
 * Fetch users with filters and pagination
 * - Requires admin authentication
 * - Supports filtering by role, status, and search query
 * - Returns users with their profile information
 * - Includes pagination metadata
 * 
 * Query parameters:
 * - role: Filter by user role (buyer, seller, admin) (optional)
 * - status: Filter by account status (active, suspended, inactive) (optional)
 * - search: Search by name or email (optional)
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
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(
      parseInt(searchParams.get('pageSize') || '20', 10),
      100 // Max 100 items per page
    );

    // Validate pagination parameters
    if (page < 1 || pageSize < 1) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    const offset = (page - 1) * pageSize;

    // Create Supabase client
    const supabase = createAdminClient();

    // Build query
    let query = supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        profile_picture,
        role,
        city,
        state,
        pincode,
        rating,
        total_transactions,
        is_active,
        suspended_until,
        listing_limit,
        books_sold,
        books_bought,
        trees_saved,
        water_saved_liters,
        co2_reduced_kg,
        created_at,
        updated_at
      `, { count: 'exact' });

    // Apply role filter if provided
    if (role) {
      const validRoles = ['buyer', 'seller', 'admin'];

      if (!validRoles.includes(role)) {
        return NextResponse.json(
          {
            error: 'Invalid role',
            validRoles
          },
          { status: 400 }
        );
      }

      query = query.eq('role', role);
    }

    // Apply status filter if provided
    if (status) {
      const validStatuses = ['active', 'suspended', 'inactive'];

      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          {
            error: 'Invalid status',
            validStatuses
          },
          { status: 400 }
        );
      }

      if (status === 'active') {
        // Active users: is_active = true AND (suspended_until is null OR suspended_until < now)
        query = query
          .eq('is_active', true)
          .or('suspended_until.is.null,suspended_until.lt.' + new Date().toISOString());
      } else if (status === 'suspended') {
        // Suspended users: suspended_until > now
        query = query.gt('suspended_until', new Date().toISOString());
      } else if (status === 'inactive') {
        // Inactive users: is_active = false
        query = query.eq('is_active', false);
      }
    }

    // Apply search filter if provided
    if (search && search.trim()) {
      const searchTerm = search.trim();
      // Search in name or email using ilike for case-insensitive search
      query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }

    // Apply pagination and ordering
    const { data: users, error: usersError, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Calculate pagination metadata
    const totalPages = count ? Math.ceil(count / pageSize) : 0;
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Enhance user data with computed status
    const enhancedUsers = (users || []).map((user: any) => {
      let computedStatus = 'active';

      if (!user.is_active) {
        computedStatus = 'inactive';
      } else if (user.suspended_until) {
        const suspendedUntil = new Date(user.suspended_until);
        const now = new Date();
        if (suspendedUntil > now) {
          computedStatus = 'suspended';
        }
      }

      return {
        ...user,
        status: computedStatus,
      };
    });

    return NextResponse.json({
      success: true,
      data: enhancedUsers,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    });

  } catch (error) {
    console.error('Error in GET /api/admin/users:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
