export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase/server';
import { requireSeller } from '@/lib/auth/middleware';
import { updateListingSchema } from '@/lib/validation/listing';
import type { UpdateListingRequest } from '@/types/listing';
import { updateMeilisearchIndex, removeFromMeilisearchIndex } from '@/services/search.service';
import { meiliUpdateListing, meiliDeleteListing, buildListingDoc } from '@/lib/meilisearch/sync';
import { maskPhoneNumber } from '@/lib/security/sanitize';

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid listing ID format' }, { status: 400 });
    }

    // Use admin client so RLS doesn't block pending_approval or other statuses
    const supabase = createAdminClient() as any;
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*, book:books(*), seller:users!seller_id(id, name, email, profile_picture, rating)')
      .eq('id', id)
      .single();

    if (listingError || !listing) {
      console.error('Error fetching listing:', JSON.stringify(listingError), 'id:', id);
      return NextResponse.json({ error: 'Listing not found', detail: listingError?.message }, { status: 404 });
    }

    // fire-and-forget view count increment
    supabase.from('listings').update({ views: (listing.views ?? 0) + 1 }).eq('id', id);

    const publicListing = {
      ...listing,
      location: listing.city ? { city: listing.city, state: listing.state, pincode: listing.pincode } : null,
      seller: listing.seller
        ? { ...listing.seller, phone: listing.seller.phone ? maskPhoneNumber(String(listing.seller.phone)) : undefined }
        : listing.seller,
    };

    return NextResponse.json({ success: true, data: publicListing });
  } catch (error) {
    console.error('Error in GET /api/listings/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid listing ID format' }, { status: 400 });
    }

    const authResult = await requireSeller(request);
    if (!authResult.success) return authResult.response;
    const { user } = authResult;

    const body: UpdateListingRequest = await request.json();
    const validationResult = updateListingSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Validation failed', details: validationResult.error.errors }, { status: 400 });
    }

    const supabase = createServerClient() as any;
    const { data: existingListing, error: fetchError } = await supabase
      .from('listings').select('seller_id, status').eq('id', id).single();

    if (fetchError || !existingListing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    if (existingListing.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You do not own this listing' }, { status: 403 });
    }
    const editableStatuses = ['pending_approval', 'active', 'rescan_required'];
    if (!editableStatuses.includes(existingListing.status)) {
      return NextResponse.json({ error: 'Listing cannot be edited in current status' }, { status: 400 });
    }

    const { data: updatedListing, error: updateError } = await supabase
      .from('listings')
      .update(validationResult.data)
      .eq('id', id)
      .select('*, book:books(*), seller:users(id, name, email, profile_picture, rating)')
      .single();

    if (updateError || !updatedListing) {
      return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 });
    }

    meiliUpdateListing(buildListingDoc(updatedListing)).catch((err: unknown) => console.error('Meilisearch sync failed:', err));

    return NextResponse.json({ success: true, data: updatedListing });
  } catch (error) {
    console.error('Error in PUT /api/listings/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid listing ID format' }, { status: 400 });
    }

    const authResult = await requireSeller(request);
    if (!authResult.success) return authResult.response;
    const { user } = authResult;

    const supabase = createServerClient() as any;
    const { data: existingListing, error: fetchError } = await supabase
      .from('listings').select('seller_id, status').eq('id', id).single();

    if (fetchError || !existingListing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    if (existingListing.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You do not own this listing' }, { status: 403 });
    }
    if (existingListing.status === 'sold') {
      return NextResponse.json({ error: 'Cannot delete sold listings' }, { status: 400 });
    }

    const { error: deleteError } = await supabase.from('listings').delete().eq('id', id);
    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete listing' }, { status: 500 });
    }

    meiliDeleteListing(id).catch((err: unknown) => console.error('Meilisearch remove failed:', err));

    return NextResponse.json({ success: true, message: 'Listing deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/listings/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
