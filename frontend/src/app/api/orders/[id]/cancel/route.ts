/**
 * API Route: /api/orders/[id]/cancel
 *
 * PUT: Cancel an order (buyer or seller)
 *
 * Requirements: Order cancellation
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { createServerClient } from '@/lib/supabase/server';
import { processRefund } from '@/services/payment.service';

const CANCELLABLE_STATUSES = ['pending_payment', 'paid'];

export async function PUT(
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

    // Fetch order
    const { data: order, error } = await db
      .from('orders')
      .select('id, buyer_id, seller_id, status, listing_id, total_amount')
      .eq('id', id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Only buyer or seller can cancel
    if (order.buyer_id !== user.id && order.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot cancel order with status: ${order.status}` },
        { status: 400 }
      );
    }

    // Update order to cancelled
    await db
      .from('orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id);

    // Restore listing to active if not yet shipped
    if (order.status !== 'shipped') {
      await db
        .from('listings')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', order.listing_id);
    }

    // Process refund if payment was completed
    if (order.status === 'paid') {
      const { data: payment } = await db
        .from('payments')
        .select('payment_intent_id')
        .eq('order_id', id)
        .eq('status', 'completed')
        .single();

      if (payment?.payment_intent_id) {
        try {
          await processRefund(payment.payment_intent_id);
        } catch (refundErr) {
          console.error('Refund failed during cancellation:', refundErr);
          // Don't fail the cancellation if refund fails
        }
      }
    }

    return NextResponse.json({ success: true, data: { orderId: id, status: 'cancelled' } });
  } catch (error) {
    console.error('Error in PUT /api/orders/[id]/cancel:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
