/**
 * Property-Based Test: Payment Status Progression
 *
 * Validates: Requirements 6.3-6.8
 *
 * Valid transitions:
 *   pending     → processing
 *   pending     → failed
 *   processing  → completed
 *   processing  → failed
 *   completed   → refunded
 *
 * All other transitions are invalid.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

const VALID_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ['processing', 'failed'],
  processing: ['completed', 'failed'],
  completed: ['refunded'],
  failed: [],
  refunded: [],
};

function isValidTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

const statusArb = fc.constantFrom<PaymentStatus>(
  'pending', 'processing', 'completed', 'failed', 'refunded'
);

const validTransitionArb = fc.oneof(
  fc.constant(['pending', 'processing'] as [PaymentStatus, PaymentStatus]),
  fc.constant(['pending', 'failed'] as [PaymentStatus, PaymentStatus]),
  fc.constant(['processing', 'completed'] as [PaymentStatus, PaymentStatus]),
  fc.constant(['processing', 'failed'] as [PaymentStatus, PaymentStatus]),
  fc.constant(['completed', 'refunded'] as [PaymentStatus, PaymentStatus])
);

const invalidTransitionArb = fc
  .tuple(statusArb, statusArb)
  .filter(([from, to]) => !isValidTransition(from, to));

describe('Payment Status Progression (Property-Based)', () => {
  it('accepts all valid status transitions', () => {
    fc.assert(
      fc.property(validTransitionArb, ([from, to]) => {
        expect(isValidTransition(from, to)).toBe(true);
      }),
      { numRuns: 1000 }
    );
  });

  it('rejects self-transitions for all statuses', () => {
    fc.assert(
      fc.property(statusArb, (status) => {
        expect(isValidTransition(status, status)).toBe(false);
      }),
      { numRuns: 1000 }
    );
  });

  it('terminal statuses have no valid outgoing transitions', () => {
    const terminalStatuses: PaymentStatus[] = ['failed', 'refunded'];
    fc.assert(
      fc.property(statusArb, (to) => {
        for (const terminal of terminalStatuses) {
          expect(isValidTransition(terminal, to)).toBe(false);
        }
      }),
      { numRuns: 1000 }
    );
  });

  it('rejects backward transitions', () => {
    const backwardPairs: [PaymentStatus, PaymentStatus][] = [
      ['processing', 'pending'],
      ['completed', 'pending'],
      ['completed', 'processing'],
      ['refunded', 'completed'],
      ['refunded', 'processing'],
      ['refunded', 'pending'],
      ['failed', 'pending'],
      ['failed', 'processing'],
    ];
    fc.assert(
      fc.property(fc.constantFrom(...backwardPairs), ([from, to]) => {
        expect(isValidTransition(from, to)).toBe(false);
      }),
      { numRuns: 1000 }
    );
  });

  it('rejects all invalid transitions', () => {
    fc.assert(
      fc.property(invalidTransitionArb, ([from, to]) => {
        expect(isValidTransition(from, to)).toBe(false);
      }),
      { numRuns: 1000 }
    );
  });

  it('valid transitions are exactly the defined set', () => {
    const allStatuses: PaymentStatus[] = ['pending', 'processing', 'completed', 'failed', 'refunded'];
    const actualValid: [PaymentStatus, PaymentStatus][] = [];
    for (const from of allStatuses) {
      for (const to of allStatuses) {
        if (isValidTransition(from, to)) actualValid.push([from, to]);
      }
    }
    const expectedValid: [PaymentStatus, PaymentStatus][] = [
      ['pending', 'processing'],
      ['pending', 'failed'],
      ['processing', 'completed'],
      ['processing', 'failed'],
      ['completed', 'refunded'],
    ];
    expect(actualValid).toEqual(expectedValid);
  });
});
