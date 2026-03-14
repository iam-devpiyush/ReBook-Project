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
  }, [fetchData]);

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
