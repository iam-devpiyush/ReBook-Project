/**
 * Dummy Payment Gateway Service
 *
 * Simulates payment processing without any real gateway.
 * All payments are auto-confirmed. Safe for development/demo use.
 *
 * Requirements: 6.1-6.10
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
}

export interface PaymentVerification {
  verified: boolean;
  status: string;
  paymentIntentId: string;
}

export interface RefundResult {
  refundId: string;
  amount: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not set');
  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// Webhook signature (dummy — always valid in dev)
// ---------------------------------------------------------------------------

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  // In dummy mode, accept any non-empty signature
  if (!signature) throw new Error('Missing webhook signature');
  return true;
}

// ---------------------------------------------------------------------------
// Create payment intent (dummy — returns a fake order ID instantly)
// ---------------------------------------------------------------------------

export async function createPaymentIntent(
  orderId: string,
  amount: number,
  currency = 'INR'
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const paymentIntentId = generateId('dummy_order');
  return {
    clientSecret: paymentIntentId,
    paymentIntentId,
  };
}

// ---------------------------------------------------------------------------
// Verify payment (dummy — always returns verified)
// ---------------------------------------------------------------------------

export function verifyPayment(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): PaymentVerification {
  return {
    verified: true,
    status: 'completed',
    paymentIntentId: razorpayPaymentId,
  };
}

// ---------------------------------------------------------------------------
// Process refund (dummy — marks as refunded in Supabase)
// ---------------------------------------------------------------------------

export async function processRefund(
  paymentId: string,
  amount?: number
): Promise<RefundResult> {
  const refundId = generateId('dummy_refund');

  const supabase = getSupabase();
  await (supabase as any)
    .from('payments')
    .update({
      status: 'refunded',
      refund_id: refundId,
      refund_amount: amount ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('payment_intent_id', paymentId);

  return {
    refundId,
    amount: amount ?? 0,
    status: 'processed',
  };
}

/** No-op — kept for test compatibility */
export function _resetRazorpayClient(): void {}
