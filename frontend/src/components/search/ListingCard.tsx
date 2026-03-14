'use client';

/**
 * ListingCard Component
 *
 * Displays a single listing in the search results grid.
 * Shows book image, title, author, condition badge, price, and location.
 *
 * Requirements: Search results display
 */

import ConditionBadge from '@/components/listings/ConditionBadge';
import type { ListingDocument } from '@/services/search.service';

interface ListingCardProps {
  listing: ListingDocument;
  /** Distance in km from user (optional, shown when proximity sort is active) */
  distanceKm?: number;
  onClick?: (listing: ListingDocument) => void;
}

export default function ListingCard({ listing, distanceKm, onClick }: ListingCardProps) {
  const formatPrice = (amount: number) =>
    `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const handleClick = () => onClick?.(listing);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(listing);
    }
  };

  return (
    <article
      role="article"
      aria-label={`${listing.title} by ${listing.author}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
      }`}
    >
      {/* Book image */}
      <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
        {listing.images?.[0] ? (
          <img
            src={listing.images[0]}
            alt={`Cover of ${listing.title}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        )}

        {/* Condition badge overlay */}
        <div className="absolute top-2 left-2">
          <ConditionBadge conditionScore={listing.condition_score} size="sm" showLabel={false} />
        </div>
      </div>

      {/* Card body */}
      <div className="p-3">
        {/* Title */}
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-snug">
          {listing.title}
        </h3>

        {/* Author */}
        <p className="text-gray-500 text-xs mt-0.5 truncate">{listing.author}</p>

        {/* Price */}
        <p className="text-blue-700 font-bold text-base mt-2">
          {formatPrice(listing.final_price)}
        </p>

        {/* Location + distance */}
        <div className="flex items-center gap-1 mt-1.5 text-gray-400 text-xs">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">
            {listing.location.city}, {listing.location.state}
          </span>
          {distanceKm !== undefined && (
            <span className="ml-auto flex-shrink-0 text-gray-400">
              {distanceKm < 1
                ? `${Math.round(distanceKm * 1000)}m`
                : `${distanceKm.toFixed(1)}km`}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
