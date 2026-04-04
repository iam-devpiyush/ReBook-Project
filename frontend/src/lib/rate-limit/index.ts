/**
 * Rate Limiting Middleware
 *
 * In-memory sliding-window rate limiter for Next.js API routes.
 *
 * Requirements:
 * - 18.1: Search — 100 requests per minute per IP
 * - 18.2: Listing creation — 10 per hour per user
 * - 18.3: Orders — 20 per hour per user
 * - 18.5: Return HTTP 429 when rate limit exceeded
 */

import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitConfig {
    /** Maximum number of requests allowed in the window */
    limit: number;
    /** Window duration in milliseconds */
    windowMs: number;
}

interface WindowEntry {
    count: number;
    resetAt: number;
}

// ---------------------------------------------------------------------------
// In-memory store (per-process; suitable for single-instance deployments)
// ---------------------------------------------------------------------------

const store = new Map<string, WindowEntry>();

/** Evict expired entries to prevent unbounded memory growth */
function evict(): void {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
        if (now >= entry.resetAt) store.delete(key);
    }
}

// Evict every 5 minutes
setInterval(evict, 5 * 60 * 1000);

// ---------------------------------------------------------------------------
// Core check function
// ---------------------------------------------------------------------------

/**
 * Check whether a key has exceeded its rate limit.
 * Returns remaining count and reset timestamp.
 */
export function checkRateLimit(
    key: string,
    config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now >= entry.resetAt) {
        // Start a new window
        const resetAt = now + config.windowMs;
        store.set(key, { count: 1, resetAt });
        return { allowed: true, remaining: config.limit - 1, resetAt };
    }

    if (entry.count >= config.limit) {
        return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count += 1;
    return { allowed: true, remaining: config.limit - entry.count, resetAt: entry.resetAt };
}

// ---------------------------------------------------------------------------
// Preset configs (Requirements 18.1-18.3)
// ---------------------------------------------------------------------------

/** 100 requests per minute per IP — for search endpoints */
export const SEARCH_RATE_LIMIT: RateLimitConfig = {
    limit: 100,
    windowMs: 60 * 1000, // 1 minute
};

/** 10 listing creations per hour per user */
export const LISTING_CREATION_RATE_LIMIT: RateLimitConfig = {
    limit: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
};

/** 20 orders per hour per user */
export const ORDER_RATE_LIMIT: RateLimitConfig = {
    limit: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
};

// ---------------------------------------------------------------------------
// Helper: extract client IP from request
// ---------------------------------------------------------------------------

export function getClientIp(request: NextRequest): string {
    return (
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown'
    );
}

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

/**
 * Apply rate limiting to a Next.js API route handler.
 *
 * @param request - Incoming request
 * @param key     - Unique identifier for the rate-limit bucket (e.g. IP or user ID)
 * @param config  - Rate limit configuration
 * @returns NextResponse with 429 if exceeded, otherwise null (proceed)
 */
export function applyRateLimit(
    _request: NextRequest,
    key: string,
    config: RateLimitConfig
): NextResponse | null {
    const result = checkRateLimit(key, config);

    const headers: Record<string, string> = {
        'X-RateLimit-Limit': String(config.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    };

    if (!result.allowed) {
        return NextResponse.json(
            {
                error: 'Too Many Requests',
                message: 'Rate limit exceeded. Please try again later.',
                retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
            },
            {
                status: 429,
                headers: {
                    ...headers,
                    'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
                },
            }
        );
    }

    return null; // allowed — caller should proceed
}
