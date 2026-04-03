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
import { processOrder } from '@/services/order.service';
import { applyRateLimit, ORDER_RATE_LIMIT } from '@/lib/rate-limit';

// ---------------------------------------------------------------------------
// POST /api/orders — create order
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) return authResult.response;

    const { user } = authResult;

    // Rate limit: 20 orders per hour per user (Requirement 18.3)
    const rateLimitResponse = applyRateLimit(request, `order-create:${user.id}`, ORDER_RATE_LIMIT);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const { listing_id, delivery_address } = body;

    if (!listing_id) {
      return NextResponse.json({ error: 'listing_id is required' }, { status: 400 });
    }
    if (!delivery_address) {
      return NextResponse.json({ error: 'delivery_address is required' }, { status: 400 });
    }

    // Accept delivery_address as either a string or an object
    const normalizedAddress =
      typeof delivery_address === 'string'
        ? delivery_address.trim()
        : delivery_address;

    try {
      const result = await processOrder(listing_id, user.id, normalizedAddress);
      // Map OrderResult fields to a flat order object the frontend expects
      return NextResponse.json({
        success: true,
        data: {
          id: result.orderId,
          listing_id: result.listingId,
          buyer_id: result.buyerId,
          seller_id: result.sellerId,
          total_amount: result.totalAmount,
          price: result.totalAmount,
          currency: result.currency,
          status: result.status,
          payment_intent_id: result.paymentIntentId,
          client_secret: result.clientSecret,
        }
      }, { status: 201 });
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

    // Use service role to bypass RLS — query is already scoped to buyer_id/seller_id
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase
      .from('orders')
      .select(
        `id, listing_id, buyer_id, seller_id, book_id,
         price, delivery_cost, platform_commission, payment_fees, seller_payout,
         status, payment_status, tracking_id, delivery_address,
         created_at, updated_at, paid_at, shipped_at, delivered_at,
         listing:listings(id, images, book:books(id, title, author, isbn))`,
        { count: 'exact' }
      )
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (status) query = query.eq('status', status);

    const { data: orders, error, count } = await query;

    if (error) {
      console.error('Error fetching orders:', JSON.stringify(error));
      return NextResponse.json({ error: `Failed to fetch orders: ${error.message}` }, { status: 500 });
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
