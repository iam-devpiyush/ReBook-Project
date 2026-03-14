'use client';

import { useState, useEffect } from 'react';
import type { ListingWithBook } from '@/types/listing';
import { useCart } from '@/lib/cart/CartContext';

interface EcoImpact {
  trees_saved: number;
  water_saved_liters: number;
  co2_reduced_kg: number;
}

interface BookDetailPageProps {
  listingId: string;
  onPlaceOrder?: (listing: ListingWithBook) => void;
  onAddToWishlist?: (listing: ListingWithBook) => void;
}

const CONDITION_LABELS: Record<number, { label: string; color: string }> = {
  5: { label: 'Like New', color: 'bg-green-100 text-green-700' },
  4: { label: 'Very Good', color: 'bg-blue-100 text-blue-700' },
  3: { label: 'Good', color: 'bg-yellow-100 text-yellow-700' },
  2: { label: 'Acceptable', color: 'bg-orange-100 text-orange-700' },
  1: { label: 'Poor', color: 'bg-red-100 text-red-700' },
};

export default function BookDetailPage({ listingId, onPlaceOrder, onAddToWishlist }: BookDetailPageProps) {
  const { addItem, isInCart } = useCart();
  const [listing, setListing] = useState<ListingWithBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [wishlistAdded, setWishlistAdded] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<EcoImpact | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/listings/${listingId}`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Listing not found');
        setListing(data.data);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load listing'))
      .finally(() => setLoading(false));
  }, [listingId]);

  const handlePlaceOrder = async () => {
    if (!listing) return;
    setOrdering(true);
    setOrderError(null);
    try {
      const res = await fetch('/api/orders/instant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listing.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');
      setOrderSuccess(data.data.eco_impact);
      setListing(prev => prev ? { ...prev, status: 'sold' } : prev);
      onPlaceOrder?.(listing);
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setOrdering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
        <span className="ml-3 text-gray-500">Loading...</span>
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

  if (!listing.book) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <p className="text-red-600 font-medium">Book data unavailable for this listing.</p>
      </div>
    );
  }

  const images = listing.images ?? [];
  const condition = CONDITION_LABELS[listing.condition_score] ?? { label: `Score ${listing.condition_score}`, color: 'bg-gray-100 text-gray-600' };
  const treesPerBook = (1 / 30).toFixed(3);
  const estimatedOriginal = Math.round(listing.final_price * 1.4);
  const savePct = Math.round((1 - listing.final_price / estimatedOriginal) * 100);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Order success banner */}
      {orderSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-2xl p-5">
          <h2 className="text-lg font-bold text-green-800 mb-1">Order placed — book is yours!</h2>
          <p className="text-sm text-green-700 mb-3">Thanks for buying second-hand. Here's your environmental impact:</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white rounded-xl p-3 border border-green-100">
              <span className="text-2xl">🌳</span>
              <p className="text-lg font-bold text-green-600 mt-1">{orderSuccess.trees_saved.toFixed(3)}</p>
              <p className="text-xs text-gray-500">Trees saved</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-green-100">
              <span className="text-2xl">💧</span>
              <p className="text-lg font-bold text-blue-600 mt-1">{orderSuccess.water_saved_liters}L</p>
              <p className="text-xs text-gray-500">Water saved</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-green-100">
              <span className="text-2xl">🍃</span>
              <p className="text-lg font-bold text-emerald-600 mt-1">{orderSuccess.co2_reduced_kg}kg</p>
              <p className="text-xs text-gray-500">CO₂ reduced</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image */}
        <div>
          <div className="aspect-[3/4] bg-gray-100 rounded-2xl overflow-hidden border border-gray-200">
            {images[activeImage] ? (
              <img src={images[activeImage]} alt={listing.book.title} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button key={i} onClick={() => setActiveImage(i)}
                  className={`flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 transition-colors ${i === activeImage ? 'border-green-500' : 'border-gray-200 hover:border-gray-400'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-4">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${condition.color}`}>
              {condition.label}
            </span>
            {listing.book.publisher && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                {listing.book.publisher}
              </span>
            )}
          </div>

          {/* Title & author */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{listing.book.title}</h1>
            <p className="text-gray-500 mt-1">by {listing.book.author}</p>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-gray-900">
              ₹{listing.final_price.toLocaleString('en-IN')}
            </span>
            <span className="text-lg text-gray-400 line-through">
              ₹{estimatedOriginal.toLocaleString('en-IN')}
            </span>
            <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              Save {savePct}%
            </span>
          </div>

          {/* Eco line */}
          <p className="text-sm text-green-700 bg-green-50 rounded-xl px-4 py-2.5 border border-green-100">
            🌱 Buying this book saves <strong>{treesPerBook} trees</strong> and reduces CO₂ emissions
          </p>

          {/* Action buttons */}
          {!orderSuccess && (
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => {
                  if (!listing || listing.status !== 'active') return;
                  const inCart = isInCart(listing.id);
                  if (!inCart) {
                    addItem({
                      listingId: listing.id,
                      title: listing.book!.title,
                      author: listing.book!.author,
                      price: listing.final_price,
                      image: listing.images?.[0],
                      conditionScore: listing.condition_score,
                    });
                  }
                }}
                disabled={listing.status !== 'active'}
                className={`flex-1 py-3 font-semibold rounded-xl transition-colors ${isInCart(listing.id)
                    ? 'bg-green-50 border-2 border-green-600 text-green-700'
                    : 'bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white'
                  }`}
              >
                {listing.status !== 'active'
                  ? 'Unavailable'
                  : isInCart(listing.id)
                    ? '✓ Added to Cart'
                    : 'Add to Cart'}
              </button>
              <button
                onClick={() => { setWishlistAdded(true); onAddToWishlist?.(listing!); }}
                disabled={wishlistAdded}
                aria-label={wishlistAdded ? 'Added to wishlist' : 'Add to wishlist'}
                className={`px-4 py-3 rounded-xl border-2 font-semibold transition-colors text-lg ${wishlistAdded ? 'border-pink-400 text-pink-600 bg-pink-50' : 'border-gray-300 text-gray-700 hover:border-pink-400 hover:text-pink-600'}`}
              >
                {wishlistAdded ? '♥' : '♡'}
              </button>
            </div>
          )}

          {orderError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{orderError}</div>
          )}

          {/* Metadata table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {listing.book.isbn && (
                  <tr className="bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-600 w-36">ISBN</td>
                    <td className="px-4 py-2.5 text-gray-900 font-mono text-xs">{listing.book.isbn}</td>
                  </tr>
                )}
                {listing.book.publisher && (
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-gray-600">Publisher</td>
                    <td className="px-4 py-2.5 text-gray-900">{listing.book.publisher}</td>
                  </tr>
                )}
                <tr className="bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-600">Condition Score</td>
                  <td className="px-4 py-2.5 text-gray-900">{listing.condition_score}/5</td>
                </tr>
                {listing.damage_notes && (
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-gray-600">Damage Notes</td>
                    <td className="px-4 py-2.5 text-gray-900">{listing.damage_notes}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Description */}
      {listing.book.description && (
        <div className="mt-8 border-t border-gray-200 pt-6">
          <h2 className="font-semibold text-gray-900 mb-2">Description</h2>
          <p className="text-gray-600 text-sm leading-relaxed">{listing.book.description}</p>
        </div>
      )}
    </div>
  );
}
