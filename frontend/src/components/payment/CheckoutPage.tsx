/**
 * CheckoutPage Component
 *
 * Dummy payment flow — confirms order immediately on "Pay Now" click.
 * No external payment gateway required.
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
}

interface CheckoutPageProps {
  order: OrderSummary;
  userEmail?: string;
  userName?: string;
  onSuccess?: (paymentId: string) => void;
  onFailure?: (error: string) => void;
}

type PaymentState = 'idle' | 'processing' | 'success' | 'failed';

export default function CheckoutPage({
  order,
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
      const res = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.orderId }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? 'Payment failed');
      }

      const pid = json.data.paymentIntentId;
      setPaymentId(pid);
      setPaymentState('success');
      onSuccess?.(pid);
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

      {/* Demo notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
        Demo mode — clicking "Pay Now" will instantly confirm your order.
      </div>

      {/* Error */}
      {errorMessage && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          {errorMessage}
        </div>
      )}

      <button
        onClick={handlePayment}
        disabled={paymentState === 'processing'}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        aria-busy={paymentState === 'processing'}
      >
        {paymentState === 'processing' ? 'Processing...' : `Pay ₹${order.pricing.final_price.toFixed(2)}`}
      </button>

      <p className="text-xs text-center text-gray-500">
        Demo payment — no real money is charged.
      </p>
    </div>
  );
}
