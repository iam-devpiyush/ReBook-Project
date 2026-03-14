/**
 * SellerOrdersPage Component (Seller View)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

interface OrderBook {
  title: string;
  author: string;
}

interface OrderListing {
  id: string;
  images: string[];
  book?: OrderBook | null;
}

export interface SellerOrder {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  price: number;
  delivery_cost: number;
  platform_commission: number;
  payment_fees: number;
  seller_payout: number;
  status: string;
  delivery_address: Record<string, string> | string;
  tracking_id?: string | null;
  created_at: string;
  updated_at: string;
  listing?: OrderListing | null;
}

interface SellerOrdersPageProps {
  currentUserId: string;
  onViewOrder?: (orderId: string) => void;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Orders' },
  { value: 'pending_payment', label: 'Pending Payment' },
  { value: 'paid', label: 'Paid' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_BADGE: Record<string, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-800',
  paid:            'bg-blue-100 text-blue-800',
  shipped:         'bg-indigo-100 text-indigo-800',
  delivered:       'bg-green-100 text-green-800',
  cancelled:       'bg-red-100 text-red-800',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function SellerOrdersPage({ currentUserId, onViewOrder }: SellerOrdersPageProps) {
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '10' });
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/orders?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load orders');

      // Filter to only orders where current user is the seller
      const sellerOrders = (json.data ?? []).filter(
        (o: SellerOrder) => o.seller_id === currentUserId
      );
      setOrders(sellerOrders);
      setTotalPages(json.pagination?.totalPages ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, currentUserId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const completedOrders = orders.filter(o => o.status === 'delivered');
  const totalEarnings = completedOrders.reduce((sum, o) => sum + (o.seller_payout ?? 0), 0);
  const isEmpty = !loading && !error && orders.length === 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Sales Orders</h1>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Earnings summary */}
      {!loading && completedOrders.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-green-700 font-medium">Total Earnings (Delivered)</p>
            <p className="text-xs text-green-600 mt-0.5">
              {completedOrders.length} order{completedOrders.length !== 1 ? 's' : ''} delivered
            </p>
          </div>
          <p className="text-2xl font-bold text-green-700">₹{totalEarnings.toFixed(2)}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex items-center justify-between text-sm">
          <span>{error}</span>
          <button onClick={fetchOrders} className="text-red-600 underline ml-4">Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-36 bg-gray-200 rounded-lg" />)}
        </div>
      )}

      {/* Empty */}
      {isEmpty && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3" aria-hidden="true">🛒</p>
          <p className="font-medium">No sales orders yet</p>
          {statusFilter && <p className="text-sm mt-1">Try changing the status filter.</p>}
        </div>
      )}

      {/* Order list */}
      {!loading && !error && orders.length > 0 && (
        <ul className="space-y-4" aria-label="Sales orders list">
          {orders.map(order => {
            const book = order.listing?.book;
            const coverImage = order.listing?.images?.[0] ?? null;
            const badge = STATUS_BADGE[order.status] ?? 'bg-gray-100 text-gray-700';

            return (
              <li key={order.id} className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex gap-4">
                  {/* Cover */}
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt={book?.title ?? 'Book cover'}
                      className="w-16 h-22 object-cover rounded border border-gray-200 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-22 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                      📚
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-semibold text-gray-900 truncate">
                          {book?.title ?? 'Unknown Book'}
                        </p>
                        <p className="text-sm text-gray-600">{book?.author ?? ''}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${badge}`}>
                        {statusLabel(order.status)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                      <span>Order #{order.id.slice(0, 8).toUpperCase()}</span>
                      <span>·</span>
                      <span>{formatDate(order.created_at)}</span>
                    </div>

                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Buyer ID:</span>{' '}
                      <span className="font-mono text-xs text-gray-500">
                        {order.buyer_id.slice(0, 8)}...
                      </span>
                    </div>

                    {order.tracking_id && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Tracking:</span>{' '}
                        <span className="font-mono text-xs">📦 {order.tracking_id}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div className="text-sm text-gray-600">
                        Sale: <span className="font-medium text-gray-800">₹{(order.price ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="text-sm">
                        Your payout:{' '}
                        <span className={`font-bold ${order.status === 'delivered' ? 'text-green-600' : 'text-gray-700'}`}>
                          ₹{(order.seller_payout ?? 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {onViewOrder && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => onViewOrder(order.id)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View Details →
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
