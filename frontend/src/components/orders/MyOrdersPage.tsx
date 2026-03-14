'use client';

import { useState, useEffect, useCallback } from 'react';

interface OrderBook { title: string; author: string; }
interface OrderListing {
  id: string;
  images: string[];
  book?: OrderBook | null;   // API returns listing.book (singular)
  books?: OrderBook | null;  // fallback alias
}

export interface BuyerOrder {
  id: string;
  listing_id: string;
  seller_id: string;
  buyer_id?: string;
  price?: number;
  total_amount?: number;
  currency?: string;
  status: string;
  tracking_id?: string | null;
  created_at: string;
  updated_at: string;
  listing?: OrderListing | null;   // API returns "listing" (singular)
  listings?: OrderListing | null;  // legacy alias
}

interface MyOrdersPageProps {
  onViewOrder?: (orderId: string) => void;
}

type TabFilter = 'all' | 'active' | 'delivered';

const TABS: { id: TabFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'delivered', label: 'Delivered' },
];

const STATUS_BADGE: Record<string, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-blue-100 text-blue-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

function statusLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MyOrdersPage({ onViewOrder }: MyOrdersPageProps) {
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabFilter>('all');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders?pageSize=50');
      const json = await res.json();
      setOrders(json.data ?? []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const ACTIVE_STATUSES = new Set(['pending_payment', 'paid', 'shipped']);
  const filtered = orders.filter(o => {
    if (tab === 'all') return true;
    if (tab === 'active') return ACTIVE_STATUSES.has(o.status);
    if (tab === 'delivered') return o.status === 'delivered';
    return true;
  });

  const delivered = orders.filter(o => o.status === 'delivered').length;
  const treesSaved = (delivered / 30).toFixed(2);
  const waterSaved = delivered * 50;
  const co2Saved = (delivered * 2.5).toFixed(1);
  const allCount = orders.length;
  const activeCount = orders.filter(o => ACTIVE_STATUSES.has(o.status)).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">Track your purchases and view order history</p>

      {/* Environmental Impact Card — always visible */}
      <div
        className="rounded-2xl p-6 mb-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 60%, #166534 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute right-0 top-0 w-48 h-48 rounded-full bg-white opacity-10 translate-x-16 -translate-y-16 pointer-events-none" />
        <div className="absolute right-8 bottom-0 w-32 h-32 rounded-full bg-white opacity-10 translate-y-10 pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-green-100 text-xs font-semibold tracking-widest uppercase">Environmental Impact</span>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-3xl font-bold text-white">{treesSaved}</p>
              <div className="flex items-center gap-1 mt-1">
                <svg className="w-3.5 h-3.5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <span className="text-green-200 text-xs">Trees Saved</span>
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{waterSaved}L</p>
              <div className="flex items-center gap-1 mt-1">
                <svg className="w-3.5 h-3.5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3s-6 5.686-6 10a6 6 0 0012 0c0-4.314-6-10-6-10z" />
                </svg>
                <span className="text-green-200 text-xs">Water Saved</span>
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{co2Saved}kg</p>
              <div className="flex items-center gap-1 mt-1">
                <svg className="w-3.5 h-3.5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
                <span className="text-green-200 text-xs">CO₂ Reduced</span>
              </div>
            </div>
          </div>

          <p className="text-green-200 text-xs mt-4">
            Based on {delivered} book{delivered !== 1 ? 's' : ''} reused through our platform
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {TABS.map(t => {
          const count = t.id === 'all' ? allCount : t.id === 'active' ? activeCount : delivered;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isActive
                ? 'bg-white border border-gray-300 text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-sm text-gray-400">No orders yet</p>
        </div>
      )}

      {/* Order list */}
      {!loading && filtered.length > 0 && (
        <ul className="space-y-3">
          {filtered.map(order => {
            // API returns order.listing.book — support both shapes
            const listingData = order.listing ?? order.listings;
            const book = listingData?.book ?? listingData?.books;
            const coverImage = listingData?.images?.[0] ?? null;
            const badge = STATUS_BADGE[order.status] ?? 'bg-gray-100 text-gray-600';
            const amount = order.price ?? order.total_amount ?? 0;

            return (
              <li key={order.id} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4 hover:shadow-sm transition-shadow">
                {/* Cover */}
                <div className="w-14 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                  {coverImage ? (
                    <img src={coverImage} alt={book?.title ?? ''} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg">📚</div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900 truncate">{book?.title ?? 'Unknown Book'}</p>
                      <p className="text-sm text-gray-500">{book?.author ?? ''}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${badge}`}>
                      {statusLabel(order.status)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                    <span className="font-medium text-gray-900">₹{amount.toFixed(0)}</span>
                    <span>·</span>
                    <span>{formatDate(order.created_at)}</span>
                    {order.tracking_id && <span className="font-mono text-xs">📦 {order.tracking_id}</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
