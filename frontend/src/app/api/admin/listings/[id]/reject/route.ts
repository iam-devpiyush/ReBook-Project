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

    let body: { reason?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    if (!body.reason || body.reason.trim() === '') {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
    }
    if (body.reason.length > 500) {
      return NextResponse.json({ error: 'Rejection reason must be 500 characters or less' }, { status: 400 });
    }

    const supabase = createAdminClient() as any;

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

    const { data: updated, error: updateError } = await supabase
      .from('listings')
      .update({
        status: 'rejected',
        rejection_reason: body.reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', listingId)
      .select('*, book:books(*), seller:users!seller_id(id, name, email)')
      .single();

    if (updateError || !updated) {
      console.error('Failed to reject listing:', updateError);
      return NextResponse.json({ error: 'Failed to reject listing' }, { status: 500 });
    }

    try {
      await supabase.from('moderation_logs').insert({
        admin_id: user.id,
        action: 'reject_listing',
        target_type: 'listing',
        target_id: listingId,
        reason: body.reason.trim(),
      });
    } catch (e) {
      console.error('Moderation log failed:', e);
    }

    // Remove from Meilisearch index (non-fatal)
    try {
      const meili = getMeiliClient();
      await meili.index('listings').deleteDocument(listingId);
      console.info(`[reject] Removed listing ${listingId} from Meilisearch`);
    } catch (indexErr) {
      console.error('[reject] Meilisearch removal failed (non-fatal):', indexErr);
    }

    return NextResponse.json({ success: true, data: updated, message: 'Listing rejected successfully' });
  } catch (error) {
    console.error('Error in PUT /api/admin/listings/[id]/reject:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
