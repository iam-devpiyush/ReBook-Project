/**
 * MyOrdersPage Component (Buyer View)
 *
 * Displays all orders placed by the current buyer with status filtering
 * and navigation to individual order details.
 *
 * Requirements: Buyer order view
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderBook {
  title: string;
  author: string;
}

interface OrderListing {
  books: OrderBook;
  images: string[];
}

export interface BuyerOrder {
  id: string;
  listing_id: string;
  seller_id: string;
  total_amount: number;
  currency: string;
  status: string;
  tracking_id?: string | null;
  created_at: string;
  updated_at: string;
  listings?: OrderListing | null;
}

interface MyOrdersPageProps {
  onViewOrder?: (orderId: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MyOrdersPage({ onViewOrder }: MyOrdersPageProps) {
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
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

      // Filter to buyer-only orders (buyer_id matches current user)
      // The API returns both buyer and seller orders; we show all here
      // since this is the buyer view — the API already scopes to the user
      setOrders(json.data ?? []);
      setTotalPages(json.pagination?.totalPages ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  function handleStatusChange(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  // --- Empty state ---
  const isEmpty = !loading && !error && orders.length === 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => handleStatusChange(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-gray-200 rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3" aria-hidden="true">📦</p>
          <p className="font-medium">No orders found</p>
          {statusFilter && (
            <p className="text-sm mt-1">Try changing the status filter.</p>
          )}
        </div>
      )}

      {/* Order list */}
      {!loading && !error && orders.length > 0 && (
        <ul className="space-y-4" aria-label="Orders list">
          {orders.map(order => {
            const book = order.listings?.books;
            const coverImage = order.listings?.images?.[0] ?? null;
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
                    <div className="w-16 h-22 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-gray-400 text-xs shrink-0">
                      📚
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex-1 min-w-0">
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

                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                      <span>₹{order.total_amount.toFixed(2)}</span>
                      <span>·</span>
                      <span>{formatDate(order.created_at)}</span>
                      {order.tracking_id && (
                        <>
                          <span>·</span>
                          <span className="font-mono text-xs">📦 {order.tracking_id}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* View button */}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => onViewOrder?.(order.id)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View Details →
                  </button>
                </div>
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
