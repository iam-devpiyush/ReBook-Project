export const dynamic = 'force-dynamic';
/**
 * POST /api/admin/search/reindex
 * Wipes Meilisearch listings index and resyncs from Supabase.
 * Requires admin auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { MeiliSearch } from 'meilisearch';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth/middleware';
import { buildListingDoc } from '@/lib/meilisearch/sync';

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const meili = new MeiliSearch({
    host: process.env.MEILISEARCH_HOST!,
    apiKey: process.env.MEILISEARCH_ADMIN_API_KEY || process.env.MEILISEARCH_API_KEY!,
  });

  try {
    // Fetch all active listings
    const { data: listings, error } = await supabase
      .from('listings')
      .select(`
        id, seller_id, status, condition_score, final_price, original_price,
        delivery_cost, images, created_at, updated_at, book_id,
        book:books(id, isbn, title, author, publisher, subject, description, category_id),
        seller:users(id, city, state, pincode, latitude, longitude)
      `)
      .eq('status', 'active');

    if (error) throw error;

    const index = meili.index('listings');

    // Wipe and reinsert
    await index.deleteAllDocuments();
    const docs = (listings ?? []).map(buildListingDoc);
    if (docs.length > 0) await index.addDocuments(docs);

    return NextResponse.json({ success: true, indexed: docs.length });
  } catch (err: any) {
    console.error('Reindex failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
