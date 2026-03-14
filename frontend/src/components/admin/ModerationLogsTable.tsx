/**
 * ModerationLogsTable Component
 *
 * Displays admin moderation logs with filters for date range, admin, and
 * action type. Shows admin, action, target, reason, and timestamp columns.
 *
 * Requirements: 9.11, 24.3
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ModerationLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: 'listing' | 'user' | 'order';
  target_id: string;
  reason: string | null;
  notes: string | null;
  created_at: string;
  admin: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface Filters {
  adminId: string;
  action: string;
  targetType: string;
  startDate: string;
  endDate: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'approve_listing', label: 'Approve Listing' },
  { value: 'reject_listing', label: 'Reject Listing' },
  { value: 'request_rescan', label: 'Request Rescan' },
  { value: 'suspend_user', label: 'Suspend User' },
  { value: 'warn_user', label: 'Warn User' },
  { value: 'limit_listings', label: 'Limit Listings' },
  { value: 'resolve_dispute', label: 'Resolve Dispute' },
  { value: 'issue_refund', label: 'Issue Refund' },
];

const TARGET_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'listing', label: 'Listing' },
  { value: 'user', label: 'User' },
  { value: 'order', label: 'Order' },
];

const ACTION_COLORS: Record<string, string> = {
  approve_listing: 'bg-green-100 text-green-700',
  reject_listing: 'bg-red-100 text-red-700',
  request_rescan: 'bg-yellow-100 text-yellow-700',
  suspend_user: 'bg-orange-100 text-orange-700',
  warn_user: 'bg-amber-100 text-amber-700',
  limit_listings: 'bg-purple-100 text-purple-700',
  resolve_dispute: 'bg-blue-100 text-blue-700',
  issue_refund: 'bg-teal-100 text-teal-700',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ModerationLogsTable() {
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>({
    adminId: '',
    action: '',
    targetType: '',
    startDate: '',
    endDate: '',
  });

  // Applied filters (only updated on explicit search)
  const [appliedFilters, setAppliedFilters] = useState<Filters>(filters);

  const fetchLogs = useCallback(async (page: number, f: Filters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (f.adminId) params.set('adminId', f.adminId);
      if (f.action) params.set('action', f.action);
      if (f.targetType) params.set('targetType', f.targetType);
      if (f.startDate) params.set('startDate', f.startDate);
      if (f.endDate) params.set('endDate', f.endDate);

      const res = await fetch(`/api/admin/moderation-logs?${params}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch moderation logs');
      }
      const data = await res.json();
      setLogs(Array.isArray(data.data) ? data.data : []);
      setPagination(data.pagination || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(currentPage, appliedFilters);
  }, [currentPage, appliedFilters, fetchLogs]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    setAppliedFilters(filters);
  };

  const handleClearFilters = () => {
    const empty: Filters = { adminId: '', action: '', targetType: '', startDate: '', endDate: '' };
    setFilters(empty);
    setCurrentPage(1);
    setAppliedFilters(empty);
  };

  const hasActiveFilters = Object.values(appliedFilters).some(Boolean);

  return (
    <div className="space-y-4">
      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {/* Action filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              aria-label="Filter by action"
            >
              {ACTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Target type filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Target Type</label>
            <select
              value={filters.targetType}
              onChange={(e) => handleFilterChange('targetType', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              aria-label="Filter by target type"
            >
              {TARGET_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Start date */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              aria-label="Filter from date"
            />
          </div>

          {/* End date */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              aria-label="Filter to date"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-end gap-2">
            <button
              onClick={handleApplyFilters}
              className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              Apply
            </button>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-600 text-sm font-medium rounded-md transition-colors"
                aria-label="Clear filters"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          <span className="ml-3 text-gray-600 text-sm">Loading moderation logs...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading logs</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => fetchLogs(currentPage, appliedFilters)}
            className="mt-3 text-sm underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg font-medium">No moderation logs found</p>
          <p className="text-sm mt-1">
            {hasActiveFilters ? 'Try adjusting your filters.' : 'No actions have been logged yet.'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Admin</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Action</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Target</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Reason / Notes</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Timestamp</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    {/* Admin */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{log.admin?.name ?? '—'}</p>
                      <p className="text-gray-400 text-xs">{log.admin?.email ?? ''}</p>
                    </td>

                    {/* Action badge */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {formatAction(log.action)}
                      </span>
                    </td>

                    {/* Target */}
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium capitalize">
                        {log.target_type}
                      </span>
                      <p className="text-gray-400 text-xs mt-0.5 font-mono truncate max-w-[120px]">
                        {log.target_id}
                      </p>
                    </td>

                    {/* Reason / Notes */}
                    <td className="px-4 py-3 max-w-xs">
                      {log.reason ? (
                        <p className="text-gray-700 text-xs line-clamp-2">{log.reason}</p>
                      ) : log.notes ? (
                        <p className="text-gray-500 text-xs italic line-clamp-2">{log.notes}</p>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatTimestamp(log.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Showing {(pagination.page - 1) * pagination.pageSize + 1}–
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                {pagination.total} logs
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={!pagination.hasPreviousPage}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 bg-indigo-600 text-white rounded">
                  {pagination.page}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={!pagination.hasNextPage}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAction(action: string): string {
  return action
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
