export const dynamic = 'force-dynamic';
/**
 * API Route: /api/admin/listings
 * 
 * GET: Fetch listings by status for admin review
 * 
 * Requirements: 3.3, 9.2
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
 * GET /api/admin/listings
 * 
 * Fetch listings by status with pagination
 * - Requires admin authentication
 * - Supports filtering by status (pending_approval, active, rejected, etc.)
 * - Returns listings with book and seller details
 * - Includes pagination metadata
 * 
 * Query parameters:
 * - status: Filter by listing status (optional, defaults to all)
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
    const status = searchParams.get('status');
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

    // Build query — fetch listings with status filter
    let query = supabase
      .from('listings')
      .select(`
        id, condition_score, final_price, status, images, created_at,
        city, state, pincode,
        book:books(id, title, author, isbn, cover_image),
        seller_id
      `, { count: 'exact' });

    // Apply status filter if provided
    if (status) {
      const validStatuses = [
        'pending_approval',
        'active',
        'sold',
        'rejected',
        'rescan_required',
        'inactive'
      ];

      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          {
            error: 'Invalid status',
            validStatuses
          },
          { status: 400 }
        );
      }

      query = query.eq('status', status);
    }

    // Apply pagination and ordering
    const { data: listings, error: listingsError, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (listingsError) {
      console.error('Error fetching listings:', listingsError);
      return NextResponse.json(
        { error: 'Failed to fetch listings' },
        { status: 500 }
      );
    }

    // Fetch seller info separately to avoid join issues
    const sellerIds = [...new Set((listings ?? []).map((l: any) => l.seller_id).filter(Boolean))];
    let sellerMap: Record<string, { id: string; name: string; email: string }> = {};
    if (sellerIds.length > 0) {
      const { data: sellers } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', sellerIds);
      (sellers ?? []).forEach((s: any) => { sellerMap[s.id] = s; });
    }

    const enriched = (listings ?? []).map((l: any) => ({
      ...l,
      seller: sellerMap[l.seller_id] ?? null,
    }));

    console.log(`Admin listings fetch: status=${status ?? 'all'}, count=${count}, returned=${enriched.length}`);
    // Calculate pagination metadata
    const totalPages = count ? Math.ceil(count / pageSize) : 0;
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      success: true,
      data: enriched,
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
    console.error('Error in GET /api/admin/listings:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
