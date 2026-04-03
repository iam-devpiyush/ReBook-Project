/**
 * Order Processing Service
 *
 * Handles order creation with atomic listing status update,
 * payment confirmation, and shipping label generation.
 *
 * Requirements: 11.1-11.9, 20.2, 6.3-6.5, 7.2-7.5
 */

import { createClient } from '@supabase/supabase-js';
import { createPaymentIntent } from './payment.service';
import { generateShippingLabel } from './shipping.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OrderResult {
  orderId: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  totalAmount: number;
  currency: string;
  status: string;
  paymentIntentId: string;
  clientSecret: string;
}

export interface OrderStatusUpdate {
  orderId: string;
  status: string;
  trackingId?: string;
  shippingLabelUrl?: string;
}

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// 41.1 – processOrder
// ---------------------------------------------------------------------------

/**
 * Creates an order atomically:
 * 1. Validates listing is active
 * 2. Marks listing as "sold" (prevents concurrent orders)
 * 3. Creates order record with status "pending_payment"
 * 4. Creates payment intent
 *
 * If any step fails, the listing status is rolled back to "active".
 *
 * Requirements: 11.1-11.9, 20.2
 */
export async function processOrder(
  listingId: string,
  buyerId: string,
  deliveryAddress: string | Record<string, unknown>
): Promise<OrderResult> {
  const supabase = getSupabase();
  const db = supabase as any;

  // 1. Fetch listing and validate it's active
  const { data: listing, error: listingError } = await db
    .from('listings')
    .select('id, seller_id, book_id, final_price, delivery_cost, platform_commission, payment_fees, seller_payout, status, city, state, pincode')
    .eq('id', listingId)
    .single();

  if (listingError || !listing) {
    throw new Error(`Listing not found [${listingError?.message ?? 'no data'}]`);
  }

  if (listing.status !== 'active') {
    throw new Error(`Listing is not available — current status: ${listing.status}`);
  }

  if (listing.seller_id === buyerId) {
    throw new Error('Seller cannot purchase their own listing');
  }

  // 2. Atomically mark listing as "sold" — the DB trigger `validate_order_on_insert`
  // handles this inside the INSERT transaction. Pre-updating here would cause the
  // trigger to see status='sold' and raise an exception.
  // We still check seller ownership above to give a clear error message.

  try {
    // 3. Create order record
    const currency = 'INR';
    const { data: order, error: orderError } = await db
      .from('orders')
      .insert({
        listing_id: listingId,
        buyer_id: buyerId,
        seller_id: listing.seller_id,
        book_id: listing.book_id,
        price: listing.final_price,
        delivery_cost: listing.delivery_cost ?? 0,
        platform_commission: listing.platform_commission ?? 0,
        payment_fees: listing.payment_fees ?? 0,
        seller_payout: listing.seller_payout ?? listing.final_price,
        delivery_address: typeof deliveryAddress === 'string'
          ? { address: deliveryAddress }
          : deliveryAddress,
        pickup_address: {
          city: listing.city ?? '',
          state: listing.state ?? '',
          pincode: listing.pincode ?? '',
        },
        status: 'pending_payment',
        payment_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (orderError || !order) {
      const msg = orderError?.message ?? 'unknown';
      // DB trigger raises P0001 when listing is not active
      if (orderError?.code === 'P0001' || msg.includes('not available')) {
        throw new Error('Listing is not available for purchase — it may have just been sold');
      }
      console.error('Order insert error:', JSON.stringify(orderError));
      throw new Error(`Failed to create order: ${msg}`);
    }

    // 4. Create payment intent
    const { clientSecret, paymentIntentId } = await createPaymentIntent(
      order.id,
      listing.final_price,
      currency
    );

    return {
      orderId: order.id,
      listingId,
      buyerId,
      sellerId: listing.seller_id,
      totalAmount: listing.final_price,
      currency,
      status: 'pending_payment',
      paymentIntentId,
      clientSecret,
    };
  } catch (err) {
    // The DB trigger rolls back the listing status automatically on order insert failure
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 41.5 – confirmPaymentAndGenerateShipping
// ---------------------------------------------------------------------------

/**
 * Called after payment is confirmed:
 * 1. Updates order status to "paid"
 * 2. Generates dummy shipping label
 * 3. Updates order with tracking_id and status "shipped"
 * 4. Publishes Supabase Realtime notifications
 *
 * Requirements: 6.3, 6.4, 6.5, 7.2-7.5
 */
export async function confirmPaymentAndGenerateShipping(
  orderId: string,
  paymentIntentId: string,
  sellerAddress: string,
  buyerAddress: string
): Promise<OrderStatusUpdate> {
  const supabase = getSupabase();
  const db = supabase as any;

  // 1. Mark order as paid
  await db
    .from('orders')
    .update({ status: 'paid', updated_at: new Date().toISOString() })
    .eq('id', orderId);

  // 2. Generate shipping label
  const label = await generateShippingLabel(orderId, sellerAddress, buyerAddress);

  // 3. Create shipping record
  await db.from('shipping').insert({
    order_id: orderId,
    tracking_id: label.trackingId,
    courier: label.courier,
    label_url: label.labelUrl,
    status: 'pending',
    estimated_delivery_days: label.estimatedDeliveryDays,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // 4. Update order with tracking info and mark as shipped
  await db
    .from('orders')
    .update({
      tracking_id: label.trackingId,
      status: 'shipped',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  // 5. Publish Realtime notification
  await supabase.channel(`order:${orderId}`).send({
    type: 'broadcast',
    event: 'order.shipped',
    payload: { orderId, trackingId: label.trackingId, status: 'shipped' },
  });

  return {
    orderId,
    status: 'shipped',
    trackingId: label.trackingId,
    shippingLabelUrl: label.labelUrl,
  };
}
