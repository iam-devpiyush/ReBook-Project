/**
 * API Route: /api/orders/[id]
 *
 * GET: Fetch a single order (buyer or seller only)
 *
 * Requirements: Order detail view
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) return authResult.response;

    const { user } = authResult;
    const { id } = params;

    const supabase = createServerClient();
    const db = supabase as any;

    const { data: order, error } = await db
      .from('orders')
      .select(
        `id, listing_id, buyer_id, seller_id, total_amount, currency, status,
         delivery_address, tracking_id, created_at, updated_at,
         listings(id, books(title, author, isbn, cover_image), images, condition_score, final_price),
         payments(id, payment_intent_id, amount, status, gateway, created_at)`
      )
      .eq('id', id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Only buyer or seller can view
    if (order.buyer_id !== user.id && order.seller_id !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error('Error in GET /api/orders/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
