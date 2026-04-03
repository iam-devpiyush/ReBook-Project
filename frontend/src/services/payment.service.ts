/**
 * Razorpay Payment Gateway Service
 *
 * Wraps the Razorpay Node.js SDK for server-side payment operations.
 * Requirements: 6.1-6.10
 */

import Razorpay from 'razorpay';
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
// Razorpay client (lazy singleton)
// ---------------------------------------------------------------------------

let _razorpay: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!_razorpay) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set');
    }
    _razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return _razorpay;
}

/** Reset client (used in tests) */
export function _resetRazorpayClient(): void {
  _razorpay = null;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not set');
  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// Webhook signature verification (Requirement 6.9)
// ---------------------------------------------------------------------------

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error('RAZORPAY_WEBHOOK_SECRET is not set');
  if (!signature) throw new Error('Missing webhook signature');

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  if (expected !== signature) {
    throw new Error('Webhook signature mismatch');
  }
  return true;
}

// ---------------------------------------------------------------------------
// Create Razorpay order (Requirement 6.1, 6.2)
// ---------------------------------------------------------------------------

export async function createPaymentIntent(
  orderId: string,
  amount: number,
  currency = 'INR'
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const razorpay = getRazorpay();

  // Razorpay amounts are in smallest currency unit (paise for INR)
  const amountInPaise = Math.round(amount * 100);

  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: currency.toUpperCase(),
    receipt: `order_${orderId.slice(0, 20)}`,
    notes: { orderId },
  });

  return {
    // clientSecret doubles as the Razorpay order ID for the frontend checkout
    clientSecret: order.id,
    paymentIntentId: order.id,
  };
}

// ---------------------------------------------------------------------------
// Verify payment signature (Requirement 6.3, 6.4)
// ---------------------------------------------------------------------------

export function verifyPayment(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): PaymentVerification {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) throw new Error('RAZORPAY_KEY_SECRET is not set');

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(body)
    .digest('hex');

  const verified = expected === razorpaySignature;
  return {
    verified,
    status: verified ? 'completed' : 'failed',
    paymentIntentId: razorpayPaymentId,
  };
}

// ---------------------------------------------------------------------------
// Process refund (Requirement 6.7, 6.8)
// ---------------------------------------------------------------------------

export async function processRefund(
  paymentId: string,
  amount?: number
): Promise<RefundResult> {
  const razorpay = getRazorpay();

  const refundOptions: { amount?: number; speed?: string } = { speed: 'normal' };
  if (amount !== undefined) {
    refundOptions.amount = Math.round(amount * 100); // convert to paise
  }

  const refund = await razorpay.payments.refund(paymentId, refundOptions);

  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('payments')
    .update({
      status: 'refunded',
      refund_id: refund.id,
      refund_amount: amount ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('payment_intent_id', paymentId);

  return {
    refundId: refund.id,
    amount: (refund.amount ?? 0) / 100, // convert back from paise
    status: refund.status ?? 'processed',
  };
}
