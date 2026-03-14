'use client';

/**
 * BookDetailPage Component
 *
 * Displays full listing details: image gallery, condition, pricing breakdown,
 * seller info (no full address), and action buttons.
 *
 * Requirements: Listing detail view
 */

import { useState, useEffect } from 'react';
import ConditionBadge from '@/components/listings/ConditionBadge';
import PricingBreakdownDisplay from '@/components/listings/PricingBreakdownDisplay';
import type { ListingWithBook } from '@/types/listing';

interface BookDetailPageProps {
  listingId: string;
  onPlaceOrder?: (listing: ListingWithBook) => void;
  onAddToWishlist?: (listing: ListingWithBook) => void;
}

export default function BookDetailPage({
  listingId,
  onPlaceOrder,
  onAddToWishlist,
}: BookDetailPageProps) {
  const [listing, setListing] = useState<ListingWithBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [wishlistAdded, setWishlistAdded] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/listings/${listingId}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Listing not found');
        }
        const data = await res.json();
        setListing(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load listing');
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [listingId]);

  const handleAddToWishlist = () => {
    if (!listing) return;
    setWishlistAdded(true);
    onAddToWishlist?.(listing);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-500">Loading listing...</span>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <p className="text-red-600 font-medium">{error ?? 'Listing not found'}</p>
      </div>
    );
  }

  const images = listing.images ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image gallery */}
        <div>
          {/* Main image */}
          <div className="aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
            {images[activeImage] ? (
              <img
                src={images[activeImage]}
                alt={`${listing.book.title} — image ${activeImage + 1}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  aria-label={`View image ${i + 1}`}
                  className={`flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === activeImage ? 'border-blue-500' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          {/* Title & author */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
              {listing.book.title}
            </h1>
            <p className="text-gray-600 mt-1">by {listing.book.author}</p>
            {listing.book.publisher && (
              <p className="text-gray-400 text-sm mt-0.5">{listing.book.publisher}</p>
            )}
            {listing.book.isbn && (
              <p className="text-gray-400 text-xs mt-0.5">ISBN: {listing.book.isbn}</p>
            )}
          </div>

          {/* Condition */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1.5">Condition</p>
            <ConditionBadge conditionScore={listing.condition_score} size="md" />
          </div>

          {/* Pricing breakdown */}
          <PricingBreakdownDisplay
            originalPrice={listing.original_price}
            conditionScore={listing.condition_score}
            deliveryCost={listing.delivery_cost}
            platformCommission={listing.platform_commission}
            paymentFees={listing.payment_fees}
            finalPrice={listing.final_price}
            sellerPayout={listing.seller_payout}
          />

          {/* Seller info (no full address) */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">Seller</p>
            <div className="flex items-center gap-3">
              {listing.seller.profile_picture ? (
                <img
                  src={listing.seller.profile_picture}
                  alt={listing.seller.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  {listing.seller.name[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900">{listing.seller.name}</p>
                {listing.seller.rating != null && (
                  <p className="text-xs text-gray-500">
                    ★ {listing.seller.rating.toFixed(1)} rating
                  </p>
                )}
              </div>
            </div>
            {/* Show city/state only — no full address */}
            {listing.location && (
              <p className="text-xs text-gray-400 mt-2">
                📍 {listing.location.city}, {listing.location.state}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => onPlaceOrder?.(listing)}
              disabled={listing.status !== 'active'}
              aria-label="Place order"
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
            >
              {listing.status === 'active' ? 'Place Order' : 'Unavailable'}
            </button>

            <button
              onClick={handleAddToWishlist}
              disabled={wishlistAdded}
              aria-label={wishlistAdded ? 'Added to wishlist' : 'Add to wishlist'}
              className={`px-4 py-3 rounded-xl border-2 font-semibold transition-colors ${
                wishlistAdded
                  ? 'border-pink-400 text-pink-600 bg-pink-50'
                  : 'border-gray-300 text-gray-700 hover:border-pink-400 hover:text-pink-600'
              }`}
            >
              {wishlistAdded ? '♥' : '♡'}
            </button>
          </div>
        </div>
      </div>

      {/* Description */}
      {listing.book.description && (
        <div className="mt-8 border-t border-gray-200 pt-6">
          <h2 className="font-semibold text-gray-900 mb-2">About this book</h2>
          <p className="text-gray-600 text-sm leading-relaxed">{listing.book.description}</p>
        </div>
      )}
    </div>
  );
}
