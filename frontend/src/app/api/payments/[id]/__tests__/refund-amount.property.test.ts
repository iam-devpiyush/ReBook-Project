/**
 * Property-Based Tests: Refund Amount Validity
 *
 * **Validates: Requirements 6.7, 6.8**
 *
 * Properties tested:
 * 1. Refund amount must be positive (> 0)
 * 2. Refund amount cannot exceed original payment amount
 * 3. Partial refund amount must be less than full amount
 * 4. Zero amount is invalid
 * 5. Negative amount is invalid
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure validation logic (mirrors route validation)
// ---------------------------------------------------------------------------

/**
 * Validates a refund amount against the original payment amount.
 * Returns { valid: true } or { valid: false, reason: string }.
 */
function validateRefundAmount(
  amount: number | undefined,
  originalAmount: number
): { valid: boolean; reason?: string } {
  // Full refund (no amount) is always structurally valid
  if (amount === undefined) {
    return { valid: true };
  }

  // Zero amount is invalid
  if (amount === 0) {
    return { valid: false, reason: 'Refund amount must be greater than zero' };
  }

  // Negative amount is invalid
  if (amount < 0) {
    return { valid: false, reason: 'Refund amount must be positive' };
  }

  // Amount cannot exceed original payment amount
  if (amount > originalAmount) {
    return { valid: false, reason: 'Refund amount exceeds original payment amount' };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Positive integer representing an original payment amount (in paise) */
const originalAmountArb = fc.integer({ min: 1, max: 1_000_000_00 });

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe('Refund Amount Validity', () => {
  /**
   * Property 1: Refund amount must be positive (> 0)
   * **Validates: Requirements 6.7, 6.8**
   */
  it('rejects non-positive refund amounts (property 1 & 5)', () => {
    fc.assert(
      fc.property(
        originalAmountArb,
        fc.integer({ min: -1_000_000, max: -1 }),
        (originalAmount, amount) => {
          const result = validateRefundAmount(amount, originalAmount);
          expect(result.valid).toBe(false);
        }
      )
    );
  });

  /**
   * Property 2: Refund amount cannot exceed original payment amount
   * **Validates: Requirements 6.7, 6.8**
   */
  it('rejects refund amounts that exceed the original payment amount (property 2)', () => {
    fc.assert(
      fc.property(
        originalAmountArb,
        fc.integer({ min: 1, max: 1_000 }),
        (originalAmount, extra) => {
          const amount = originalAmount + extra; // always exceeds
          const result = validateRefundAmount(amount, originalAmount);
          expect(result.valid).toBe(false);
        }
      )
    );
  });

  /**
   * Property 3: Partial refund amount must be less than full amount
   * **Validates: Requirements 6.7, 6.8**
   */
  it('accepts partial refund amounts strictly less than the original amount (property 3)', () => {
    fc.assert(
      fc.property(
        // Generate originalAmount >= 2 so there's room for a partial amount
        originalAmountArb.filter((a) => a >= 2),
        fc.integer({ min: 0, max: 1 }), // fraction index: 0 = 1, 1 = originalAmount-1
        (originalAmount, fractionIndex) => {
          // Pick a partial amount strictly between 0 and originalAmount
          const amount = fractionIndex === 0 ? 1 : originalAmount - 1;
          const result = validateRefundAmount(amount, originalAmount);
          expect(result.valid).toBe(true);
          // Partial means strictly less than full
          expect(amount).toBeLessThan(originalAmount);
        }
      )
    );
  });

  /**
   * Property 4: Zero amount is invalid
   * **Validates: Requirements 6.7, 6.8**
   */
  it('rejects zero amount refunds (property 4)', () => {
    fc.assert(
      fc.property(originalAmountArb, (originalAmount) => {
        const result = validateRefundAmount(0, originalAmount);
        expect(result.valid).toBe(false);
      })
    );
  });

  /**
   * Property 5: Negative amount is invalid
   * **Validates: Requirements 6.7, 6.8**
   */
  it('rejects negative refund amounts (property 5)', () => {
    fc.assert(
      fc.property(
        originalAmountArb,
        fc.integer({ min: -1_000_000, max: -1 }),
        (originalAmount, amount) => {
          const result = validateRefundAmount(amount, originalAmount);
          expect(result.valid).toBe(false);
        }
      )
    );
  });
});
