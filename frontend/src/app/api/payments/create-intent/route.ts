/**
 * API Route: /api/payments/create-intent
 *
 * POST: Create a Razorpay order and return the order ID + key for the frontend checkout.
 *
 * Requirements: 6.1, 6.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { createClient } from '@supabase/supabase-js';
import { createPaymentIntent } from '@/services/payment.service';
import { assertNoCardData } from '@/lib/security/encryption';

// Use admin client to bypass RLS — auth check is done via requireAuth
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  ) as any;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) return authResult.response;

    const { user } = authResult;
    const body = await request.json();
    const { order_id } = body;

    assertNoCardData(body);

    if (!order_id) {
      return NextResponse.json({ error: 'order_id is required' }, { status: 400 });
    }

    const db = adminClient();

    // Fetch order — use admin client so RLS doesn't block
    const { data: order, error: orderError } = await db
      .from('orders')
      .select('id, buyer_id, price, status')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      console.error('Order fetch error:', JSON.stringify(orderError), 'order_id:', order_id);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const amount = order.price;
    const currency = 'INR';

    // Create Razorpay order
    const result = await createPaymentIntent(order_id, amount, currency);

    // Upsert payment record with correct column names
    await db.from('payments').upsert({
      order_id,
      payment_intent_id: result.paymentIntentId,
      amount,
      currency,
      status: 'pending',
      payment_gateway: 'razorpay',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'payment_intent_id' });

    return NextResponse.json({
      success: true,
      data: {
        razorpayOrderId: result.paymentIntentId,
        clientSecret: result.clientSecret,
        amount,
        currency,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/payments/create-intent:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
