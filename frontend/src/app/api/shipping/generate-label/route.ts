export const dynamic = 'force-dynamic';
/**
 * API Route: /api/shipping/generate-label
 *
 * POST: Generate a Shiprocket shipping label for a paid order.
 *
 * Requirements: 7.2, 7.3, 7.4, 7.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { createServerClient } from '@/lib/supabase/server';
import { generateShippingLabel } from '@/services/shipping.service';
import type { Address } from '@/services/shipping.service';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) return authResult.response;

    const { user } = authResult;
    const body = await request.json();
    const { order_id } = body;

    if (!order_id) {
      return NextResponse.json({ error: 'order_id is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Fetch order with book and seller details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order, error: orderError } = await (supabase as any)
      .from('orders')
      .select(`
        id, buyer_id, seller_id, status, total_amount,
        delivery_address,
        listings (
          id,
          books ( title ),
          users ( name, phone, city, state, pincode, address )
        )
      `)
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Only buyer or seller can generate label
    if (order.buyer_id !== user.id && order.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Order must be paid before generating label (Requirement 7.5)
    if (order.status !== 'paid') {
      return NextResponse.json(
        { error: 'Shipping label can only be generated for paid orders' },
        { status: 400 }
      );
    }

    const deliveryAddr = order.delivery_address as Address;
    const seller = order.listings?.users;
    const bookTitle = order.listings?.books?.title ?? 'Book';

    const pickupAddr: Address = {
      name: seller?.name ?? 'Seller',
      phone: seller?.phone ?? '9800000000',
      address_line1: seller?.address ?? 'Seller Address',
      city: seller?.city ?? 'Mumbai',
      state: seller?.state ?? 'Maharashtra',
      pincode: seller?.pincode ?? '400001',
    };

    const label = await generateShippingLabel(
      order_id,
      pickupAddr,
      deliveryAddr,
      bookTitle
    );

    // Create shipping record in Supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('shipping').upsert({
      order_id,
      tracking_id: label.trackingId,
      courier: label.courier,
      label_url: label.labelUrl,
      status: 'pending',
      estimated_delivery_days: label.estimatedDeliveryDays,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'order_id' });

    // Update order with tracking ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('orders')
      .update({ tracking_id: label.trackingId, updated_at: new Date().toISOString() })
      .eq('id', order_id);

    return NextResponse.json({ success: true, data: label });
  } catch (error) {
    console.error('Error in POST /api/shipping/generate-label:', error);
    return NextResponse.json({ error: 'Failed to generate shipping label' }, { status: 500 });
  }
}
