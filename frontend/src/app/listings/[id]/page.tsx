'use client';

import { useRouter } from 'next/navigation';
import BookDetailPage from '@/components/search/BookDetailPage';
import type { ListingWithBook } from '@/types/listing';

interface Props {
    params: { id: string };
}

export default function ListingDetailRoute({ params }: Props) {
    const { id } = params;
    const router = useRouter();

    const handlePlaceOrder = (listing: ListingWithBook) => {
        router.push(`/orders/checkout?listing_id=${listing.id}`);
    };

    const handleAddToWishlist = async (listing: ListingWithBook) => {
        try {
            await fetch('/api/wishlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ book_id: listing.book_id }),
            });
        } catch {
            // WishlistButton inside BookDetailPage handles its own state
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Back navigation */}
            <div className="bg-white border-b border-gray-200 px-4 py-3">
                <div className="max-w-5xl mx-auto">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to search
                    </button>
                </div>
            </div>

            <BookDetailPage
                listingId={id}
                onPlaceOrder={handlePlaceOrder}
                onAddToWishlist={handleAddToWishlist}
            />
        </div>
    );
}
