'use client';

/**
 * MyListingsPage Component
 *
 * Displays all of the seller's listings with status filtering,
 * views, price, creation date, and edit/delete actions.
 *
 * Requirements: Seller listing management (Requirement 15.1-15.5)
 */

import { useState, useEffect, useCallback } from 'react';
import ConditionBadge from '../listings/ConditionBadge';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SellerListing {
    id: string;
    status: string;
    final_price: number;
    original_price: number;
    condition_score: number;
    views?: number;
    created_at: string;
    rejection_reason?: string | null;
    images?: string[];
    books?: {
        title: string;
        author: string;
        isbn?: string;
    } | null;
}

export interface MyListingsPageProps {
    onEdit?: (listingId: string) => void;
    onCreateNew?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: '', label: 'All Listings' },
    { value: 'active', label: 'Active' },
    { value: 'pending_approval', label: 'Pending Review' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'rescan_required', label: 'Rescan Required' },
    { value: 'sold', label: 'Sold' },
    { value: 'inactive', label: 'Inactive' },
];

const STATUS_BADGE: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    pending_approval: 'bg-yellow-100 text-yellow-800',
    rejected: 'bg-red-100 text-red-800',
    rescan_required: 'bg-orange-100 text-orange-800',
    sold: 'bg-purple-100 text-purple-800',
    inactive: 'bg-gray-100 text-gray-600',
};

/** Statuses that allow editing */
const EDITABLE_STATUSES = new Set(['pending_approval', 'active', 'rescan_required']);
/** Statuses that allow deletion */
const DELETABLE_STATUSES = new Set(['pending_approval', 'active', 'rejected', 'rescan_required', 'inactive']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
    });
}

