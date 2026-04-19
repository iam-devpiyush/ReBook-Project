export const dynamic = 'force-dynamic';
/**
 * API Route: /api/payments/webhook
 *
 * POST: Handle Razorpay webhook events.
 * Verifies HMAC-SHA256 signature before processing.
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
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  let event: {
    event: string;
    payload: {
      payment?: { entity: { id: string; order_id?: string; notes?: Record<string, string> } };
      refund?: { entity: { id: string; payment_id: string; amount: number; status: string } };
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const supabase = createServerClient();

  try {
    const eventType = event.event;

    if (eventType === 'payment.captured') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.notes?.orderId ?? paymentEntity?.order_id;

      if (orderId && paymentEntity) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('payments')
          .update({
            status: 'completed',
            payment_intent_id: paymentEntity.id,
            updated_at: new Date().toISOString(),
          })
          .eq('order_id', orderId);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('orders')
          .update({ status: 'paid', updated_at: new Date().toISOString() })
          .eq('id', orderId);

        await supabase.channel(`order:${orderId}`).send({
          type: 'broadcast',
          event: 'payment.captured',
          payload: { orderId, status: 'paid', paymentId: paymentEntity.id },
        });
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.notes?.orderId ?? paymentEntity?.order_id;

      if (orderId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('payments')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('order_id', orderId);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('orders')
          .update({ status: 'payment_failed', updated_at: new Date().toISOString() })
          .eq('id', orderId);

        // Restore listing to active so it can be purchased again
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: order } = await (supabase as any)
          .from('orders')
          .select('listing_id')
          .eq('id', orderId)
          .single();

        if (order?.listing_id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('listings')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', order.listing_id)
            .eq('status', 'sold'); // only restore if it was marked sold (not already active/rejected)

          // Re-sync to Meilisearch so it appears in search again
          const { syncListingToMeili } = await import('@/lib/meilisearch/sync');
          syncListingToMeili(order.listing_id).catch((err: unknown) =>
            console.error('[webhook] Meilisearch re-sync failed after payment failure:', err)
          );
        }

        await supabase.channel(`order:${orderId}`).send({
          type: 'broadcast',
          event: 'payment.failed',
          payload: { orderId, status: 'payment_failed' },
        });
      }
    } else if (eventType === 'refund.processed') {
      const refundEntity = event.payload?.refund?.entity;
      if (refundEntity) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('payments')
          .update({
            status: 'refunded',
            refund_id: refundEntity.id,
            refund_amount: refundEntity.amount / 100,
            updated_at: new Date().toISOString(),
          })
          .eq('payment_intent_id', refundEntity.payment_id);
      }
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Failed to process event' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
