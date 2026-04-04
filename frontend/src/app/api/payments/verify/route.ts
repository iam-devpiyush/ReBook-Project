export const dynamic = 'force-dynamic';
/**
 * API Route: /api/payments/verify
 *
 * POST: Verify Razorpay payment signature after checkout completes.
 * Called by the frontend after the Razorpay modal closes with success.
 *
 * Requirements: 6.3, 6.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { createServerClient } from '@/lib/supabase/server';
import { verifyPayment } from '@/services/payment.service';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) return authResult.response;

    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !order_id) {
      return NextResponse.json(
        { error: 'razorpay_order_id, razorpay_payment_id, razorpay_signature, and order_id are required' },
        { status: 400 }
      );
    }

    const result = verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!result.verified) {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Update payment record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('payments')
      .update({
        status: 'completed',
        payment_intent_id: razorpay_payment_id,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', order_id);

    // Update order status to paid
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('orders')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', order_id);

    // Notify via Supabase Realtime
    await supabase.channel(`order:${order_id}`).send({
      type: 'broadcast',
      event: 'payment.captured',
      payload: { orderId: order_id, status: 'paid', paymentId: razorpay_payment_id },
    });

    return NextResponse.json({
      success: true,
      data: { paymentId: razorpay_payment_id, status: 'completed' },
    });
  } catch (error) {
    console.error('Error in POST /api/payments/verify:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
