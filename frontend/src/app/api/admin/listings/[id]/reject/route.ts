/**
 * API Route: /api/admin/listings/[id]/reject
 * 
 * PUT: Reject a listing
 * 
 * Requirements: 3.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { processAdminApproval } from '@/services/admin-approval.service';

/**
 * PUT /api/admin/listings/[id]/reject
 * 
 * Reject a listing
 * - Requires admin authentication
 * - Validates rejection reason is provided
 * - Calls processAdminApproval with "reject" action
 * - Updates listing status to "rejected"
 * - Stores rejection reason
 * - Removes listing from Meilisearch index
 * - Publishes Supabase Realtime notification to seller
 * - Returns updated listing
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
    
    const { user } = authResult;
    const listingId = params.id;
    
    // Validate listing ID
    if (!listingId) {
      return NextResponse.json(
        { error: 'Listing ID is required' },
        { status: 400 }
      );
    }
    
    // Parse request body
    let body: { reason?: string };
    
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    // Validate rejection reason is provided
    if (!body.reason || body.reason.trim() === '') {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }
    
    // Validate reason length
    if (body.reason.length > 500) {
      return NextResponse.json(
        { error: 'Rejection reason must be 500 characters or less' },
        { status: 400 }
      );
    }
    
    // Process admin approval
    const result = await processAdminApproval({
      listingId,
      adminId: user.id,
      action: 'reject',
      reason: body.reason.trim(),
    });
    
    if (!result.success) {
      // Determine appropriate status code based on error
      let statusCode = 500;
      
      if (result.error?.includes('not found')) {
        statusCode = 404;
      } else if (result.error?.includes('status must be')) {
        statusCode = 400;
      } else if (result.error?.includes('permissions')) {
        statusCode = 403;
      }
      
      return NextResponse.json(
        { error: result.error },
        { status: statusCode }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: result.listing,
      message: 'Listing rejected successfully',
    });
    
  } catch (error) {
    console.error('Error in PUT /api/admin/listings/[id]/reject:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
