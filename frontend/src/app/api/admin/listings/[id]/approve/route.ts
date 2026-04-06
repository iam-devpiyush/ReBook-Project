export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { createClient } from '@supabase/supabase-js';
import { MeiliSearch } from 'meilisearch';

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getMeiliClient() {
  return new MeiliSearch({
    host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
    apiKey: process.env.MEILISEARCH_ADMIN_API_KEY || process.env.MEILISEARCH_API_KEY || '',
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdmin(request);
    if (!authResult.success) return authResult.response;

    const { user } = authResult;
    const listingId = params.id;

    if (!listingId) {
      return NextResponse.json({ error: 'Listing ID is required' }, { status: 400 });
    }

    const supabase = createAdminClient() as any;

    // Verify listing exists and is pending
    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('id, status')
      .eq('id', listingId)
      .single();

    if (fetchError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.status !== 'pending_approval' && listing.status !== 'rescan_required') {
      return NextResponse.json(
        { error: `Listing status must be pending_approval or rescan_required, current: ${listing.status}` },
        { status: 400 }
      );
    }

    // Approve: set status to active
    const { data: updated, error: updateError } = await supabase
      .from('listings')
      .update({
        status: 'active',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', listingId)
      .select(`
        *,
        book:books(id, title, author, isbn, publisher, subject, description, category_id),
        seller:users!listings_seller_id_fkey(id, name, email, city, state, pincode, latitude, longitude)
      `)
      .single();

    if (updateError || !updated) {
      console.error('Failed to approve listing:', updateError);
      return NextResponse.json({ error: 'Failed to approve listing' }, { status: 500 });
    }

    // Log moderation action (non-fatal)
    try {
      await supabase.from('moderation_logs').insert({
        admin_id: user.id,
        action: 'approve_listing',
        target_type: 'listing',
        target_id: listingId,
      });
    } catch (e) {
      console.error('Moderation log failed:', e);
    }

    // Sync to Meilisearch — retry once on failure
    const meiliDoc = {
      id: updated.id,
      book_id: updated.book_id,
      seller_id: updated.seller_id,
      title: updated.book?.title ?? '',
      author: updated.book?.author ?? '',
      subject: updated.book?.subject ?? null,
      isbn: updated.book?.isbn ?? null,
      publisher: updated.book?.publisher ?? null,
      description: updated.book?.description ?? null,
      status: 'active',
      category_id: updated.book?.category_id ?? '',
      condition_score: updated.condition_score,
      final_price: updated.final_price,
      original_price: updated.original_price,
      delivery_cost: updated.delivery_cost,
      images: updated.images ?? [],
      location: {
        city: updated.seller?.city ?? updated.city ?? '',
        state: updated.seller?.state ?? updated.state ?? '',
        pincode: updated.seller?.pincode ?? updated.pincode ?? '',
        latitude: updated.seller?.latitude ?? updated.latitude ?? null,
        longitude: updated.seller?.longitude ?? updated.longitude ?? null,
      },
      created_at: updated.created_at ? Math.floor(new Date(updated.created_at).getTime() / 1000) : 0,
      updated_at: updated.updated_at ? Math.floor(new Date(updated.updated_at).getTime() / 1000) : 0,
    };

    let meiliSynced = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const meili = getMeiliClient();
        await meili.index('listings').addDocuments([meiliDoc]);
        console.info(`[approve] Meilisearch sync OK for listing ${listingId} (attempt ${attempt})`);
        meiliSynced = true;
        break;
      } catch (indexErr) {
        console.error(`[approve] Meilisearch sync attempt ${attempt} failed:`, indexErr);
        if (attempt < 3) await new Promise(r => setTimeout(r, 500 * attempt));
      }
    }
    if (!meiliSynced) {
      console.error(`[approve] Meilisearch sync FAILED after 3 attempts for listing ${listingId} — listing is active in DB but won't appear in search until next reindex`);
    }

    return NextResponse.json({ success: true, data: updated, message: 'Listing approved successfully' });
  } catch (error) {
    console.error('Error in PUT /api/admin/listings/[id]/approve:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
