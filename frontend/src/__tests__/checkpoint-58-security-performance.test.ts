/**
 * Checkpoint 58 – Security, Performance, and Polish Verification
 *
 * Verifies that all Phase 12 implementations (tasks 53-57) are in place and
 * behave correctly:
 *   - Rate limiting (Requirements 18.1-18.5)
 *   - Security headers in next.config.js (Requirements 17.1-17.9, 23.2)
 *   - Error handling / HTTP status codes (Requirements 19.1-19.9)
 *   - Caching with correct TTLs (Requirements 22.7, 22.8, 16.4)
 *   - Notification service (Requirements 25.1-25.7)
 *   - Performance monitoring utilities (Requirements 22.1-22.4)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------
import {
    checkRateLimit,
    applyRateLimit,
    SEARCH_RATE_LIMIT,
    LISTING_CREATION_RATE_LIMIT,
    ORDER_RATE_LIMIT,
    getClientIp,
} from '@/lib/rate-limit';

// ---------------------------------------------------------------------------
// Security / sanitization
// ---------------------------------------------------------------------------
import {
    escapeHtml,
    stripHtml,
    sanitizeText,
    sanitizeSearchQuery,
    sanitizeEmail,
    isValidPrice,
    isValidConditionScore,
} from '@/lib/security/sanitize';

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------
import {
    AppError,
    ValidationError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    PaymentError,
    ServiceUnavailableError,
    GatewayTimeoutError,
    InternalServerError,
    errorResponse,
} from '@/lib/errors';

// ---------------------------------------------------------------------------
// Caching
// ---------------------------------------------------------------------------
import { appCache, TTL, buildCacheKey } from '@/lib/cache';

// ---------------------------------------------------------------------------
// Performance monitoring
// ---------------------------------------------------------------------------
import { PERF_TARGETS, measurePerf, addTimingHeader } from '@/lib/monitoring/performance';

// ---------------------------------------------------------------------------
// Notification service (mocked – avoids real Supabase calls)
// ---------------------------------------------------------------------------
vi.mock('@supabase/supabase-js', () => {
    const sendMock = vi.fn().mockResolvedValue(undefined);
    const channelMock = vi.fn().mockReturnValue({ send: sendMock });
    return {
        createClient: vi.fn().mockReturnValue({ channel: channelMock }),
    };
});

import {
    sendNotification,
    notifyOrderConfirmed,
    notifyListingApproved,
    notifyListingRejected,
    notifyPickupScheduled,
    notifyOrderShipped,
    notifyOrderDelivered,
} from '@/services/notification.service';

// ---------------------------------------------------------------------------
// next/server mock (needed by rate-limit module)
// ---------------------------------------------------------------------------
vi.mock('next/server', () => {
    const json = vi.fn((body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
        body,
        status: init?.status ?? 200,
        headers: new Map(Object.entries(init?.headers ?? {})),
    }));
    return { NextResponse: { json } };
});

// ============================================================================
// 1. Rate Limiting
// ============================================================================

describe('Rate Limiting (Requirements 18.1-18.5)', () => {
    it('SEARCH_RATE_LIMIT is 100 requests per minute', () => {
        expect(SEARCH_RATE_LIMIT.limit).toBe(100);
        expect(SEARCH_RATE_LIMIT.windowMs).toBe(60 * 1000);
    });

    it('LISTING_CREATION_RATE_LIMIT is 10 requests per hour', () => {
        expect(LISTING_CREATION_RATE_LIMIT.limit).toBe(10);
        expect(LISTING_CREATION_RATE_LIMIT.windowMs).toBe(60 * 60 * 1000);
    });

    it('ORDER_RATE_LIMIT is 20 requests per hour', () => {
        expect(ORDER_RATE_LIMIT.limit).toBe(20);
        expect(ORDER_RATE_LIMIT.windowMs).toBe(60 * 60 * 1000);
    });

    it('allows requests within the limit', () => {
        const key = `test-allow-${Date.now()}`;
        const result = checkRateLimit(key, { limit: 5, windowMs: 60_000 });
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4);
    });

    it('blocks requests that exceed the limit', () => {
        const key = `test-block-${Date.now()}`;
        const config = { limit: 3, windowMs: 60_000 };
        checkRateLimit(key, config);
        checkRateLimit(key, config);
        checkRateLimit(key, config);
        const result = checkRateLimit(key, config);
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
    });

    it('resets the window after expiry', () => {
        const key = `test-reset-${Date.now()}`;
        const config = { limit: 1, windowMs: 1 }; // 1 ms window
        checkRateLimit(key, config); // consume the only slot
        // Wait for window to expire
        return new Promise<void>((resolve) => {
            setTimeout(() => {
                const result = checkRateLimit(key, config);
                expect(result.allowed).toBe(true);
                resolve();
            }, 10);
        });
    });

    it('applyRateLimit returns null when allowed', () => {
        const key = `apply-allow-${Date.now()}`;
        const fakeReq = { headers: { get: () => null } } as unknown as import('next/server').NextRequest;
        const result = applyRateLimit(fakeReq, key, { limit: 10, windowMs: 60_000 });
        expect(result).toBeNull();
    });

    it('applyRateLimit returns 429 response when exceeded', () => {
        const key = `apply-block-${Date.now()}`;
        const config = { limit: 1, windowMs: 60_000 };
        const fakeReq = { headers: { get: () => null } } as unknown as import('next/server').NextRequest;
        applyRateLimit(fakeReq, key, config); // consume
        const response = applyRateLimit(fakeReq, key, config);
        expect(response).not.toBeNull();
        expect((response as any).status).toBe(429);
    });

    it('getClientIp reads x-forwarded-for header', () => {
        const fakeReq = {
            headers: { get: (h: string) => (h === 'x-forwarded-for' ? '1.2.3.4, 5.6.7.8' : null) },
        } as unknown as import('next/server').NextRequest;
        expect(getClientIp(fakeReq)).toBe('1.2.3.4');
    });
});

// ============================================================================
// 2. Security Headers (next.config.js)
// ============================================================================

describe('Security Headers (Requirements 17.1-17.9, 23.2)', () => {
    // We read the config file content to verify headers are declared
    it('next.config.js declares X-Frame-Options: DENY', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const configPath = path.resolve(__dirname, '../../next.config.js');
        const content = fs.readFileSync(configPath, 'utf-8');
        expect(content).toContain('X-Frame-Options');
        expect(content).toContain('DENY');
    });

    it('next.config.js declares X-Content-Type-Options: nosniff', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const configPath = path.resolve(__dirname, '../../next.config.js');
        const content = fs.readFileSync(configPath, 'utf-8');
        expect(content).toContain('X-Content-Type-Options');
        expect(content).toContain('nosniff');
    });

    it('next.config.js declares Strict-Transport-Security (HSTS)', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const configPath = path.resolve(__dirname, '../../next.config.js');
        const content = fs.readFileSync(configPath, 'utf-8');
        expect(content).toContain('Strict-Transport-Security');
        expect(content).toContain('max-age=');
    });

    it('next.config.js declares Content-Security-Policy', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const configPath = path.resolve(__dirname, '../../next.config.js');
        const content = fs.readFileSync(configPath, 'utf-8');
        expect(content).toContain('Content-Security-Policy');
        expect(content).toContain("default-src 'self'");
    });

    it('next.config.js declares X-XSS-Protection', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const configPath = path.resolve(__dirname, '../../next.config.js');
        const content = fs.readFileSync(configPath, 'utf-8');
        expect(content).toContain('X-XSS-Protection');
    });

    it('next.config.js declares Referrer-Policy', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const configPath = path.resolve(__dirname, '../../next.config.js');
        const content = fs.readFileSync(configPath, 'utf-8');
        expect(content).toContain('Referrer-Policy');
    });
});

// ============================================================================
// 3. Input Sanitization
// ============================================================================

describe('Input Sanitization (Requirements 17.8-17.9)', () => {
    it('escapeHtml encodes < > & " characters', () => {
        expect(escapeHtml('<script>alert("xss")</script>')).toBe(
            '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
        );
    });

    it('stripHtml removes all HTML tags', () => {
        expect(stripHtml('<b>Hello</b> <i>World</i>')).toBe('Hello World');
    });

    it('sanitizeText strips HTML and collapses whitespace', () => {
        expect(sanitizeText('  <b>Hello</b>   World  ')).toBe('Hello World');
    });

    it('sanitizeSearchQuery limits length to maxLength', () => {
        const long = 'a'.repeat(300);
        expect(sanitizeSearchQuery(long, 200).length).toBe(200);
    });

    it('sanitizeEmail returns lowercase valid email', () => {
        expect(sanitizeEmail('User@Example.COM')).toBe('user@example.com');
    });

    it('sanitizeEmail returns null for invalid email', () => {
        expect(sanitizeEmail('not-an-email')).toBeNull();
    });

    it('isValidPrice rejects zero and negative values', () => {
        expect(isValidPrice(0)).toBe(false);
        expect(isValidPrice(-10)).toBe(false);
        expect(isValidPrice(99.99)).toBe(true);
    });

    it('isValidConditionScore accepts 1-5 integers only', () => {
        expect(isValidConditionScore(0)).toBe(false);
        expect(isValidConditionScore(6)).toBe(false);
        expect(isValidConditionScore(3)).toBe(true);
        expect(isValidConditionScore(3.5)).toBe(false);
    });
});

// ============================================================================
// 4. Error Handling – HTTP Status Codes (Requirements 19.1-19.9)
// ============================================================================

describe('Error Handling – HTTP Status Codes (Requirements 19.1-19.9)', () => {
    it('ValidationError has status 400', () => {
        expect(new ValidationError('bad input').statusCode).toBe(400);
    });

    it('UnauthorizedError has status 401', () => {
        expect(new UnauthorizedError().statusCode).toBe(401);
    });

    it('ForbiddenError has status 403', () => {
        expect(new ForbiddenError().statusCode).toBe(403);
    });

    it('NotFoundError has status 404', () => {
        expect(new NotFoundError('Book').statusCode).toBe(404);
    });

    it('ConflictError has status 409', () => {
        expect(new ConflictError('duplicate').statusCode).toBe(409);
    });

    it('RateLimitError has status 429', () => {
        expect(new RateLimitError().statusCode).toBe(429);
    });

    it('PaymentError has status 402', () => {
        expect(new PaymentError('payment failed').statusCode).toBe(402);
    });

    it('ServiceUnavailableError has status 503', () => {
        expect(new ServiceUnavailableError('Meilisearch').statusCode).toBe(503);
    });

    it('GatewayTimeoutError has status 504', () => {
        expect(new GatewayTimeoutError('Shipping API').statusCode).toBe(504);
    });

    it('InternalServerError has status 500', () => {
        expect(new InternalServerError().statusCode).toBe(500);
    });

    it('errorResponse returns correct status for AppError', () => {
        const response = errorResponse(new NotFoundError('Listing')) as any;
        expect(response.status).toBe(404);
    });

    it('errorResponse returns 500 for unknown errors', () => {
        const response = errorResponse(new Error('unexpected')) as any;
        expect(response.status).toBe(500);
    });
});

// ============================================================================
// 5. Caching – TTLs and Operations (Requirements 22.7, 22.8, 16.4)
// ============================================================================

describe('Caching (Requirements 22.7, 22.8, 16.4)', () => {
    beforeEach(() => {
        appCache.clear();
    });

    it('TTL.SEARCH is 5 minutes', () => {
        expect(TTL.SEARCH).toBe(5 * 60 * 1000);
    });

    it('TTL.BOOK_DETAIL is 1 hour', () => {
        expect(TTL.BOOK_DETAIL).toBe(60 * 60 * 1000);
    });

    it('TTL.CATEGORIES is 24 hours', () => {
        expect(TTL.CATEGORIES).toBe(24 * 60 * 60 * 1000);
    });

    it('TTL.PLATFORM_STATS is 15 minutes', () => {
        expect(TTL.PLATFORM_STATS).toBe(15 * 60 * 1000);
    });

    it('set and get returns cached value within TTL', () => {
        appCache.set('test-key', { foo: 'bar' }, TTL.SEARCH);
        expect(appCache.get('test-key')).toEqual({ foo: 'bar' });
    });

    it('get returns null for expired entries', () => {
        appCache.set('expired-key', 'value', 1); // 1 ms TTL
        return new Promise<void>((resolve) => {
            setTimeout(() => {
                expect(appCache.get('expired-key')).toBeNull();
                resolve();
            }, 10);
        });
    });

    it('invalidate removes a specific key', () => {
        appCache.set('inv-key', 'data', TTL.SEARCH);
        appCache.invalidate('inv-key');
        expect(appCache.get('inv-key')).toBeNull();
    });

    it('invalidatePrefix removes all matching keys', () => {
        appCache.set('search:q=books', 'r1', TTL.SEARCH);
        appCache.set('search:q=novels', 'r2', TTL.SEARCH);
        appCache.set('book:123', 'detail', TTL.BOOK_DETAIL);
        appCache.invalidatePrefix('search:');
        expect(appCache.get('search:q=books')).toBeNull();
        expect(appCache.get('search:q=novels')).toBeNull();
        expect(appCache.get('book:123')).toBe('detail');
    });

    it('buildCacheKey produces deterministic sorted keys', () => {
        const k1 = buildCacheKey('search', { q: 'books', page: 1 });
        const k2 = buildCacheKey('search', { page: 1, q: 'books' });
        expect(k1).toBe(k2);
        expect(k1).toContain('search:');
    });

    it('has returns true for valid cached entry', () => {
        appCache.set('has-key', 42, TTL.SEARCH);
        expect(appCache.has('has-key')).toBe(true);
    });

    it('size reflects number of entries', () => {
        appCache.set('a', 1, TTL.SEARCH);
        appCache.set('b', 2, TTL.SEARCH);
        expect(appCache.size).toBe(2);
    });
});

// ============================================================================
// 6. Performance Monitoring (Requirements 22.1-22.4)
// ============================================================================

describe('Performance Monitoring (Requirements 22.1-22.4)', () => {
    it('PERF_TARGETS.SEARCH is 200ms', () => {
        expect(PERF_TARGETS.SEARCH).toBe(200);
    });

    it('PERF_TARGETS.BOOK_DETAIL is 300ms', () => {
        expect(PERF_TARGETS.BOOK_DETAIL).toBe(300);
    });

    it('PERF_TARGETS.AI_SCAN is 10000ms', () => {
        expect(PERF_TARGETS.AI_SCAN).toBe(10_000);
    });

    it('PERF_TARGETS.ORDER is 1000ms', () => {
        expect(PERF_TARGETS.ORDER).toBe(1_000);
    });

    it('measurePerf returns result and elapsedMs', async () => {
        const { result, elapsedMs } = await measurePerf('test', 'SEARCH', async () => 42);
        expect(result).toBe(42);
        expect(elapsedMs).toBeGreaterThanOrEqual(0);
    });

    it('addTimingHeader sets X-Response-Time header', () => {
        const headers = new Headers();
        addTimingHeader(headers, 150, 'SEARCH');
        expect(headers.get('X-Response-Time')).toBe('150ms');
        expect(headers.get('X-Perf-Target')).toBe('200ms');
        expect(headers.get('X-Perf-Status')).toBe('ok');
    });

    it('addTimingHeader marks slow when over budget', () => {
        const headers = new Headers();
        addTimingHeader(headers, 500, 'SEARCH');
        expect(headers.get('X-Perf-Status')).toBe('slow');
    });
});

// ============================================================================
// 7. Notification Service (Requirements 25.1-25.7)
// ============================================================================

describe('Notification Service (Requirements 25.1-25.7)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Ensure env vars are set for the service
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    });

    it('sendNotification returns success on first attempt', async () => {
        const result = await sendNotification({
            type: 'order_confirmed',
            userId: 'user-1',
            title: 'Order Confirmed',
            message: 'Your order is confirmed.',
        });
        expect(result.success).toBe(true);
        expect(result.attempts).toBe(1);
    });

    it('notifyOrderConfirmed sends order_confirmed notification', async () => {
        const result = await notifyOrderConfirmed('buyer-1', 'order-1', 'Clean Code');
        expect(result.success).toBe(true);
    });

    it('notifyListingApproved sends listing_approved notification', async () => {
        const result = await notifyListingApproved('seller-1', 'listing-1', 'The Pragmatic Programmer');
        expect(result.success).toBe(true);
    });

    it('notifyListingRejected sends listing_rejected notification', async () => {
        const result = await notifyListingRejected(
            'seller-1',
            'listing-1',
            'Bad Book',
            'Poor condition'
        );
        expect(result.success).toBe(true);
    });

    it('notifyPickupScheduled sends pickup_scheduled notification', async () => {
        const result = await notifyPickupScheduled('seller-1', 'order-1', '2024-12-25');
        expect(result.success).toBe(true);
    });

    it('notifyOrderShipped sends notifications to both buyer and seller', async () => {
        const [buyerResult, sellerResult] = await notifyOrderShipped(
            'buyer-1',
            'seller-1',
            'order-1',
            'TRACK123'
        );
        expect(buyerResult.success).toBe(true);
        expect(sellerResult.success).toBe(true);
    });

    it('notifyOrderDelivered sends delivered notification', async () => {
        const result = await notifyOrderDelivered('buyer-1', 'order-1', 'Design Patterns');
        expect(result.success).toBe(true);
    });

    it('sendNotification retries on failure and returns failure after max attempts', async () => {
        const { createClient } = await import('@supabase/supabase-js');
        const sendMock = vi.fn().mockRejectedValue(new Error('Network error'));
        (createClient as ReturnType<typeof vi.fn>).mockReturnValue({
            channel: vi.fn().mockReturnValue({ send: sendMock }),
        });

        const result = await sendNotification({
            type: 'delivered',
            userId: 'user-fail',
            title: 'Test',
            message: 'Test message',
        });

        expect(result.success).toBe(false);
        expect(result.attempts).toBe(3);
        expect(result.error).toBeDefined();
    });
});
