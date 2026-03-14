/**
 * OrderPage Component
 *
 * Displays full order details: book info, pricing breakdown, delivery address,
 * payment status, tracking information, and cancel action.
 *
 * Requirements: Order management
 */

'use client';

import { useState, useEffect } from 'react';
import PaymentStatusDisplay, { PaymentStatus } from '@/components/payment/PaymentStatusDisplay';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderBook {
  title: string;
  author: string;
  isbn?: string | null;
  cover_image?: string | null;
}

interface OrderListing {
  id: string;
  books: OrderBook;
  images: string[];
  condition_score: number;
  final_price: number;
}

interface OrderPayment {
  id: string;
  payment_intent_id: string;
  amount: number;
  status: PaymentStatus;
  gateway: string;
  created_at: string;
}

export interface Order {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  total_amount: number;
  currency: string;
  status: string;
  delivery_address: string;
  tracking_id?: string | null;
  created_at: string;
  updated_at: string;
  listings?: OrderListing | null;
  payments?: OrderPayment[] | null;
}

interface OrderPageProps {
  orderId: string;
  currentUserId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending_payment: { label: 'Pending Payment', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  paid:            { label: 'Paid',            color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  shipped:         { label: 'Shipped',         color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  delivered:       { label: 'Delivered',       color: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
  cancelled:       { label: 'Cancelled',       color: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
};

const CONDITION_LABELS: Record<number, string> = {
  5: 'Like New',
  4: 'Very Good',
  3: 'Good',
  2: 'Acceptable',
  1: 'Poor',
};

const CONDITION_COLORS: Record<number, string> = {
  5: 'bg-green-100 text-green-800',
  4: 'bg-lime-100 text-lime-800',
  3: 'bg-yellow-100 text-yellow-800',
  2: 'bg-orange-100 text-orange-800',
  1: 'bg-red-100 text-red-800',
};

const CANCELLABLE_STATUSES = ['pending_payment', 'paid'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OrderPage({ orderId, currentUserId }: OrderPageProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  async function fetchOrder() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load order');
      setOrder(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!order || !confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, { method: 'PUT' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to cancel order');
      setOrder(prev => prev ? { ...prev, status: 'cancelled' } : prev);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  }

  // --- Loading ---
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-40 bg-gray-200 rounded" />
        <div className="h-32 bg-gray-200 rounded" />
      </div>
    );
  }

  // --- Error ---
  if (error || !order) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {error ?? 'Order not found'}
        </div>
      </div>
    );
  }

  const statusConfig = ORDER_STATUS_CONFIG[order.status] ?? {
    label: order.status,
    color: 'text-gray-700',
    bg: 'bg-gray-50 border-gray-200',
  };

  const book = order.listings?.books;
  const listing = order.listings;
  const payment = order.payments?.[0];
  const canCancel = CANCELLABLE_STATUSES.includes(order.status) &&
    (order.buyer_id === currentUserId || order.seller_id === currentUserId);

  const coverImage = listing?.images?.[0] ?? book?.cover_image ?? null;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
          <p className="text-sm text-gray-500 mt-1">
            Order #{order.id.slice(0, 8).toUpperCase()} · Placed {formatDate(order.created_at)}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${statusConfig.bg} ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
      </div>

      {/* Book Details */}
      {book && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-3">Book</h2>
          <div className="flex gap-4">
            {coverImage ? (
              <img
                src={coverImage}
                alt={book.title}
                className="w-20 h-28 object-cover rounded border border-gray-200"
              />
            ) : (
              <div className="w-20 h-28 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-gray-400 text-xs text-center">
                No Image
              </div>
            )}
            <div className="flex-1 space-y-1">
              <p className="font-semibold text-gray-900">{book.title}</p>
              <p className="text-sm text-gray-600">by {book.author}</p>
              {book.isbn && <p className="text-xs text-gray-500">ISBN: {book.isbn}</p>}
              {listing && (
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${CONDITION_COLORS[listing.condition_score] ?? 'bg-gray-100 text-gray-700'}`}>
                  {CONDITION_LABELS[listing.condition_score] ?? `Score: ${listing.condition_score}`}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pricing Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-700 mb-3">Pricing</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Book Price</span>
            <span className="font-medium">₹{(listing?.final_price ?? order.total_amount).toFixed(2)}</span>
          </div>
          <div className="border-t border-gray-100 pt-2 flex justify-between">
            <span className="font-semibold text-gray-900">Total Paid</span>
            <span className="font-bold text-blue-600 text-lg">₹{order.total_amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Delivery Address */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-700 mb-2">Delivery Address</h2>
        <p className="text-sm text-gray-700 whitespace-pre-line">{order.delivery_address}</p>
      </div>

      {/* Payment Status */}
      {payment && (
        <PaymentStatusDisplay
          status={payment.status}
          paymentId={payment.payment_intent_id}
          paymentMethod={payment.gateway}
          amount={payment.amount}
          currency={order.currency}
        />
      )}

      {/* Tracking Information */}
      {order.tracking_id && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-2">Tracking</h2>
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">📦</span>
            <div>
              <p className="text-sm text-gray-600">Tracking ID</p>
              <p className="font-mono font-semibold text-gray-900">{order.tracking_id}</p>
            </div>
          </div>
          {order.status === 'delivered' && (
            <p className="mt-3 text-sm text-green-700 font-medium">✅ Delivered on {formatDate(order.updated_at)}</p>
          )}
        </div>
      )}

      {/* Cancel Order */}
      {canCancel && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          {cancelError && (
            <div role="alert" className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
              {cancelError}
            </div>
          )}
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
            aria-busy={cancelling}
          >
            {cancelling ? 'Cancelling...' : 'Cancel Order'}
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {order.status === 'paid' ? 'A refund will be initiated upon cancellation.' : 'This order has not been paid yet.'}
          </p>
        </div>
      )}
    </div>
  );
}
