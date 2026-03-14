'use client';

/**
 * Skeleton components for loading states.
 * Requirements: UX enhancement (Task 57.1)
 */

interface SkeletonProps {
    className?: string;
}

/** Base animated skeleton block */
export function Skeleton({ className = '' }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse bg-gray-200 rounded ${className}`}
            aria-hidden="true"
        />
    );
}

/** Skeleton for a ListingCard */
export function ListingCardSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" aria-hidden="true">
            <div className="aspect-[3/4] bg-gray-200 animate-pulse" />
            <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
            </div>
        </div>
    );
}

/** Skeleton grid of listing cards */
export function ListingGridSkeleton({ count = 8 }: { count?: number }) {
    return (
        <div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
            aria-label="Loading listings..."
            aria-busy="true"
        >
            {Array.from({ length: count }).map((_, i) => (
                <ListingCardSkeleton key={i} />
            ))}
        </div>
    );
}

/** Skeleton for a table row */
export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
    return (
        <tr aria-hidden="true">
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                </td>
            ))}
        </tr>
    );
}

/** Skeleton for a stat card */
export function StatCardSkeleton() {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-5 flex items-start gap-4" aria-hidden="true">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-7 w-1/3" />
            </div>
        </div>
    );
}

/** Skeleton for a detail page (book detail, order detail) */
export function DetailPageSkeleton() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6" aria-label="Loading..." aria-busy="true">
            <div className="flex flex-col md:flex-row gap-8">
                <Skeleton className="w-full md:w-64 aspect-[3/4] rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-4">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-10 w-40" />
                </div>
            </div>
        </div>
    );
}

/** Inline spinner for buttons and small async ops */
export function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
    const sizeClass = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' }[size];
    return (
        <svg
            className={`animate-spin ${sizeClass} ${className}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
    );
}

/** Full-page loading overlay */
export function PageLoader({ message = 'Loading...' }: { message?: string }) {
    return (
        <div
            className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-gray-500"
            role="status"
            aria-label={message}
        >
            <Spinner size="lg" className="text-blue-500" />
            <p className="text-sm">{message}</p>
        </div>
    );
}
