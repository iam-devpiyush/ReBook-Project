'use client';

/**
 * WishlistButton Component
 *
 * Toggles a book's wishlist status with a heart icon (filled/unfilled).
 * Handles add and remove actions via the /api/wishlist endpoints.
 *
 * Requirements: 13.1, 13.4
 */

import { useState } from 'react';

interface WishlistButtonProps {
    bookId: string;
    /** Initial wishlist entry ID if the book is already wishlisted */
    wishlistEntryId?: string | null;
    /** Optional size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Optional extra class names */
    className?: string;
    /** Called after a successful add with the new entry ID */
    onAdded?: (entryId: string) => void;
    /** Called after a successful remove */
    onRemoved?: () => void;
}

const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-10 h-10 text-xl',
    lg: 'w-12 h-12 text-2xl',
};

export default function WishlistButton({
    bookId,
    wishlistEntryId: initialEntryId = null,
    size = 'md',
    className = '',
    onAdded,
    onRemoved,
}: WishlistButtonProps) {
    const [entryId, setEntryId] = useState<string | null>(initialEntryId ?? null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isWishlisted = entryId !== null;

    const handleToggle = async () => {
        if (loading) return;
        setLoading(true);
        setError(null);

        try {
            if (isWishlisted) {
                // Remove from wishlist
                const res = await fetch(`/api/wishlist/${entryId}`, { method: 'DELETE' });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error ?? 'Failed to remove from wishlist');
                }
                setEntryId(null);
                onRemoved?.();
            } else {
                // Add to wishlist
                const res = await fetch('/api/wishlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ book_id: bookId }),
                });
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error ?? 'Failed to add to wishlist');
                }
                const newEntryId: string = data.data?.id;
                setEntryId(newEntryId);
                onAdded?.(newEntryId);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative inline-flex flex-col items-center">
            <button
                onClick={handleToggle}
                disabled={loading}
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                aria-pressed={isWishlisted}
                title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                className={`
          inline-flex items-center justify-center rounded-full border-2 transition-all duration-150
          focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2
          ${sizeClasses[size]}
          ${isWishlisted
                        ? 'border-pink-500 bg-pink-50 text-pink-600 hover:bg-pink-100'
                        : 'border-gray-300 bg-white text-gray-400 hover:border-pink-400 hover:text-pink-500'
                    }
          ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
          ${className}
        `}
            >
                {loading ? (
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                    <span aria-hidden="true">{isWishlisted ? '♥' : '♡'}</span>
                )}
            </button>

            {error && (
                <p role="alert" className="absolute top-full mt-1 text-xs text-red-500 whitespace-nowrap">
                    {error}
                </p>
            )}
        </div>
    );
}
