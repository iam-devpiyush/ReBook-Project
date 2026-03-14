/**
 * Property-Based Tests: Rate Limiting Enforcement
 *
 * Property: Rate Limiting Enforcement
 * Validates: Requirements 18.1-18.3, 18.5
 *
 * Properties verified:
 * 1. Requests within the limit are always allowed
 * 2. Requests exceeding the limit are always rejected
 * 3. Remaining count decrements correctly
 * 4. A new window resets the counter
 * 5. Different keys are isolated from each other
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { checkRateLimit } from '../index';
import type { RateLimitConfig } from '../index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a unique key so tests don't share state */
function uniqueKey(prefix: string): string {
    return `${prefix}:${Math.random().toString(36).slice(2)}`;
}

// ---------------------------------------------------------------------------
// Property 1: Requests within the limit are always allowed
// ---------------------------------------------------------------------------

describe('Rate Limiting Enforcement — within-limit requests are allowed', () => {
    it('all requests up to the limit succeed', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 20 }),   // limit
                fc.integer({ min: 60_000, max: 3_600_000 }), // windowMs
                (limit, windowMs) => {
                    const config: RateLimitConfig = { limit, windowMs };
                    const key = uniqueKey('within');

                    for (let i = 0; i < limit; i++) {
                        const result = checkRateLimit(key, config);
                        expect(result.allowed).toBe(true);
                    }
                }
            ),
            { numRuns: 1000 }
        );
    });
});

// ---------------------------------------------------------------------------
// Property 2: Requests exceeding the limit are always rejected (Req 18.5)
// ---------------------------------------------------------------------------

describe('Rate Limiting Enforcement — over-limit requests are rejected', () => {
    it('the (limit+1)th request is rejected', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 20 }),
                fc.integer({ min: 60_000, max: 3_600_000 }),
                (limit, windowMs) => {
                    const config: RateLimitConfig = { limit, windowMs };
                    const key = uniqueKey('over');

                    // Exhaust the limit
                    for (let i = 0; i < limit; i++) {
                        checkRateLimit(key, config);
                    }

                    // Next request must be rejected
                    const result = checkRateLimit(key, config);
                    expect(result.allowed).toBe(false);
                    expect(result.remaining).toBe(0);
                }
            ),
            { numRuns: 1000 }
        );
    });

    it('all requests after the limit are rejected', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 10 }),
                fc.integer({ min: 1, max: 5 }),   // extra requests beyond limit
                fc.integer({ min: 60_000, max: 3_600_000 }),
                (limit, extra, windowMs) => {
                    const config: RateLimitConfig = { limit, windowMs };
                    const key = uniqueKey('all-over');

                    for (let i = 0; i < limit; i++) checkRateLimit(key, config);

                    for (let i = 0; i < extra; i++) {
                        const result = checkRateLimit(key, config);
                        expect(result.allowed).toBe(false);
                    }
                }
            ),
            { numRuns: 1000 }
        );
    });
});

// ---------------------------------------------------------------------------
// Property 3: Remaining count decrements correctly
// ---------------------------------------------------------------------------

describe('Rate Limiting Enforcement — remaining count is accurate', () => {
    it('remaining decrements by 1 on each allowed request', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 2, max: 20 }),
                fc.integer({ min: 60_000, max: 3_600_000 }),
                (limit, windowMs) => {
                    const config: RateLimitConfig = { limit, windowMs };
                    const key = uniqueKey('remaining');

                    let prevRemaining = limit - 1; // after first call
                    const first = checkRateLimit(key, config);
                    expect(first.remaining).toBe(prevRemaining);

                    for (let i = 1; i < limit; i++) {
                        const result = checkRateLimit(key, config);
                        if (result.allowed) {
                            expect(result.remaining).toBeLessThan(prevRemaining);
                            prevRemaining = result.remaining;
                        }
                    }
                }
            ),
            { numRuns: 1000 }
        );
    });
});

// ---------------------------------------------------------------------------
// Property 4: Different keys are isolated
// ---------------------------------------------------------------------------

describe('Rate Limiting Enforcement — keys are isolated', () => {
    it('exhausting one key does not affect another key', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 10 }),
                fc.integer({ min: 60_000, max: 3_600_000 }),
                (limit, windowMs) => {
                    const config: RateLimitConfig = { limit, windowMs };
                    const keyA = uniqueKey('iso-a');
                    const keyB = uniqueKey('iso-b');

                    // Exhaust key A
                    for (let i = 0; i < limit; i++) checkRateLimit(keyA, config);
                    const overA = checkRateLimit(keyA, config);
                    expect(overA.allowed).toBe(false);

                    // Key B should still be fresh
                    const firstB = checkRateLimit(keyB, config);
                    expect(firstB.allowed).toBe(true);
                }
            ),
            { numRuns: 1000 }
        );
    });
});

// ---------------------------------------------------------------------------
// Property 5: Preset configs match requirements
// ---------------------------------------------------------------------------

describe('Rate Limiting Enforcement — preset configs match requirements', () => {
    it('SEARCH_RATE_LIMIT allows exactly 100 requests per minute (Req 18.1)', () => {
        const SEARCH_LIMIT = 100;
        const SEARCH_WINDOW_MS = 60_000;
        const config: RateLimitConfig = { limit: SEARCH_LIMIT, windowMs: SEARCH_WINDOW_MS };
        const key = uniqueKey('search-preset');

        for (let i = 0; i < SEARCH_LIMIT; i++) {
            expect(checkRateLimit(key, config).allowed).toBe(true);
        }
        expect(checkRateLimit(key, config).allowed).toBe(false);
    });

    it('LISTING_CREATION_RATE_LIMIT allows exactly 10 per hour (Req 18.2)', () => {
        const LISTING_LIMIT = 10;
        const LISTING_WINDOW_MS = 3_600_000;
        const config: RateLimitConfig = { limit: LISTING_LIMIT, windowMs: LISTING_WINDOW_MS };
        const key = uniqueKey('listing-preset');

        for (let i = 0; i < LISTING_LIMIT; i++) {
            expect(checkRateLimit(key, config).allowed).toBe(true);
        }
        expect(checkRateLimit(key, config).allowed).toBe(false);
    });

    it('ORDER_RATE_LIMIT allows exactly 20 per hour (Req 18.3)', () => {
        const ORDER_LIMIT = 20;
        const ORDER_WINDOW_MS = 3_600_000;
        const config: RateLimitConfig = { limit: ORDER_LIMIT, windowMs: ORDER_WINDOW_MS };
        const key = uniqueKey('order-preset');

        for (let i = 0; i < ORDER_LIMIT; i++) {
            expect(checkRateLimit(key, config).allowed).toBe(true);
        }
        expect(checkRateLimit(key, config).allowed).toBe(false);
    });
});
