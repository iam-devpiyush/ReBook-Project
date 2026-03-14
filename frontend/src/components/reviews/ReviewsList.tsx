/**
 * ReviewsList Component
 *
 * Displays reviews for a user (seller) with star ratings, reviewer name,
 * date, and average rating summary.
 *
 * Requirements: 12.5, 12.6
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Reviewer {
    id: string;
    name: string;
    profile_picture?: string | null;
}

interface Review {
    id: string;
    order_id: string;
    reviewer_id: string;
    reviewee_id: string;
    rating: number;
    comment: string;
    created_at: string;
    reviewer?: Reviewer | null;
}

interface ReviewsListProps {
    userId: string;
    /** If true, shows a compact layout without pagination controls */
    compact?: boolean;
    /** Max reviews to show in compact mode */
    compactLimit?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
    const sizeClass = size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-lg' : 'text-base';
    return (
        <span className={sizeClass} aria-label={`${rating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className={star <= rating ? 'text-yellow-400' : 'text-gray-300'}>
                    ★
                </span>
            ))}
        </span>
    );
}

function AverageRatingBadge({
    average,
    total,
}: {
    average: number | null;
    total: number;
}) {
    if (total === 0 || average === null) {
        return <span className="text-sm text-gray-500">No reviews yet</span>;
    }

    return (
        <div className="flex items-center gap-2">
            <StarDisplay rating={Math.round(average)} size="md" />
            <span className="text-lg font-bold text-gray-900">{average.toFixed(1)}</span>
            <span className="text-sm text-gray-500">({total} review{total !== 1 ? 's' : ''})</span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// ReviewsList Component
// ---------------------------------------------------------------------------

export default function ReviewsList({ userId, compact = false, compactLimit = 3 }: ReviewsListProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [averageRating, setAverageRating] = useState<number | null>(null);
    const [totalReviews, setTotalReviews] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const pageSize = compact ? compactLimit : 10;

    const fetchReviews = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
            const res = await fetch(`/api/users/${userId}/reviews?${params}`);
            const json = await res.json();

            if (!res.ok) {
                setError(json.error ?? 'Failed to load reviews');
                return;
            }

            setReviews(json.data ?? []);
            setAverageRating(json.averageRating ?? null);
            setTotalReviews(json.totalReviews ?? 0);
            setTotalPages(json.pagination?.totalPages ?? 1);
        } catch {
            setError('Failed to load reviews');
        } finally {
            setLoading(false);
        }
    }, [userId, page, pageSize]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    // --- Loading skeleton ---
    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-48" />
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-gray-200 rounded-lg" />
                ))}
            </div>
        );
    }

    // --- Error state ---
    if (error) {
        return (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Average rating summary — Requirement 12.6 */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-base font-semibold text-gray-900">Reviews</h3>
                <AverageRatingBadge average={averageRating} total={totalReviews} />
            </div>

            {/* Empty state */}
            {reviews.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <p className="text-3xl mb-2" aria-hidden="true">⭐</p>
                    <p className="text-sm">No reviews yet.</p>
                </div>
            )}

            {/* Review list — Requirements 12.5 */}
            {reviews.length > 0 && (
                <ul className="space-y-4" aria-label="Reviews">
                    {reviews.map((review) => (
                        <li key={review.id} className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="flex items-start gap-3">
                                {/* Avatar */}
                                {review.reviewer?.profile_picture ? (
                                    <img
                                        src={review.reviewer.profile_picture}
                                        alt={review.reviewer.name ?? 'Reviewer'}
                                        className="w-9 h-9 rounded-full object-cover shrink-0"
                                    />
                                ) : (
                                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium shrink-0">
                                        {(review.reviewer?.name ?? 'A')[0].toUpperCase()}
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    {/* Reviewer name + date */}
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <span className="text-sm font-medium text-gray-900">
                                            {review.reviewer?.name ?? 'Anonymous'}
                                        </span>
                                        <span className="text-xs text-gray-400">{formatDate(review.created_at)}</span>
                                    </div>

                                    {/* Star rating */}
                                    <div className="mt-1">
                                        <StarDisplay rating={review.rating} />
                                    </div>

                                    {/* Comment */}
                                    <p className="mt-2 text-sm text-gray-700 leading-relaxed">{review.comment}</p>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {/* Pagination (hidden in compact mode) */}
            {!compact && totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-gray-600">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
