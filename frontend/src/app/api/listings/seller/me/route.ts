export const dynamic = 'force-dynamic';
/**
 * API Route: /api/listings/seller/me
 * 
 * GET: Fetch all listings for authenticated seller
 * 
 * Requirements: Seller portal
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth/middleware';
import { SELLER_LISTING_PROJECTION } from '@/lib/supabase/projections';

/**
 * GET /api/listings/seller/me
 * 
 * Fetch all listings for authenticated seller
 * - Fetches listings with book data
 * - Filters by status if provided
 * - Returns listings with pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const authResult = await requireAuth(request);

    if (!authResult.success) {
      return authResult.response;
    }

    const { user } = authResult;

    // Parse query parameters — support both pageSize and page_size
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || searchParams.get('page_size') || '20', 10);

    // Validate pagination parameters
    if (page < 1) {
      return NextResponse.json(
        { error: 'Page must be greater than 0' },
        { status: 400 }
      );
    }

    if (pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { error: 'Page size must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Validate status parameter
    const validStatuses = ['pending_approval', 'active', 'sold', 'rejected', 'rescan_required', 'inactive'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status parameter', valid_statuses: validStatuses },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS — user can only see their own listings (filtered by seller_id)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Build query — use projection to fetch only required fields (Requirement 22.1)
    let query = supabase
      .from('listings')
      .select(SELLER_LISTING_PROJECTION, { count: 'exact' })
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });

    // Apply status filter if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // Execute query
    const { data: listings, error: listingsError, count } = await query;

    if (listingsError) {
      console.error('Error fetching seller listings:', listingsError);
      return NextResponse.json(
        { error: 'Failed to fetch listings' },
        { status: 500 }
      );
    }

    // Calculate pagination metadata
    const totalPages = count ? Math.ceil(count / pageSize) : 0;
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      success: true,
      data: listings || [],
      pagination: {
        page,
        page_size: pageSize,
        total_count: count || 0,
        total_pages: totalPages,
        has_next_page: hasNextPage,
        has_previous_page: hasPreviousPage,
      },
    });

  } catch (error) {
    console.error('Error in GET /api/listings/seller/me:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
