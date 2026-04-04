export const dynamic = 'force-dynamic';
/**
 * API Route: /api/payments/[id]/refund
 *
 * POST: Process a refund for a payment (admin only)
 *
 * Requirements: 6.7, 6.8, 9.9
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { createServerClient } from '@/lib/supabase/server';
import { processRefund } from '@/services/payment.service';

/**
 * POST /api/payments/[id]/refund
 *
 * Processes a full or partial refund for a Razorpay payment.
 * - Requires admin authentication
 * - [id] is the Razorpay payment ID
 * - Validates amount if provided (must be positive number)
 * - Calls processRefund from payment service
 * - Logs action to moderation_logs table
 * - Returns { success: true, data: refundResult }
 *
 * Request body:
 * - amount?: Amount to refund in smallest currency unit (optional, omit for full refund)
 * - reason?: Reason for the refund (optional)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require admin authentication
    const authResult = await requireAdmin(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user: admin } = authResult;
    const razorpayPaymentId = params.id;

    if (!razorpayPaymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    // Parse request body
    let amount: number | undefined;
    let reason: string | undefined;
    try {
      const body = await request.json();
      if (body.amount !== undefined) {
        amount = body.amount;
      }
      if (body.reason !== undefined) {
        reason = body.reason;
      }
    } catch {
      // Body is optional — ignore parse errors
    }

    // Validate amount if provided
    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json(
          { error: 'amount must be a positive number' },
          { status: 400 }
        );
      }
    }

    // Process refund via payment service
    const refundResult = await processRefund(razorpayPaymentId, amount);

    // Log to moderation_logs table
    const supabase = createServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: logError } = await (supabase as any)
      .from('moderation_logs')
      .insert({
        admin_id: admin.id,
        action: 'process_refund',
        target_type: 'payment',
        target_id: razorpayPaymentId,
        reason: reason ?? null,
        notes: amount !== undefined ? `Partial refund: ${amount}` : 'Full refund',
        created_at: new Date().toISOString(),
      });

    if (logError) {
      console.error('Failed to create moderation log:', logError);
      // Don't fail the entire operation if logging fails
    }

    return NextResponse.json({
      success: true,
      data: refundResult,
    });
  } catch (error) {
    console.error('Error in POST /api/payments/[id]/refund:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
