/**
 * GET /api/users/me/export
 *
 * GDPR data export — returns all personal data for the authenticated user.
 * Requirements: 24.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  ) as any;
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) return authResult.response;
    const { user } = authResult;

    const db = adminClient();

    // Collect all user data in parallel
    const [
      { data: profile },
      { data: listings },
      { data: orders },
      { data: reviews },
      { data: wishlist },
    ] = await Promise.all([
      db.from('users').select('*').eq('id', user.id).single(),
      db.from('listings').select('id, status, final_price, created_at').eq('seller_id', user.id),
      db.from('orders').select('id, status, price, created_at').or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`),
      db.from('reviews').select('id, rating, comment, created_at').eq('reviewer_id', user.id),
      db.from('wishlist').select('id, book_id, created_at').eq('user_id', user.id),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      user_id: user.id,
      profile: profile ?? {},
      listings: listings ?? [],
      orders: orders ?? [],
      reviews: reviews ?? [],
      wishlist: wishlist ?? [],
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="rebook-data-export-${user.id}.json"`,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/users/me/export:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
