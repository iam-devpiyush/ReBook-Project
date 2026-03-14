/**
 * API Route: /api/listings/[id]
 * 
 * GET: Fetch listing by ID with book and seller data
 * PUT: Update listing (seller only)
 * DELETE: Delete listing (seller only)
 * 
 * Requirements: Listing detail view, editing, deletion
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getUser, requireSeller } from '@/lib/auth/middleware';
import { updateListingSchema } from '@/lib/validation/listing';
import type { UpdateListingRequest } from '@/types/listing';
import { updateMeilisearchIndex, removeFromMeilisearchIndex } from '@/services/search.service';

/**
 * GET /api/listings/[id]
 * 
 * Fetch listing by ID
 * - Fetches listing with book and seller data
 * - Increments view count
 * - Returns listing details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid listing ID format' },
        { status: 400 }
      );
    }
    
    // Create Supabase client
    const supabase = createServerClient();
    
    // Fetch listing with book and seller data
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select(`
        *,
        book:books(*),
        seller:users(id, name, email, profile_picture, rating)
      `)
      .eq('id', id)
      .single();
    
    if (listingError || !listing) {
      console.error('Error fetching listing:', listingError);
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }
    
    // Increment view count (fire and forget - don't wait for response)
    supabase
      .from('listings')
      .update({ views: listing.views + 1 })
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Error incrementing view count:', error);
        }
      });
    
    return NextResponse.json({
      success: true,
      data: listing,
    });
    
  } catch (error) {
    console.error('Error in GET /api/listings/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/listings/[id]
 * 
 * Update listing
 * - Verifies seller owns the listing
 * - Checks listing status allows editing
 * - Updates listing in Supabase
 * - Returns updated listing
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid listing ID format' },
        { status: 400 }
      );
    }
    
    // Verify seller is authenticated
    const authResult = await requireSeller(request);
    
    if (!authResult.success) {
      return authResult.response;
    }
    
    const { user } = authResult;
    
    // Parse and validate request body
    const body: UpdateListingRequest = await request.json();
    
    const validationResult = updateListingSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }
    
    const validatedData = validationResult.data;
    
    // Create Supabase client
    const supabase = createServerClient();
    
    // Fetch existing listing to verify ownership and status
    const { data: existingListing, error: fetchError } = await supabase
      .from('listings')
      .select('seller_id, status')
      .eq('id', id)
      .single();
    
    if (fetchError || !existingListing) {
      console.error('Error fetching listing:', fetchError);
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }
    
    // Verify seller owns the listing
    if (existingListing.seller_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this listing' },
        { status: 403 }
      );
    }
    
    // Check if listing status allows editing
    const editableStatuses = ['pending_approval', 'active', 'rescan_required'];
    if (!editableStatuses.includes(existingListing.status)) {
      return NextResponse.json(
        { 
          error: 'Listing cannot be edited in current status', 
          status: existingListing.status 
        },
        { status: 400 }
      );
    }
    
    // Update listing
    const { data: updatedListing, error: updateError } = await supabase
      .from('listings')
      .update(validatedData)
      .eq('id', id)
      .select(`
        *,
        book:books(*),
        seller:users(id, name, email, profile_picture, rating)
      `)
      .single();
    
    if (updateError || !updatedListing) {
      console.error('Error updating listing:', updateError);
      return NextResponse.json(
        { error: 'Failed to update listing' },
        { status: 500 }
      );
    }
    
    // Sync Meilisearch index (fire and forget - don't fail the request if indexing fails)
    updateMeilisearchIndex({
      id: updatedListing.id,
      book_id: updatedListing.book_id,
      seller_id: updatedListing.seller_id,
      title: updatedListing.book?.title ?? '',
      author: updatedListing.book?.author ?? '',
      subject: updatedListing.book?.subject ?? undefined,
      isbn: updatedListing.book?.isbn ?? undefined,
      publisher: updatedListing.book?.publisher ?? undefined,
      description: updatedListing.book?.description ?? undefined,
      status: updatedListing.status,
      category_id: updatedListing.book?.category_id ?? '',
      condition_score: updatedListing.condition_score,
      final_price: updatedListing.final_price,
      original_price: updatedListing.original_price,
      delivery_cost: updatedListing.delivery_cost,
      images: updatedListing.images ?? [],
      location: {
        city: updatedListing.location?.city ?? '',
        state: updatedListing.location?.state ?? '',
        pincode: updatedListing.location?.pincode ?? '',
        latitude: updatedListing.location?.latitude ?? undefined,
        longitude: updatedListing.location?.longitude ?? undefined,
      },
      created_at: updatedListing.created_at,
      updated_at: updatedListing.updated_at,
    }).catch((err) => console.error('Failed to sync listing to Meilisearch:', err));
    
    return NextResponse.json({
      success: true,
      data: updatedListing,
      message: 'Listing updated successfully',
    });
    
  } catch (error) {
    console.error('Error in PUT /api/listings/[id]:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/listings/[id]
 * 
 * Delete listing
 * - Verifies seller owns the listing
 * - Checks listing status is not "sold"
 * - Deletes listing from Supabase
 * - Returns success response
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid listing ID format' },
        { status: 400 }
      );
    }
    
    // Verify seller is authenticated
    const authResult = await requireSeller(request);
    
    if (!authResult.success) {
      return authResult.response;
    }
    
    const { user } = authResult;
    
    // Create Supabase client
    const supabase = createServerClient();
    
    // Fetch existing listing to verify ownership and status
    const { data: existingListing, error: fetchError } = await supabase
      .from('listings')
      .select('seller_id, status')
      .eq('id', id)
      .single();
    
    if (fetchError || !existingListing) {
      console.error('Error fetching listing:', fetchError);
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }
    
    // Verify seller owns the listing
    if (existingListing.seller_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this listing' },
        { status: 403 }
      );
    }
    
    // Check if listing status is not "sold"
    if (existingListing.status === 'sold') {
      return NextResponse.json(
        { error: 'Cannot delete sold listings' },
        { status: 400 }
      );
    }
    
    // Delete listing
    const { error: deleteError } = await supabase
      .from('listings')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      console.error('Error deleting listing:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete listing' },
        { status: 500 }
      );
    }
    
    // Remove from Meilisearch index (fire and forget)
    removeFromMeilisearchIndex(id).catch((err) =>
      console.error('Failed to remove listing from Meilisearch:', err)
    );
    
    return NextResponse.json({
      success: true,
      message: 'Listing deleted successfully',
    });
    
  } catch (error) {
    console.error('Error in DELETE /api/listings/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
