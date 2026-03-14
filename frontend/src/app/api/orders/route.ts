/**
 * API Route: /api/orders
 *
 * POST: Create a new order
 * GET:  List orders for the authenticated user
 *
 * Requirements: 11.1-11.9
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { createServerClient } from '@/lib/supabase/server';
import { processOrder } from '@/services/order.service';

// ---------------------------------------------------------------------------
// POST /api/orders — create order
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) return authResult.response;

    const { user } = authResult;
    const body = await request.json();
    const { listing_id, delivery_address } = body;

    if (!listing_id) {
      return NextResponse.json({ error: 'listing_id is required' }, { status: 400 });
    }
    if (!delivery_address || typeof delivery_address !== 'string' || !delivery_address.trim()) {
      return NextResponse.json({ error: 'delivery_address is required' }, { status: 400 });
    }

    try {
      const order = await processOrder(listing_id, user.id, delivery_address.trim());
      return NextResponse.json({ success: true, data: order }, { status: 201 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create order';

      // Listing not available → 409 Conflict
      if (msg.includes('not available') || msg.includes('not active') || msg.includes('someone else')) {
        return NextResponse.json({ error: msg }, { status: 409 });
      }
      if (msg.includes('not found')) {
        return NextResponse.json({ error: msg }, { status: 404 });
      }
      if (msg.includes('Seller cannot')) {
        return NextResponse.json({ error: msg }, { status: 403 });
      }
      throw err;
    }
  } catch (error) {
    console.error('Error in POST /api/orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// GET /api/orders — list orders for authenticated user
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) return authResult.response;

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));
    const offset = (page - 1) * pageSize;

    const supabase = createServerClient();
    const db = supabase as any;

    // Fetch as buyer OR seller
    let query = db
      .from('orders')
      .select(
        `id, listing_id, buyer_id, seller_id, total_amount, currency, status,
         delivery_address, tracking_id, created_at, updated_at,
         listings(id, books(title, author), images)`,
        { count: 'exact' }
      )
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (status) query = query.eq('status', status);

    const { data: orders, error, count } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: orders ?? [],
      pagination: {
        page,
        pageSize,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
