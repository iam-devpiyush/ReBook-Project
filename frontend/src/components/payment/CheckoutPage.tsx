/**
 * CheckoutPage Component
 *
 * Opens the Razorpay Checkout modal for payment.
 * After success, verifies the signature server-side via /api/payments/verify.
 *
 * Requirements: 6.1-6.6
 */

'use client';

import { useState } from 'react';
import PricingBreakdownDisplay from '@/components/listings/PricingBreakdownDisplay';
import PaymentStatusDisplay from './PaymentStatusDisplay';
import { PricingBreakdown } from '@/types/pricing';

export interface OrderSummary {
  orderId: string;
  bookTitle: string;
  bookAuthor: string;
  bookImage?: string;
  sellerName: string;
  pricing: PricingBreakdown;
  // Pre-created Razorpay order data (from /api/orders response)
  razorpayOrderId?: string;
  razorpayAmount?: number;
}

interface CheckoutPageProps {
  order: OrderSummary;
  userEmail?: string;
  userName?: string;
  onSuccess?: (paymentId: string) => void;
  onFailure?: (error: string) => void;
}

type PaymentState = 'idle' | 'processing' | 'success' | 'failed';

// Razorpay is loaded via script tag — declare the global
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay script'));
    document.body.appendChild(script);
  });
}

export default function CheckoutPage({
  order,
  userEmail,
  userName,
  onSuccess,
  onFailure,
}: CheckoutPageProps) {
  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePayment = async () => {
    setPaymentState('processing');
    setErrorMessage(null);

    try {
      let razorpayOrderId: string;
      let amount: number;
      let currency = 'INR';
      let keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      if (order.razorpayOrderId) {
        // Use pre-created Razorpay order from /api/orders response
        razorpayOrderId = order.razorpayOrderId;
        amount = order.razorpayAmount ?? order.pricing.final_price;
      } else {
        // Fallback: create Razorpay order now
        const intentRes = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: order.orderId }),
        });
        const intentJson = await intentRes.json();
        if (!intentRes.ok) throw new Error(intentJson.error ?? 'Failed to create payment');
        razorpayOrderId = intentJson.data.razorpayOrderId;
        amount = intentJson.data.amount;
        currency = intentJson.data.currency ?? 'INR';
        keyId = intentJson.data.keyId ?? keyId;
      }

      // Load Razorpay checkout script
      await loadRazorpayScript();

      // Open Razorpay modal
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: keyId ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          order_id: razorpayOrderId,
          amount: Math.round(amount * 100), // paise
          currency: currency ?? 'INR',
          name: 'Rebook Marketplace',
          description: `${order.bookTitle} by ${order.bookAuthor}`,
          image: order.bookImage,
          prefill: {
            name: userName ?? '',
            email: userEmail ?? '',
          },
          notes: { orderId: order.orderId },
          theme: { color: '#2563EB' },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              // Verify signature server-side
              const verifyRes = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  order_id: order.orderId,
                }),
              });
              const verifyJson = await verifyRes.json();
              if (!verifyRes.ok) throw new Error(verifyJson.error ?? 'Payment verification failed');

              setPaymentId(response.razorpay_payment_id);
              setPaymentState('success');
              onSuccess?.(response.razorpay_payment_id);
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => {
              // User closed the modal without paying
              reject(new Error('Payment cancelled'));
            },
          },
        });

        rzp.on('payment.failed', (response: { error: { description: string } }) => {
          reject(new Error(response.error?.description ?? 'Payment failed'));
        });

        rzp.open();
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment failed';
      setErrorMessage(msg);
      setPaymentState('failed');
      onFailure?.(msg);
    }
  };

  if (paymentState === 'success' && paymentId) {
    return (
      <PaymentStatusDisplay
        status="completed"
        paymentId={paymentId}
        amount={order.pricing.final_price}
        currency="INR"
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>

      {/* Order Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Order Summary</h2>
        <div className="flex gap-4">
          {order.bookImage && (
            <img
              src={order.bookImage}
              alt={order.bookTitle}
              className="w-20 h-28 object-cover rounded"
            />
          )}
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{order.bookTitle}</p>
            <p className="text-sm text-gray-600">by {order.bookAuthor}</p>
            <p className="text-sm text-gray-500 mt-1">Seller: {order.sellerName}</p>
          </div>
        </div>
      </div>

      {/* Pricing Breakdown */}
      <PricingBreakdownDisplay pricing={order.pricing} variant="default" />

      {/* Error */}
      {errorMessage && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          {errorMessage}
          {errorMessage === 'Payment cancelled' && (
            <button
              onClick={() => { setPaymentState('idle'); setErrorMessage(null); }}
              className="ml-2 underline"
            >
              Try again
            </button>
          )}
        </div>
      )}

      <button
        onClick={handlePayment}
        disabled={paymentState === 'processing'}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        aria-busy={paymentState === 'processing'}
      >
        {paymentState === 'processing' ? 'Opening payment...' : `Pay ₹${order.pricing.final_price.toFixed(2)}`}
      </button>

      <p className="text-xs text-center text-gray-500">
        Secured by Razorpay · UPI, Cards, Net Banking, Wallets accepted
      </p>
    </div>
  );
}
