/**
 * Performance monitoring utilities
 *
 * Tracks response times against the targets defined in Requirements 22.1-22.4:
 *   - Search queries:      200ms p95
 *   - Book detail pages:   300ms p95
 *   - AI scanning:         10 000ms p95
 *   - Order placement:     1 000ms p95
 *
 * Requirements: 22.1-22.4
 */

/** Performance budget targets in milliseconds */
export const PERF_TARGETS = {
    SEARCH: 200,
    BOOK_DETAIL: 300,
    AI_SCAN: 10_000,
    ORDER: 1_000,
} as const;

export type PerfTarget = keyof typeof PERF_TARGETS;

/**
 * Measure the duration of an async operation and warn if it exceeds the target.
 *
 * @param label   - Human-readable label for logging
 * @param target  - Performance target key from PERF_TARGETS
 * @param fn      - Async function to measure
 * @returns The result of fn, plus the elapsed time in ms
 */
export async function measurePerf<T>(
    label: string,
    target: PerfTarget,
    fn: () => Promise<T>
): Promise<{ result: T; elapsedMs: number }> {
    const start = Date.now();
    const result = await fn();
    const elapsedMs = Date.now() - start;
    const budget = PERF_TARGETS[target];

    if (elapsedMs > budget) {
        console.warn(
            `[PERF] ${label} took ${elapsedMs}ms — exceeds ${budget}ms target (${target})`
        );
    } else if (process.env.NODE_ENV === 'development') {
        console.debug(`[PERF] ${label} completed in ${elapsedMs}ms (target: ${budget}ms)`);
    }

    return { result, elapsedMs };
}

/**
 * Add X-Response-Time header to a NextResponse and log against target.
 * Call this in API route handlers to surface timing to clients.
 *
 * @param headers   - Headers object to mutate
 * @param elapsedMs - Elapsed time in ms
 * @param target    - Performance target key (optional, for logging)
 */
export function addTimingHeader(
    headers: Headers,
    elapsedMs: number,
    target?: PerfTarget
): void {
    headers.set('X-Response-Time', `${elapsedMs}ms`);
    if (target) {
        headers.set('X-Perf-Target', `${PERF_TARGETS[target]}ms`);
        headers.set('X-Perf-Status', elapsedMs <= PERF_TARGETS[target] ? 'ok' : 'slow');
    }
}
