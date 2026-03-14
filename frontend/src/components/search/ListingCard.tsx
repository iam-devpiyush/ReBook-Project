'use client';

import type { ListingDocument } from '@/services/search.service';

interface ListingCardProps {
  listing: ListingDocument;
  distanceKm?: number;
  onClick?: (listing: ListingDocument) => void;
}

const CONDITION_LABELS: Record<number, { label: string; color: string }> = {
  5: { label: 'Like New', color: 'bg-green-100 text-green-700' },
  4: { label: 'Very Good', color: 'bg-blue-100 text-blue-700' },
  3: { label: 'Good', color: 'bg-yellow-100 text-yellow-700' },
  2: { label: 'Acceptable', color: 'bg-orange-100 text-orange-700' },
  1: { label: 'Poor', color: 'bg-red-100 text-red-700' },
};

export default function ListingCard({ listing, distanceKm, onClick }: ListingCardProps) {
  const formatPrice = (amount: number) =>
    `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const condition = CONDITION_LABELS[listing.condition_score] ?? { label: `Score ${listing.condition_score}`, color: 'bg-gray-100 text-gray-600' };

  // Eco: 1 book ≈ 0.033 trees
  const treesPerBook = (1 / 30).toFixed(3);

  // Estimate original price (listing price is already discounted)
  const estimatedOriginal = Math.round(listing.final_price * 1.4);

  return (
    <article
      role="article"
      aria-label={`${listing.title} by ${listing.author}`}
      onClick={() => onClick?.(listing)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(listing); } }}
      tabIndex={onClick ? 0 : undefined}
      className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}`}
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
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${condition.color}`}>
            {condition.label}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-snug">
          {listing.title}
        </h3>
        <p className="text-gray-500 text-xs mt-0.5 truncate">{listing.author}</p>

        {/* Price row */}
        <div className="flex items-baseline gap-1.5 mt-2">
          <p className="text-green-600 font-bold text-base">
            {formatPrice(listing.final_price)}
          </p>
          <p className="text-gray-400 text-xs line-through">
            {formatPrice(estimatedOriginal)}
          </p>
        </div>

        {/* Eco tag */}
        <div className="flex items-center gap-1 mt-1.5">
          <span className="text-xs text-green-600 font-medium">🌱 {treesPerBook} trees</span>
          {distanceKm !== undefined && (
            <span className="ml-auto text-xs text-gray-400">
              {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
