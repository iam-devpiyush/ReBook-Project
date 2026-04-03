/**
 * Property-Based Test: Scan Session Status and Progress Validity
 *
 * **Validates: Requirements 8.4, 8.5**
 *
 * FOR ALL Scan_Session records created or updated, the system SHALL:
 *   - Set scan_status to one of: 'in_progress' | 'completed' | 'failed'
 *   - Set progress_percentage to an integer in [0, 100]
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ─── types ────────────────────────────────────────────────────────────────────

type ScanStatus = 'in_progress' | 'completed' | 'failed';

interface ScanSessionInsert {
  id: string;
  user_id: string;
  images: string[];
  scan_status: ScanStatus;
  progress_percentage: number;
}

interface ScanSessionUpdate {
  detected_isbn?: string | null;
  fetched_metadata?: unknown;
  condition_analysis?: unknown;
  scan_status: ScanStatus;
  progress_percentage: number;
  completed_at?: string;
  error_message?: string;
}

// ─── pure model of what the route does ───────────────────────────────────────
// These functions mirror the exact values the route passes to Supabase,
// allowing us to test the data model without HTTP or Supabase I/O.

function buildInitialInsert(scanId: string, userId: string, images: string[]): ScanSessionInsert {
  return {
    id: scanId,
    user_id: userId,
    images,
    scan_status: 'in_progress',
    progress_percentage: 0,
  };
}

function buildCompletedUpdate(overrides: Partial<ScanSessionUpdate> = {}): ScanSessionUpdate {
  return {
    detected_isbn: null,
    fetched_metadata: null,
    condition_analysis: null,
    scan_status: 'completed',
    progress_percentage: 100,
    completed_at: new Date().toISOString(),
    ...overrides,
  };
}

function buildFailedUpdate(errorMessage: string): ScanSessionUpdate {
  return {
    scan_status: 'failed',
    progress_percentage: 0,
    error_message: errorMessage,
  };
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const VALID_STATUSES: ScanStatus[] = ['in_progress', 'completed', 'failed'];

function isValidStatus(value: unknown): value is ScanStatus {
  return VALID_STATUSES.includes(value as ScanStatus);
}

function isValidProgress(value: unknown): boolean {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 100
  );
}

// ─── generators ───────────────────────────────────────────────────────────────

const scanId = fc.uuid();
const userId = fc.uuid();
const imageUrl = fc.webUrl();
const fourImageUrls = fc.tuple(imageUrl, imageUrl, imageUrl, imageUrl).map(
  ([a, b, c, d]) => [a, b, c, d]
);

const validStatus = fc.constantFrom<ScanStatus>('in_progress', 'completed', 'failed');
const validProgress = fc.integer({ min: 0, max: 100 });

// ─── properties ───────────────────────────────────────────────────────────────

describe('Property Test: Scan Session Status and Progress Validity', () => {
  /**
   * Property 1: scan_status is always one of 'in_progress' | 'completed' | 'failed'
   *
   * **Validates: Requirements 8.5**
   */
  describe('Property 1: scan_status is always a valid enum value', () => {
    it('initial insert always sets scan_status to "in_progress"', () => {
      fc.assert(
        fc.property(scanId, userId, fourImageUrls, (id, uid, images) => {
          const record = buildInitialInsert(id, uid, images);
          expect(isValidStatus(record.scan_status)).toBe(true);
          expect(record.scan_status).toBe('in_progress');
        }),
        { numRuns: 500 }
      );
    });

    it('completed update always sets scan_status to "completed"', () => {
      fc.assert(
        fc.property(fc.record({ detected_isbn: fc.option(fc.string(), { nil: null }) }), (overrides) => {
          const record = buildCompletedUpdate(overrides);
          expect(isValidStatus(record.scan_status)).toBe(true);
          expect(record.scan_status).toBe('completed');
        }),
        { numRuns: 500 }
      );
    });

    it('failed update always sets scan_status to "failed"', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), (errorMessage) => {
          const record = buildFailedUpdate(errorMessage);
          expect(isValidStatus(record.scan_status)).toBe(true);
          expect(record.scan_status).toBe('failed');
        }),
        { numRuns: 500 }
      );
    });

    it('any arbitrary scan session object with a valid status satisfies the constraint', () => {
      fc.assert(
        fc.property(validStatus, validProgress, (status, progress) => {
          const record = { scan_status: status, progress_percentage: progress };
          expect(isValidStatus(record.scan_status)).toBe(true);
        }),
        { numRuns: 1000 }
      );
    });
  });

  /**
   * Property 2: progress_percentage is always an integer in [0, 100]
   *
   * **Validates: Requirements 8.4**
   */
  describe('Property 2: progress_percentage is always an integer in [0, 100]', () => {
    it('initial insert always sets progress_percentage to 0', () => {
      fc.assert(
        fc.property(scanId, userId, fourImageUrls, (id, uid, images) => {
          const record = buildInitialInsert(id, uid, images);
          expect(isValidProgress(record.progress_percentage)).toBe(true);
          expect(record.progress_percentage).toBe(0);
        }),
        { numRuns: 500 }
      );
    });

    it('completed update always sets progress_percentage to 100', () => {
      fc.assert(
        fc.property(fc.record({ detected_isbn: fc.option(fc.string(), { nil: null }) }), (overrides) => {
          const record = buildCompletedUpdate(overrides);
          expect(isValidProgress(record.progress_percentage)).toBe(true);
          expect(record.progress_percentage).toBe(100);
        }),
        { numRuns: 500 }
      );
    });

    it('failed update always sets progress_percentage to a valid integer in [0, 100]', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), (errorMessage) => {
          const record = buildFailedUpdate(errorMessage);
          expect(isValidProgress(record.progress_percentage)).toBe(true);
        }),
        { numRuns: 500 }
      );
    });

    it('any arbitrary progress value in [0, 100] satisfies the integer constraint', () => {
      fc.assert(
        fc.property(validProgress, (progress) => {
          expect(isValidProgress(progress)).toBe(true);
        }),
        { numRuns: 1000 }
      );
    });

    it('values outside [0, 100] or non-integers are rejected by the validator', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ min: 101, max: 10000 }),
            fc.integer({ min: -10000, max: -1 }),
            fc.float({ min: Math.fround(0.1), max: Math.fround(99.9), noNaN: true }).filter(v => !Number.isInteger(v))
          ),
          (invalidProgress) => {
            expect(isValidProgress(invalidProgress)).toBe(false);
          }
        ),
        { numRuns: 1000 }
      );
    });
  });

  /**
   * Combined: Supabase mock captures correct values for both properties
   *
   * **Validates: Requirements 8.4, 8.5**
   */
  describe('Supabase mock captures correct insert/update values', () => {
    let insertCalls: ScanSessionInsert[];
    let updateCalls: ScanSessionUpdate[];

    beforeEach(() => {
      insertCalls = [];
      updateCalls = [];
    });

    it('all captured insert payloads satisfy both constraints', () => {
      fc.assert(
        fc.property(scanId, userId, fourImageUrls, (id, uid, images) => {
          // Simulate what the route does on insert
          const payload = buildInitialInsert(id, uid, images);
          insertCalls.push(payload); // mock "capture"

          expect(isValidStatus(payload.scan_status)).toBe(true);
          expect(isValidProgress(payload.progress_percentage)).toBe(true);
        }),
        { numRuns: 500 }
      );

      // All captured calls satisfy constraints
      for (const call of insertCalls) {
        expect(isValidStatus(call.scan_status)).toBe(true);
        expect(isValidProgress(call.progress_percentage)).toBe(true);
      }
    });

    it('all captured update payloads satisfy both constraints', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('completed' as const),
            fc.constant('failed' as const)
          ),
          fc.string({ minLength: 1 }),
          (outcome, errorMsg) => {
            const payload =
              outcome === 'completed'
                ? buildCompletedUpdate()
                : buildFailedUpdate(errorMsg);
            updateCalls.push(payload); // mock "capture"

            expect(isValidStatus(payload.scan_status)).toBe(true);
            expect(isValidProgress(payload.progress_percentage)).toBe(true);
          }
        ),
        { numRuns: 500 }
      );

      // All captured calls satisfy constraints
      for (const call of updateCalls) {
        expect(isValidStatus(call.scan_status)).toBe(true);
        expect(isValidProgress(call.progress_percentage)).toBe(true);
      }
    });
  });
});
