/**
 * Image Delivery Utilities
 *
 * Optimizes image delivery via Supabase Storage CDN:
 * - Public CDN URLs for non-sensitive images (Requirement 21.3)
 * - Signed URLs with expiration for private/sensitive images (Requirement 21.7)
 * - Lazy loading helpers for image galleries (Requirement 21.5)
 *
 * Requirements: 21.3, 21.5, 21.7
 */

import { createClient } from '@supabase/supabase-js';

const STORAGE_BUCKET = 'book-images';

/** Default signed URL expiry: 1 hour */
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

// ============================================================================
// CDN URL helpers (public images — Requirement 21.3)
// ============================================================================

/**
 * Build a public CDN URL for a Supabase Storage file.
 * Use for book cover images that are publicly accessible.
 */
export function getPublicImageUrl(
    supabase: ReturnType<typeof createClient>,
    filePath: string
): string {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
}

/**
 * Build public CDN URLs for an array of file paths.
 */
export function getPublicImageUrls(
    supabase: ReturnType<typeof createClient>,
    filePaths: string[]
): string[] {
    return filePaths.map((p) => getPublicImageUrl(supabase, p));
}

// ============================================================================
// Signed URL helpers (private/expiring images — Requirement 21.7)
// ============================================================================

/**
 * Generate a signed URL for a private image with a configurable expiry.
 * Use for seller-uploaded images before admin approval.
 */
export async function getSignedImageUrl(
    supabase: ReturnType<typeof createClient>,
    filePath: string,
    expiresInSeconds = SIGNED_URL_EXPIRY_SECONDS
): Promise<string | null> {
    const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(filePath, expiresInSeconds);

    if (error || !data) {
        console.error('Failed to create signed URL:', error);
        return null;
    }
    return data.signedUrl;
}

/**
 * Generate signed URLs for multiple file paths in a single batch call.
 */
export async function getSignedImageUrls(
    supabase: ReturnType<typeof createClient>,
    filePaths: string[],
    expiresInSeconds = SIGNED_URL_EXPIRY_SECONDS
): Promise<Array<{ path: string; signedUrl: string | null }>> {
    if (filePaths.length === 0) return [];

    const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrls(filePaths, expiresInSeconds);

    if (error || !data) {
        console.error('Failed to create signed URLs:', error);
        return filePaths.map((path) => ({ path, signedUrl: null }));
    }

    return data.map((item) => ({
        path: item.path,
        signedUrl: item.signedUrl ?? null,
    }));
}

// ============================================================================
// Lazy loading helpers (Requirement 21.5)
// ============================================================================

/**
 * Props to spread onto an <img> element for lazy loading.
 * Usage: <img src={url} {...lazyImageProps} />
 */
export const lazyImageProps = {
    loading: 'lazy' as const,
    decoding: 'async' as const,
};

/**
 * Build a srcSet string for responsive images served from Supabase Storage.
 * Supabase Storage supports width/height transform params via the `?width=` query.
 *
 * @param publicUrl - Base public URL from Supabase Storage
 * @param widths    - Array of widths to include in the srcSet
 */
export function buildSrcSet(publicUrl: string, widths: number[] = [200, 400, 800]): string {
    return widths
        .map((w) => `${publicUrl}?width=${w} ${w}w`)
        .join(', ');
}

/**
 * Build sizes attribute for responsive images.
 * Default: full-width on mobile, half-width on tablet, 400px on desktop.
 */
export function buildSizes(
    breakpoints: Array<{ maxWidth: number; size: string }> = [
        { maxWidth: 640, size: '100vw' },
        { maxWidth: 1024, size: '50vw' },
    ],
    defaultSize = '400px'
): string {
    const parts = breakpoints.map((b) => `(max-width: ${b.maxWidth}px) ${b.size}`);
    parts.push(defaultSize);
    return parts.join(', ');
}
