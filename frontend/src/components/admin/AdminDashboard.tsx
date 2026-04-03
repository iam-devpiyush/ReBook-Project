'use client';

/**
 * AdminDashboard Component
 *
 * Displays platform overview with key metrics, charts for daily sales,
 * listings per day, revenue by category, and environmental impact metrics.
 *
 * Requirements: 9.1, 9.12
 */

import { useEffect, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingListing {
  id: string;
  status: string;
  final_price: number;
  condition_score: number;
  created_at: string;
  images: string[] | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  book: { title: string; author: string } | null;
  seller: { name: string; email: string } | null;
}
interface PlatformStats {
  total_books_listed: number;
  total_books_sold: number;
  active_listings: number;
  total_users: number;
  total_buyers: number;
  total_sellers: number;
  revenue_generated: number;
  platform_commission_earned: number;
  trees_saved: number;
  water_saved_liters: number;
  co2_reduced_kg: number;
  charts: {
    daily_sales: Array<{ date: string; count: number }>;
    listings_per_day: Array<{ date: string; count: number }>;
    revenue_by_category: Array<{ category: string; revenue: number }>;
  };
}

interface AnalyticsData {
  dailySales: Array<{ date: string; count: number }>;
  listingsPerDay: Array<{ date: string; count: number }>;
  revenueByCategory: Array<{ categoryId: string; categoryName: string; revenue: number }>;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6 flex items-start gap-4">
      <div className={`p-3 rounded-full ${color}`}>{icon}</div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
      <p className="text-sm text-red-700">{message}</p>
      <button
        onClick={onRetry}
        className="ml-4 text-sm font-medium text-red-700 underline hover:text-red-900"
      >
        Retry
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Moderation state
  const [pendingListings, setPendingListings] = useState<PendingListing[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [moderating, setModerating] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchPending = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/admin/listings?status=pending_approval&pageSize=50'),
        fetch('/api/admin/listings?status=rescan_required&pageSize=50'),
      ]);
      const [j1, j2] = await Promise.all([
        r1.ok ? r1.json() : { data: [] },
        r2.ok ? r2.json() : { data: [] },
      ]);
      const all = [...(j1.data ?? []), ...(j2.data ?? [])];
      // Extra client-side guard — only show truly pending listings
      const pending = all.filter(
        (l: PendingListing) => l.status === 'pending_approval' || l.status === 'rescan_required'
      );
      setPendingListings(pending);
    } catch (e) {
      console.warn('fetchPending error:', e);
    }
  }, []);

  // Toast notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const handleApprove = async (id: string) => {
    setModerating(id);
    try {
      const res = await fetch(`/api/admin/listings/${id}/approve`, { method: 'PUT' });
      if (res.ok) {
        setPendingListings(p => p.filter(l => l.id !== id));
        setExpandedId(null);
        showToast('success', 'Listing approved successfully');
      } else {
        const j = await res.json();
        showToast('error', j.error ?? 'Failed to approve');
      }
    } finally {
      setModerating(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return;
    setModerating(id);
    try {
      const res = await fetch(`/api/admin/listings/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (res.ok) {
        setPendingListings(p => p.filter(l => l.id !== id));
        setRejectId(null);
        setRejectReason('');
        setExpandedId(null);
        showToast('success', 'Listing rejected');
      } else {
        const j = await res.json();
        showToast('error', j.error ?? 'Failed to reject');
      }
    } finally {
      setModerating(null);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsRes, analyticsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/analytics'),
      ]);

      if (!statsRes.ok) {
        throw new Error(`Failed to fetch stats: ${statsRes.statusText}`);
      }
      if (!analyticsRes.ok) {
        throw new Error(`Failed to fetch analytics: ${analyticsRes.statusText}`);
      }

      const statsJson = await statsRes.json();
      const analyticsJson = await analyticsRes.json();

      setStats(statsJson.data);
      setAnalytics(analyticsJson.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchPending();
  }, [fetchData, fetchPending]);

  if (loading) return <LoadingSpinner />;

  if (error) return <ErrorBanner message={error} onRetry={fetchData} />;

  if (!stats) return null;

  // Prefer analytics endpoint data when available, fall back to stats charts
  const dailySalesData = analytics?.dailySales ?? stats.charts.daily_sales;
  const listingsPerDayData = analytics?.listingsPerDay ?? stats.charts.listings_per_day;
  const revenueByCategoryData = analytics
    ? analytics.revenueByCategory.map((r) => ({ category: r.categoryName, revenue: r.revenue }))
    : stats.charts.revenue_by_category;

  return (
    <div className="space-y-8">
      {/* ── Key Metrics ── */}
      <section>
        <SectionHeader title="Platform Overview" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Books Listed"
            value={stats.total_books_listed.toLocaleString()}
            icon={<BookIcon />}
            color="bg-indigo-100 text-indigo-600"
          />
          <MetricCard
            title="Books Sold"
            value={stats.total_books_sold.toLocaleString()}
            icon={<SoldIcon />}
            color="bg-green-100 text-green-600"
          />
          <MetricCard
            title="Active Listings"
            value={stats.active_listings.toLocaleString()}
            icon={<ActiveIcon />}
            color="bg-yellow-100 text-yellow-600"
          />
          <MetricCard
            title="Total Users"
            value={stats.total_users.toLocaleString()}
            subtitle={`${stats.total_sellers} sellers · ${stats.total_buyers} buyers`}
            icon={<UsersIcon />}
            color="bg-purple-100 text-purple-600"
          />
        </div>
      </section>

      {/* ── Revenue Metrics ── */}
      <section>
        <SectionHeader title="Revenue" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MetricCard
            title="Total Revenue Generated"
            value={`₹${stats.revenue_generated.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={<RevenueIcon />}
            color="bg-emerald-100 text-emerald-600"
          />
          <MetricCard
            title="Platform Commission Earned"
            value={`₹${stats.platform_commission_earned.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={<CommissionIcon />}
            color="bg-teal-100 text-teal-600"
          />
        </div>
      </section>

      {/* ── Environmental Impact ── */}
      <section>
        <SectionHeader title="Environmental Impact" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            title="Trees Saved"
            value={stats.trees_saved.toFixed(2)}
            subtitle="books reused / 30"
            icon={<TreeIcon />}
            color="bg-green-100 text-green-700"
          />
          <MetricCard
            title="Water Saved"
            value={`${stats.water_saved_liters.toLocaleString('en-IN', { maximumFractionDigits: 2 })} L`}
            subtitle="50 L per book"
            icon={<WaterIcon />}
            color="bg-blue-100 text-blue-600"
          />
          <MetricCard
            title="CO₂ Reduced"
            value={`${stats.co2_reduced_kg.toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg`}
            subtitle="2.5 kg per book"
            icon={<LeafIcon />}
            color="bg-lime-100 text-lime-700"
          />
        </div>
      </section>

      {/* ── Pending Listings Moderation ── */}
      <section>
        <SectionHeader title={`Pending Approval (${pendingListings.length})`} />
        {pendingListings.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500 text-sm">
            No listings pending approval.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingListings.map(listing => {
              const book = listing.book;
              const isBusy = moderating === listing.id;
              const isExpanded = expandedId === listing.id;
              const images = listing.images ?? [];
              const imageLabels = ['Front Cover', 'Back Cover', 'Spine', 'Pages'];

              return (
                <div key={listing.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* ── Collapsed row (always visible, clickable) ── */}
                  <div
                    className="flex gap-4 items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                    onClick={() => setExpandedId(isExpanded ? null : listing.id)}
                  >
                    {/* Thumbnail */}
                    <div className="w-12 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                      {images[0] ? (
                        <img src={images[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Summary info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{book?.title ?? 'Untitled'}</p>
                      <p className="text-xs text-gray-500 truncate">{book?.author ?? ''}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Condition: {listing.condition_score}/5 · ₹{listing.final_price.toLocaleString('en-IN')}
                        {listing.seller && <> · Seller: {listing.seller.name ?? listing.seller.email}</>}
                      </p>
                    </div>

                    {/* Chevron */}
                    <svg
                      className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* ── Expanded details ── */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 space-y-4">
                      {/* 4 images grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {imageLabels.map((label, i) => (
                          <div key={label}>
                            <p className="text-xs text-gray-500 mb-1 font-medium">{label}</p>
                            <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                              {images[i] ? (
                                <img
                                  src={images[i]}
                                  alt={label}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                                  No image
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Extra details */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-600">
                        <div><span className="text-gray-400 block">Price</span>₹{listing.final_price.toLocaleString('en-IN')}</div>
                        <div><span className="text-gray-400 block">Condition</span>{listing.condition_score}/5</div>
                        <div><span className="text-gray-400 block">Seller</span>{listing.seller?.name ?? listing.seller?.email ?? '—'}</div>
                        <div><span className="text-gray-400 block">Submitted</span>{new Date(listing.created_at).toLocaleDateString('en-IN')}</div>
                      </div>

                      {/* Address */}
                      {(listing.city || listing.state || listing.pincode) && (
                        <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-600 flex items-start gap-2">
                          <svg className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <div>
                            <span className="text-gray-400 block mb-0.5">Pickup Location</span>
                            <span className="font-medium text-gray-700">
                              {[listing.city, listing.state, listing.pincode].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Reject reason input */}
                      {rejectId === listing.id && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="Reason for rejection..."
                            className="flex-1 text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
                          />
                          <button
                            onClick={() => handleReject(listing.id)}
                            disabled={isBusy || !rejectReason.trim()}
                            className="text-xs px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                          >
                            {isBusy ? '...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => { setRejectId(null); setRejectReason(''); }}
                            className="text-xs px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {/* Action buttons */}
                      {rejectId !== listing.id && (
                        <div className="flex gap-3 pt-1">
                          <button
                            onClick={() => handleApprove(listing.id)}
                            disabled={isBusy}
                            className="px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {isBusy ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => { setRejectId(listing.id); setRejectReason(''); }}
                            disabled={isBusy}
                            className="px-4 py-2 text-sm font-semibold border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Charts ── */}
      <section>
        <SectionHeader title="Analytics" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Sales */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Daily Sales (last 30 days)</h3>
            {dailySalesData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dailySalesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={formatDate} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={(label) => formatDate(String(label))} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Sales"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Listings Per Day */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Listings Per Day (last 30 days)</h3>
            {listingsPerDayData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={listingsPerDayData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={formatDate} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={(label) => formatDate(String(label))} />
                  <Legend />
                  <Bar dataKey="count" name="Listings" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Revenue by Category */}
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue by Category</h3>
            {revenueByCategoryData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={revenueByCategoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `₹${v.toLocaleString('en-IN')}`}
                  />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip
                    formatter={(value) =>
                      `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                    }
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue (₹)" fill="#10b981" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* ── Toast notification ── */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toast.text}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
      No data available
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function BookIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function SoldIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ActiveIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function RevenueIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CommissionIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

function TreeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M5 3l7 7 7-7M5 10l7 7 7-7M12 17v4" />
    </svg>
  );
}

function WaterIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1v12z" />
    </svg>
  );
}
