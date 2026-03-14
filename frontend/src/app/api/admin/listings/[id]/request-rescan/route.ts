/**
 * API Route: /api/admin/listings/[id]/request-rescan
 * 
 * PUT: Request rescan for a listing
 * 
 * Requirements: 3.8
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { processAdminApproval } from '@/services/admin-approval.service';

/**
 * PUT /api/admin/listings/[id]/request-rescan
 * 
 * Request rescan for a listing
 * - Requires admin authentication
 * - Calls processAdminApproval with "request_rescan" action
 * - Updates listing status to "rescan_required"
 * - Stores optional notes for seller
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
    
    // Parse request body (notes are optional)
    let body: { notes?: string } = {};
    
    try {
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        body = await request.json();
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    // Validate notes length if provided
    if (body.notes && body.notes.length > 500) {
      return NextResponse.json(
        { error: 'Notes must be 500 characters or less' },
        { status: 400 }
      );
    }
    
    // Process admin approval
    const result = await processAdminApproval({
      listingId,
      adminId: user.id,
      action: 'request_rescan',
      notes: body.notes?.trim(),
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
      message: 'Rescan requested successfully',
    });
    
  } catch (error) {
    console.error('Error in PUT /api/admin/listings/[id]/request-rescan:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
