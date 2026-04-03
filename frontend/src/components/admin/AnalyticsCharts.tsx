/**
 * AnalyticsCharts Component
 * 
 * Displays analytics charts for the admin dashboard:
 * - Daily sales chart (line chart)
 * - Listings per day chart (bar chart)
 * - Revenue by category chart (bar chart)
 * 
 * Requirements: 9.12
 */

'use client';

import React, { useEffect, useState } from 'react';
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

interface DailySalesData {
  date: string;
  count: number;
}

interface ListingsPerDayData {
  date: string;
  count: number;
}

interface RevenueByCategoryData {
  categoryId: string;
  categoryName: string;
  revenue: number;
}

interface AnalyticsData {
  dailySales: DailySalesData[];
  listingsPerDay: ListingsPerDayData[];
  revenueByCategory: RevenueByCategoryData[];
}

interface AnalyticsChartsProps {
  days?: number; // Number of days to display (default: 30)
}

export default function AnalyticsCharts({ days = 30 }: AnalyticsChartsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, [days]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/analytics?days=${days}`);

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
        <button
          onClick={fetchAnalyticsData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Daily Sales Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          Daily Sales (Last {days} Days)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.dailySales}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              labelFormatter={(value) => {
                const date = new Date(value as string);
                return date.toLocaleDateString();
              }}
              formatter={(value) => [`${value ?? 0} sales`, 'Count'] as [string, string]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Sales"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Listings Per Day Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          Listings Created Per Day (Last {days} Days)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.listingsPerDay}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              labelFormatter={(value) => {
                const date = new Date(value as string);
                return date.toLocaleDateString();
              }}
              formatter={(value) => [`${value ?? 0} listings`, 'Count'] as [string, string]}
            />
            <Legend />
            <Bar
              dataKey="count"
              fill="#10b981"
              name="Listings"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue By Category Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          Revenue by Category (Platform Commission)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.revenueByCategory}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="categoryName"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value) => [
                `₹${Number(value ?? 0).toFixed(2)}`,
                'Revenue',
              ] as [string, string]}
            />
            <Legend />
            <Bar
              dataKey="revenue"
              fill="#f59e0b"
              name="Revenue (₹)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
