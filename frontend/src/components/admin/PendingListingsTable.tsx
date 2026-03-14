/**
 * PendingListingsTable Component
 *
 * Displays pending listings for admin review with book details, seller info,
 * and action buttons (approve, reject, request rescan).
 * Includes a modal for rejection reason input.
 *
 * Requirements: 9.2, 3.3-3.8
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import ConditionBadge from '@/components/listings/ConditionBadge';
import { ListingWithBook } from '@/types/listing';

interface PendingListingsTableProps {
  /** Called after a successful moderation action to allow parent to refresh */
  onActionComplete?: () => void;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export default function PendingListingsTable({ onActionComplete }: PendingListingsTableProps) {
  const [listings, setListings] = useState<ListingWithBook[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action loading state per listing
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Rejection modal state
  const [rejectModal, setRejectModal] = useState<{ listingId: string; title: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  // Rescan modal state
  const [rescanModal, setRescanModal] = useState<{ listingId: string; title: string } | null>(null);
  const [rescanNotes, setRescanNotes] = useState('');

  const fetchListings = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/listings?status=pending_approval&page=${page}&pageSize=20`
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch listings');
      }
      const data = await res.json();
      setListings(Array.isArray(data.data) ? data.data : []);
      setPagination(data.pagination || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings(currentPage);
  }, [currentPage, fetchListings]);

  // --- Approve ---
  const handleApprove = async (listingId: string) => {
    setActionLoading(listingId);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/listings/${listingId}/approve`, {
        method: 'PUT',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve listing');
      await fetchListings(currentPage);
      onActionComplete?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  // --- Reject ---
  const openRejectModal = (listing: ListingWithBook) => {
    setRejectModal({ listingId: listing.id, title: listing.book?.title ?? listing.id });
    setRejectionReason('');
    setRejectionError(null);
  };

  const closeRejectModal = () => {
    setRejectModal(null);
    setRejectionReason('');
    setRejectionError(null);
  };

  const handleRejectSubmit = async () => {
    if (!rejectModal) return;
    if (!rejectionReason.trim()) {
      setRejectionError('Rejection reason is required');
      return;
    }
    if (rejectionReason.length > 500) {
      setRejectionError('Reason must be 500 characters or less');
      return;
    }
    setActionLoading(rejectModal.listingId);
    setRejectionError(null);
    try {
      const res = await fetch(`/api/admin/listings/${rejectModal.listingId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject listing');
      closeRejectModal();
      await fetchListings(currentPage);
      onActionComplete?.();
    } catch (err) {
      setRejectionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  // --- Rescan ---
  const openRescanModal = (listing: ListingWithBook) => {
    setRescanModal({ listingId: listing.id, title: listing.book?.title ?? listing.id });
    setRescanNotes('');
  };

  const closeRescanModal = () => {
    setRescanModal(null);
    setRescanNotes('');
  };

  const handleRescanSubmit = async () => {
    if (!rescanModal) return;
    setActionLoading(rescanModal.listingId);
    try {
      const res = await fetch(`/api/admin/listings/${rescanModal.listingId}/request-rescan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: rescanNotes.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request rescan');
      closeRescanModal();
      await fetchListings(currentPage);
      onActionComplete?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const formatPrice = (amount: number) => `₹${amount.toFixed(0)}`;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  // --- Render ---
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-600">Loading pending listings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-medium">Error loading listings</p>
        <p className="text-sm mt-1">{error}</p>
        <button
          onClick={() => fetchListings(currentPage)}
          className="mt-3 text-sm underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Action error banner */}
      {actionError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="ml-4 font-bold">×</button>
        </div>
      )}

      {listings.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg font-medium">No pending listings</p>
          <p className="text-sm mt-1">All listings have been reviewed.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Book</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Seller</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Condition</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Price</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Submitted</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {listings.map((listing) => (
                  <tr key={listing.id} className="hover:bg-gray-50 transition-colors">
                    {/* Book details */}
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        {listing.images?.[0] ? (
                          <img
                            src={listing.images[0]}
                            alt={listing.book?.title}
                            className="w-12 h-16 object-cover rounded border border-gray-200 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-gray-400 text-xs">No img</span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 line-clamp-2">
                            {listing.book?.title ?? '—'}
                          </p>
                          <p className="text-gray-500 text-xs mt-0.5">
                            {listing.book?.author ?? '—'}
                          </p>
                          {listing.book?.isbn && (
                            <p className="text-gray-400 text-xs mt-0.5">
                              ISBN: {listing.book.isbn}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Seller info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {listing.seller?.profile_picture ? (
                          <img
                            src={listing.seller.profile_picture}
                            alt={listing.seller.name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                            {listing.seller?.name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-800">{listing.seller?.name ?? '—'}</p>
                          <p className="text-gray-400 text-xs">{listing.seller?.email ?? ''}</p>
                        </div>
                      </div>
                    </td>

                    {/* Condition */}
                    <td className="px-4 py-3">
                      <ConditionBadge conditionScore={listing.condition_score} size="sm" />
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">
                        {formatPrice(listing.final_price)}
                      </p>
                      <p className="text-gray-400 text-xs">
                        Original: {formatPrice(listing.original_price)}
                      </p>
                    </td>

                    {/* Submitted date */}
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {formatDate(listing.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {/* Approve */}
                        <button
                          onClick={() => handleApprove(listing.id)}
                          disabled={actionLoading === listing.id}
                          aria-label="Approve listing"
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium rounded transition-colors"
                        >
                          {actionLoading === listing.id ? '...' : 'Approve'}
                        </button>

                        {/* Reject */}
                        <button
                          onClick={() => openRejectModal(listing)}
                          disabled={actionLoading === listing.id}
                          aria-label="Reject listing"
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-medium rounded transition-colors"
                        >
                          Reject
                        </button>

                        {/* Request Rescan */}
                        <button
                          onClick={() => openRescanModal(listing)}
                          disabled={actionLoading === listing.id}
                          aria-label="Request rescan"
                          className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white text-xs font-medium rounded transition-colors"
                        >
                          Rescan
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
              <span>
                Showing {(pagination.page - 1) * pagination.pageSize + 1}–
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                {pagination.total} listings
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={!pagination.hasPreviousPage}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 bg-blue-600 text-white rounded">
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

      {/* Rejection Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Reject Listing</h2>
            <p className="text-sm text-gray-500 mb-4 line-clamp-1">
              &ldquo;{rejectModal.title}&rdquo;
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why this listing is being rejected..."
              rows={4}
              maxLength={500}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
            <div className="flex justify-between items-center mt-1">
              {rejectionError ? (
                <p className="text-red-600 text-xs">{rejectionError}</p>
              ) : (
                <span />
              )}
              <span className="text-xs text-gray-400">{rejectionReason.length}/500</span>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={closeRejectModal}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={actionLoading === rejectModal.listingId}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {actionLoading === rejectModal.listingId ? 'Rejecting...' : 'Reject Listing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rescan Modal */}
      {rescanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Request Rescan</h2>
            <p className="text-sm text-gray-500 mb-4 line-clamp-1">
              &ldquo;{rescanModal.title}&rdquo;
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes for Seller <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={rescanNotes}
              onChange={(e) => setRescanNotes(e.target.value)}
              placeholder="Describe what needs to be rescanned or improved..."
              rows={4}
              maxLength={500}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
            />
            <div className="flex justify-end mt-1">
              <span className="text-xs text-gray-400">{rescanNotes.length}/500</span>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={closeRescanModal}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRescanSubmit}
                disabled={actionLoading === rescanModal.listingId}
                className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {actionLoading === rescanModal.listingId ? 'Requesting...' : 'Request Rescan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
