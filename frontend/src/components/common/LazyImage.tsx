'use client';

/**
 * LazyImage component
 *
 * Wraps Next.js Image with:
 * - Lazy loading (Requirement 21.5)
 * - Supabase Storage CDN URLs (Requirement 21.3)
 * - Graceful fallback on error
 *
 * Requirements: 21.3, 21.5, 21.7
 */

import Image from 'next/image';
import { useState } from 'react';

interface LazyImageProps {
    src: string;
    alt: string;
    width: number;
    height: number;
    className?: string;
    fallbackSrc?: string;
    priority?: boolean;
}

const DEFAULT_FALLBACK = '/images/book-placeholder.png';

export default function LazyImage({
    src,
    alt,
    width,
    height,
    className = '',
    fallbackSrc = DEFAULT_FALLBACK,
    priority = false,
}: LazyImageProps) {
    const [imgSrc, setImgSrc] = useState(src);

    return (
        <Image
            src={imgSrc}
            alt={alt}
            width={width}
            height={height}
            className={className}
            // Lazy load unless marked as priority (above-the-fold)
            loading={priority ? 'eager' : 'lazy'}
            priority={priority}
            onError={() => setImgSrc(fallbackSrc)}
            // Decode asynchronously to avoid blocking the main thread
            decoding="async"
        />
    );
}
