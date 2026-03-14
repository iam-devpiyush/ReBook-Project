/**
 * API Route: /api/payments/webhook
 *
 * POST: Handle dummy payment webhook events
 *
 * Requirements: 6.9, 6.10
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { verifyWebhookSignature } from '@/services/payment.service';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature') ?? '';

  try {
    verifyWebhookSignature(rawBody, signature);
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  let event: { event: string; payload: { payment: { entity: { id: string; order_id?: string; notes?: Record<string, string> } } } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const supabase = createServerClient();

  try {
    const eventType = event.event;
    const paymentEntity = event.payload?.payment?.entity;
    const paymentId = paymentEntity?.id;
    const orderId = paymentEntity?.notes?.orderId ?? paymentEntity?.order_id;

    if (eventType === 'payment.captured' && orderId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('orders')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', orderId);

      await supabase.channel(`order:${orderId}`).send({
        type: 'broadcast',
        event: 'payment.captured',
        payload: { orderId, status: 'paid' },
      });
    } else if (eventType === 'payment.failed' && orderId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('orders')
        .update({ status: 'payment_failed', updated_at: new Date().toISOString() })
        .eq('id', orderId);

      await supabase.channel(`order:${orderId}`).send({
        type: 'broadcast',
        event: 'payment.failed',
        payload: { orderId, status: 'payment_failed' },
      });
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Failed to process event' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