function statusLabel(status: string) {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

function DeleteModal({
    listing,
    onConfirm,
    onCancel,
    deleting,
}: {
    listing: SellerListing;
    onConfirm: () => void;
    onCancel: () => void;
    deleting: boolean;
}) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
        >
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
                <h3 id="delete-modal-title" className="text-lg font-semibold text-gray-900 mb-2">
                    Delete Listing?
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                    Are you sure you want to delete{' '}
                    <span className="font-medium">{(listing as any).book?.title ?? (listing as any).books?.title ?? 'this listing'}</span>?
                    This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        disabled={deleting}
                        className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={deleting}
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {deleting && <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />}
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MyListingsPage({ onEdit, onCreateNew }: MyListingsPageProps) {
    const [listings, setListings] = useState<SellerListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [deleteTarget, setDeleteTarget] = useState<SellerListing | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const fetchListings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ page: String(page), pageSize: '12' });
            if (statusFilter) params.set('status', statusFilter);

            const res = await fetch(`/api/listings/seller/me?${params}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? 'Failed to load listings');

            setListings(json.data ?? []);
            setTotalPages(json.pagination?.total_pages ?? json.pagination?.totalPages ?? 1);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load listings');
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter]);

    useEffect(() => {
        fetchListings();
    }, [fetchListings]);

    function handleStatusChange(value: string) {
        setStatusFilter(value);
        setPage(1);
    }

    async function handleDelete(listing: SellerListing) {
        setDeleting(true);
        setDeleteError(null);
        try {
            const res = await fetch(`/api/listings/${listing.id}`, { method: 'DELETE' });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? 'Failed to delete listing');
            setDeleteTarget(null);
            // Remove from local state
            setListings(prev => prev.filter(l => l.id !== listing.id));
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : 'Failed to delete listing');
        } finally {
            setDeleting(false);
        }
    }

    const isEmpty = !loading && !error && listings.length === 0;

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
                <div className="flex items-center gap-3">
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
                    {onCreateNew && (
                        <button
                            onClick={onCreateNew}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            + New Listing
                        </button>
                    )}
                </div>
            </div>

            {/* Delete error */}
            {deleteError && (
                <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                    {deleteError}
                </div>
            )}

            {/* Fetch error */}
            {error && (
                <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={fetchListings} className="underline font-medium ml-4">Retry</button>
                </div>
            )}

            {/* Loading skeleton */}
            {loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-56 bg-gray-200 rounded-lg" />
                    ))}
                </div>
            )}

            {/* Empty state */}
            {isEmpty && (
                <div className="text-center py-16 text-gray-500">
                    <p className="text-4xl mb-3" aria-hidden="true">📚</p>
                    <p className="font-medium text-gray-700">No listings found</p>
                    {statusFilter ? (
                        <p className="text-sm mt-1">Try a different status filter.</p>
                    ) : (
                        <p className="text-sm mt-1">Create your first listing to get started.</p>
                    )}
                    {onCreateNew && !statusFilter && (
                        <button
                            onClick={onCreateNew}
                            className="mt-4 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                        >
                            Create Listing
                        </button>
                    )}
                </div>
            )}

            {/* Listings grid */}
            {!loading && !error && listings.length > 0 && (
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="My listings">
                    {listings.map(listing => {
                        const book = listing.books ?? null;
                        const coverImage = listing.images?.[0] ?? null;
                        const badge = STATUS_BADGE[listing.status] ?? 'bg-gray-100 text-gray-600';
                        const canEdit = EDITABLE_STATUSES.has(listing.status);
                        const canDelete = DELETABLE_STATUSES.has(listing.status);

                        return (
                            <li key={listing.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
                                {/* Cover image */}
                                <div className="relative h-40 bg-gray-100">
                                    {coverImage ? (
                                        <img
                                            src={coverImage}
                                            alt={book?.title ?? 'Book cover'}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                            </svg>
                                        </div>
                                    )}
                                    {/* Status badge overlay */}
                                    <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold ${badge}`}>
                                        {statusLabel(listing.status)}
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="p-4 flex flex-col flex-1 gap-2">
                                    <div>
                                        <p className="font-semibold text-gray-900 line-clamp-2 text-sm leading-snug">
                                            {book?.title ?? 'Untitled'}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">{book?.author ?? ''}</p>
                                    </div>

                                    {/* Condition + Price */}
                                    <div className="flex items-center justify-between">
                                        <ConditionBadge conditionScore={listing.condition_score} size="sm" />
                                        <span className="text-base font-bold text-gray-900">₹{listing.final_price.toFixed(0)}</span>
                                    </div>

                                    {/* Meta */}
                                    <div className="flex items-center gap-3 text-xs text-gray-400">
                                        {listing.views !== undefined && (
                                            <span className="flex items-center gap-1">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                {listing.views} views
                                            </span>
                                        )}
                                        <span>{formatDate(listing.created_at)}</span>
                                    </div>

                                    {/* Rejection reason */}
                                    {listing.status === 'rejected' && listing.rejection_reason && (
                                        <p className="text-xs text-red-600 bg-red-50 rounded p-2 mt-1">
                                            <span className="font-medium">Reason:</span> {listing.rejection_reason}
                                        </p>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2 mt-auto pt-2">
                                        {canEdit && onEdit && (
                                            <button
                                                onClick={() => onEdit(listing.id)}
                                                className="flex-1 px-3 py-1.5 text-xs font-medium border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
                                            >
                                                Edit
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button
                                                onClick={() => setDeleteTarget(listing)}
                                                className="flex-1 px-3 py-1.5 text-xs font-medium border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        )}
                                        {!canEdit && !canDelete && (
                                            <span className="text-xs text-gray-400 italic">No actions available</span>
                                        )}
                                    </div>
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
                        disabled={page === 1 || loading}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages || loading}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Delete confirmation modal */}
            {deleteTarget && (
                <DeleteModal
                    listing={deleteTarget}
                    onConfirm={() => handleDelete(deleteTarget)}
                    onCancel={() => { setDeleteTarget(null); setDeleteError(null); }}
                    deleting={deleting}
                />
            )}
        </div>
    );
}
