/**
 * API Route: /api/admin/listings/[id]/approve
 * 
 * PUT: Approve a listing
 * 
 * Requirements: 3.4, 3.5, 3.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { processAdminApproval } from '@/services/admin-approval.service';

/**
 * PUT /api/admin/listings/[id]/approve
 * 
 * Approve a listing and make it active
 * - Requires admin authentication
 * - Calls processAdminApproval with "approve" action
 * - Updates listing status to "active"
 * - Sets approved_at and approved_by fields
 * - Adds listing to Meilisearch index
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
    
    // Process admin approval
    const result = await processAdminApproval({
      listingId,
      adminId: user.id,
      action: 'approve',
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
      message: 'Listing approved successfully',
    });
    
  } catch (error) {
    console.error('Error in PUT /api/admin/listings/[id]/approve:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
