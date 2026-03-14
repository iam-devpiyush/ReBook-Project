/**
 * Fallback Mechanisms
 *
 * Retry logic, cached estimates, and manual fallbacks for unreliable external services.
 * Requirements: 19.2, 19.4, 19.6, 25.7
 */

// ---------------------------------------------------------------------------
// Exponential backoff retry
// ---------------------------------------------------------------------------

export interface RetryOptions {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
}

/**
 * Retry an async operation with exponential backoff.
 * Throws the last error if all attempts fail.
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const { maxAttempts = 3, baseDelayMs = 500, maxDelayMs = 10_000 } = options;

    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (attempt < maxAttempts) {
                const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
                await sleep(delay);
            }
        }
    }
    throw lastError;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Delivery cost cache + fallback
// ---------------------------------------------------------------------------

interface CachedCost {
    amount: number;
    cachedAt: number;
}

const deliveryCostCache = new Map<string, CachedCost>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function deliveryCacheKey(origin: string, destination: string): string {
    return `${origin}:${destination}`;
}

/** Store a successfully fetched delivery cost in the in-memory cache. */
export function cacheDeliveryCost(origin: string, destination: string, amount: number): void {
    deliveryCostCache.set(deliveryCacheKey(origin, destination), {
        amount,
        cachedAt: Date.now(),
    });
}

/** Return a cached delivery cost if available and not expired, otherwise null. */
export function getCachedDeliveryCost(origin: string, destination: string): number | null {
    const entry = deliveryCostCache.get(deliveryCacheKey(origin, destination));
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
        deliveryCostCache.delete(deliveryCacheKey(origin, destination));
        return null;
    }
    return entry.amount;
}

/** Default fallback cost when the shipping API is unavailable and no cache exists. */
export const FALLBACK_DELIVERY_COST = 80; // ₹80

/**
 * Fetch delivery cost with automatic caching and fallback.
 * If the shipping API fails, returns a cached value or the default fallback.
 *
 * Requirements: 19.4
 */
export async function fetchDeliveryCostWithFallback(
    fetchFn: () => Promise<number>,
    origin: string,
    destination: string
): Promise<{ amount: number; isFallback: boolean }> {
    // Try live fetch first
    try {
        const amount = await withRetry(fetchFn, { maxAttempts: 2, baseDelayMs: 300 });
        cacheDeliveryCost(origin, destination, amount);
        return { amount, isFallback: false };
    } catch {
        // Fall back to cache
        const cached = getCachedDeliveryCost(origin, destination);
        if (cached !== null) {
            return { amount: cached, isFallback: true };
        }
        // Last resort: static estimate
        return { amount: FALLBACK_DELIVERY_COST, isFallback: true };
    }
}

// ---------------------------------------------------------------------------
// Shipping label retry queue (in-memory, server-side)
// ---------------------------------------------------------------------------

export interface ShippingQueueItem {
    orderId: string;
    pickupAddress: string;
    deliveryAddress: string;
    attempts: number;
    nextRetryAt: number;
}

const shippingRetryQueue: ShippingQueueItem[] = [];

/** Enqueue a failed shipping label generation for later retry. */
export function enqueueShippingRetry(
    orderId: string,
    pickupAddress: string,
    deliveryAddress: string
): void {
    const existing = shippingRetryQueue.find((item) => item.orderId === orderId);
    if (existing) return; // already queued

    shippingRetryQueue.push({
        orderId,
        pickupAddress,
        deliveryAddress,
        attempts: 0,
        nextRetryAt: Date.now() + 5_000, // first retry after 5 s
    });
}

/** Return items that are due for retry. */
export function getDueShippingRetries(): ShippingQueueItem[] {
    const now = Date.now();
    return shippingRetryQueue.filter((item) => item.nextRetryAt <= now && item.attempts < 5);
}

/** Mark a retry attempt (success removes it; failure reschedules). */
export function markShippingRetryAttempt(orderId: string, success: boolean): void {
    const idx = shippingRetryQueue.findIndex((item) => item.orderId === orderId);
    if (idx === -1) return;

    if (success) {
        shippingRetryQueue.splice(idx, 1);
        return;
    }

    const item = shippingRetryQueue[idx];
    item.attempts += 1;
    // Exponential backoff: 5s, 10s, 20s, 40s, 80s
    item.nextRetryAt = Date.now() + 5_000 * 2 ** item.attempts;

    if (item.attempts >= 5) {
        console.error(`[ShippingQueue] Giving up on order ${orderId} after 5 attempts`);
        shippingRetryQueue.splice(idx, 1);
    }
}

// ---------------------------------------------------------------------------
// Notification retry (up to 3 attempts with exponential backoff)
// Requirements: 25.7
// ---------------------------------------------------------------------------

/**
 * Send a notification with up to 3 retry attempts using exponential backoff.
 * Logs failures but does not throw — notifications are best-effort.
 */
export async function sendNotificationWithRetry(
    sendFn: () => Promise<void>,
    context: string
): Promise<void> {
    try {
        await withRetry(sendFn, { maxAttempts: 3, baseDelayMs: 1_000 });
    } catch (err) {
        console.error(`[Notification] Failed to send notification for ${context} after 3 attempts:`, err);
    }
}

// ---------------------------------------------------------------------------
// AI condition scoring fallback
// Requirements: 19.2, 19.9
// ---------------------------------------------------------------------------

export interface ManualConditionFallback {
    conditionScore: number;
    isManual: true;
    message: string;
}

/**
 * Returns a fallback condition result when the AI scanner fails.
 * The caller should prompt the user to enter condition manually.
 */
export function getManualConditionFallback(): ManualConditionFallback {
    return {
        conditionScore: 3, // default to "Good"
        isManual: true,
        message:
            'AI condition analysis is unavailable. Please review the book and select a condition score manually.',
    };
}

/**
 * Run the AI condition analysis with a fallback to manual scoring on failure.
 * Requirements: 19.9
 */
export async function analyzeConditionWithFallback<T>(
    analyzeFn: () => Promise<T>
): Promise<T | ManualConditionFallback> {
    try {
        return await analyzeFn();
    } catch (err) {
        console.warn('[AIScanner] Condition analysis failed, falling back to manual scoring:', err);
        return getManualConditionFallback();
    }
}
