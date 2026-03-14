/**
 * API Route: /api/payments/create-intent
 *
 * POST: Create a dummy payment intent and immediately confirm it.
 *
 * Requirements: 6.1, 6.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { createServerClient } from '@/lib/supabase/server';
import { createPaymentIntent } from '@/services/payment.service';
import { sanitizePaymentRecord, assertNoCardData } from '@/lib/security/encryption';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) return authResult.response;

    const { user } = authResult;
    const body = await request.json();
    const { order_id } = body;

    // Guard: never accept raw card data (Requirement 23.4)
    assertNoCardData(body);

    if (!order_id) {
      return NextResponse.json({ error: 'order_id is required' }, { status: 400 });
    }

    const supabase = createServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order, error: orderError } = await (supabase as any)
      .from('orders')
      .select('id, buyer_id, total_amount, currency, status')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const currency = (order.currency ?? 'INR').toUpperCase();
    const result = await createPaymentIntent(order_id, order.total_amount, currency);

    // Auto-confirm: update order and create payment record immediately
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('orders')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', order_id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('payments').insert(
      sanitizePaymentRecord({
        order_id,
        payment_intent_id: result.paymentIntentId,
        amount: order.total_amount,
        currency,
        status: 'completed',
        gateway: 'dummy',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        paymentIntentId: result.paymentIntentId,
        clientSecret: result.clientSecret,
        amount: order.total_amount,
        currency,
        status: 'completed',
      },
    });
  } catch (error) {
    console.error('Error in POST /api/payments/create-intent:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
