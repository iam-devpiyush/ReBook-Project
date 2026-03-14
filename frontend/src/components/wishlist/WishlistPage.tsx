'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import WishlistButton from './WishlistButton';

interface ActiveListing { id: string; final_price: number; condition_score: number; status: string; images: string[]; }
interface WishlistBook { id: string; isbn: string | null; title: string; author: string; publisher: string | null; cover_image: string | null; listings: ActiveListing[]; }
interface WishlistItem { id: string; book_id: string; created_at: string; books: WishlistBook; }

const CONDITION_LABELS: Record<number, string> = { 5: 'Like New', 4: 'Very Good', 3: 'Good', 2: 'Acceptable', 1: 'Poor' };

function formatPrice(amount: number) { return `₹${Math.round(amount).toLocaleString('en-IN')}`; }
function getActiveListing(listings: ActiveListing[]): ActiveListing | null { return listings.find(l => l.status === 'active') ?? null; }

export default function WishlistPage() {
    const [items, setItems] = useState<WishlistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchWishlist = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/wishlist');
            if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed to load wishlist'); }
            const data = await res.json();
            setItems(data.data ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load wishlist');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchWishlist(); }, [fetchWishlist]);

    const handleRemoved = (entryId: string) => setItems(prev => prev.filter(item => item.id !== entryId));

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
                <span className="ml-3 text-gray-500">Loading wishlist...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-lg mx-auto mt-16 text-center">
                <p className="text-red-600 font-medium">{error}</p>
                <button onClick={fetchWishlist} className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">Retry</button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
                My Wishlist
                {items.length > 0 && <span className="ml-2 text-base font-normal text-gray-400">({items.length})</span>}
            </h1>

            {items.length === 0 ? (
                <div className="text-center py-20">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-700 mb-2">Your wishlist is empty</h2>
                    <p className="text-gray-500 text-sm mb-6">Browse books and tap the heart icon to save them here.</p>
                    <Link href="/search" className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors">
                        Browse Books →
                    </Link>
                </div>
            ) : (
                <ul className="space-y-3">
                    {items.map(item => {
                        const book = item.books;
                        const activeListing = getActiveListing(book.listings ?? []);
                        const coverImage = activeListing?.images?.[0] ?? book.cover_image;

                        return (
                            <li key={item.id} className="flex gap-4 bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                                {/* Cover */}
                                <div className="flex-shrink-0 w-16 h-22 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                    {coverImage ? (
                                        <img src={coverImage} alt={book.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                            </svg>
                                        </div>
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <h2 className="font-semibold text-gray-900 truncate">{book.title}</h2>
                                    <p className="text-sm text-gray-500 truncate">by {book.author}</p>
                                    <div className="mt-2 flex items-center gap-3 flex-wrap">
                                        {activeListing ? (
                                            <>
                                                <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">● Available</span>
                                                <span className="text-sm font-semibold text-gray-900">{formatPrice(activeListing.final_price)}</span>
                                                <span className="text-xs text-gray-400">{CONDITION_LABELS[activeListing.condition_score] ?? `Score ${activeListing.condition_score}`}</span>
                                            </>
                                        ) : (
                                            <span className="text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">○ Not available</span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col items-end justify-between gap-2 flex-shrink-0">
                                    <WishlistButton bookId={book.id} wishlistEntryId={item.id} size="sm" onRemoved={() => handleRemoved(item.id)} />
                                    {activeListing && (
                                        <a href={`/listings/${activeListing.id}`} className="text-xs text-green-600 hover:underline whitespace-nowrap">
                                            View listing →
                                        </a>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
