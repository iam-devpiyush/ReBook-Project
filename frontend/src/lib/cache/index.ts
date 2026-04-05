/**
 * Application-level in-memory cache
 *
 * Provides TTL-based caching for:
 * - Search queries (5 min)   — Requirement 22.7
 * - Book/listing details (1 hr) — Requirement 22.8
 * - Category hierarchies (24 hr) — Requirement 22.8
 * - Platform stats (15 min)  — Requirement 16.4
 */

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number; // ms
}

/** TTL constants (milliseconds) */
export const TTL = {
    SEARCH: 30 * 1000,             // 30 seconds — short to avoid stale listings
    BOOK_DETAIL: 60 * 60 * 1000,  // 1 hour
    CATEGORIES: 24 * 60 * 60 * 1000, // 24 hours
    PLATFORM_STATS: 15 * 60 * 1000,  // 15 minutes
} as const;

class AppCache {
    private store = new Map<string, CacheEntry<unknown>>();

    /** Store a value with a given TTL */
    set<T>(key: string, data: T, ttl: number): void {
        this.store.set(key, { data, timestamp: Date.now(), ttl });
    }

    /** Retrieve a value if it hasn't expired */
    get<T>(key: string): T | null {
        const entry = this.store.get(key) as CacheEntry<T> | undefined;
        if (!entry) return null;
        if (Date.now() - entry.timestamp >= entry.ttl) {
            this.store.delete(key);
            return null;
        }
        return entry.data;
    }

    /** Check whether a key exists and is still valid */
    has(key: string): boolean {
        return this.get(key) !== null;
    }

    /** Invalidate a specific key */
    invalidate(key: string): void {
        this.store.delete(key);
    }

    /** Invalidate all keys that start with a given prefix */
    invalidatePrefix(prefix: string): void {
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) this.store.delete(key);
        }
    }

    /** Remove all expired entries (call periodically to avoid memory leaks) */
    evictExpired(): void {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (now - entry.timestamp >= entry.ttl) this.store.delete(key);
        }
    }

    /** Clear the entire cache */
    clear(): void {
        this.store.clear();
    }

    /** Number of entries currently in the cache */
    get size(): number {
        return this.store.size;
    }
}

/** Singleton cache instance shared across API routes in the same process */
export const appCache = new AppCache();

/** Build a deterministic cache key from an object of params */
export function buildCacheKey(namespace: string, params: Record<string, unknown>): string {
    const sorted = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${String(v)}`)
        .join('&');
    return `${namespace}:${sorted}`;
}
