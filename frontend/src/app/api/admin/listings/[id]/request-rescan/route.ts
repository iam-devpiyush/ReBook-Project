import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { createClient } from '@supabase/supabase-js';

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
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

    let body: { notes?: string } = {};
    try {
      const ct = request.headers.get('content-type');
      if (ct?.includes('application/json')) body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    if (body.notes && body.notes.length > 500) {
      return NextResponse.json({ error: 'Notes must be 500 characters or less' }, { status: 400 });
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
        status: 'rescan_required',
        rejection_reason: body.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', listingId)
      .select('*, book:books(*), seller:users!seller_id(id, name, email)')
      .single();

    if (updateError || !updated) {
      console.error('Failed to request rescan:', updateError);
      return NextResponse.json({ error: 'Failed to request rescan' }, { status: 500 });
    }

    try {
      await supabase.from('moderation_logs').insert({
        admin_id: user.id,
        action: 'request_rescan',
        target_type: 'listing',
        target_id: listingId,
        notes: body.notes?.trim() || null,
      });
    } catch (e) {
      console.error('Moderation log failed:', e);
    }

    return NextResponse.json({ success: true, data: updated, message: 'Rescan requested successfully' });
  } catch (error) {
    console.error('Error in PUT /api/admin/listings/[id]/request-rescan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
