'use client';

/**
 * ResponsiveImage — serves appropriately sized images based on viewport.
 * Uses native <img> with srcSet for mobile bandwidth optimization.
 * Requirements: Mobile UX (Task 57.4)
 */

import { useState } from 'react';

interface ResponsiveImageProps {
    /** Base Supabase Storage URL (without size suffix) */
    src: string;
    alt: string;
    className?: string;
    /** Aspect ratio class, e.g. "aspect-[3/4]" */
    aspectClass?: string;
    /** Whether this image is above the fold (eager load) */
    priority?: boolean;
}

const FALLBACK = '/images/book-placeholder.png';

/**
 * Derives thumbnail/medium/full URLs from a Supabase Storage URL.
 * Falls back to the original src if the URL doesn't follow the expected pattern.
 */
function buildSrcSet(src: string): string {
    // If already a data URL or relative path, return as-is
    if (!src.startsWith('http')) return src;
    try {
        const url = new URL(src);
        void url; // parsed for validation only
        // Supabase Storage: /storage/v1/object/public/book-images/<filename>
        // We serve thumbnail (200w), medium (600w), full (1200w)
        const base = src.split('?')[0];
        return [
            `${base}?width=200 200w`,
            `${base}?width=600 600w`,
            `${base}?width=1200 1200w`,
        ].join(', ');
    } catch {
        return src;
    }
}

export default function ResponsiveImage({
    src,
    alt,
    className = '',
    aspectClass = 'aspect-[3/4]',
    priority = false,
}: ResponsiveImageProps) {
    const [imgSrc, setImgSrc] = useState(src);
    const [loaded, setLoaded] = useState(false);

    return (
        <div className={`relative overflow-hidden bg-gray-100 ${aspectClass}`}>
            {/* Skeleton shown until image loads */}
            {!loaded && (
                <div className="absolute inset-0 animate-pulse bg-gray-200" aria-hidden="true" />
            )}
            <img
                src={imgSrc}
                srcSet={imgSrc !== FALLBACK ? buildSrcSet(imgSrc) : undefined}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                alt={alt}
                loading={priority ? 'eager' : 'lazy'}
                decoding="async"
                onLoad={() => setLoaded(true)}
                onError={() => { setImgSrc(FALLBACK); setLoaded(true); }}
                className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
            />
        </div>
    );
}
