/**
 * Property-Based Tests: Refund Amount Validity
 *
 * Validates: Requirements 6.7, 6.8
 *
 * Properties tested:
 * 1. Refund amount must be positive (> 0)
 * 2. Refund amount must not exceed original payment amount
 * 3. Full refund (no amount specified) is always valid if payment is completed
 * 4. Partial refund amount must be an integer (smallest currency unit)
 * 5. Zero amount refund is invalid
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure validation logic (mirrors what the route / service should enforce)
// ---------------------------------------------------------------------------

interface RefundRequest {
  amount?: number;
}

interface Payment {
  status: string;
  amount: number;
}

/**
 * Validates a refund request against the payment record.
 * Returns { valid: true } or { valid: false, reason: string }.
 */
function validateRefundAmount(
  request: RefundRequest,
  payment: Payment
): { valid: boolean; reason?: string } {
  // Full refund — always valid when payment is completed
  if (request.amount === undefined) {
    if (payment.status !== 'completed') {
      return { valid: false, reason: 'Payment is not completed' };
    }
    return { valid: true };
  }

  const { amount } = request;

  // Zero amount is invalid
  if (amount === 0) {
    return { valid: false, reason: 'Refund amount must be greater than zero' };
  }

  // Amount must be positive
  if (amount < 0) {
    return { valid: false, reason: 'Refund amount must be positive' };
  }

  // Amount must be an integer (smallest currency unit, e.g. paise)
  if (!Number.isInteger(amount)) {
    return { valid: false, reason: 'Refund amount must be an integer (smallest currency unit)' };
  }

  // Amount must not exceed original payment amount
  if (amount > payment.amount) {
    return { valid: false, reason: 'Refund amount exceeds original payment amount' };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** A completed payment with a positive integer amount */
const completedPaymentArb = fc
  .integer({ min: 1, max: 1_000_000_00 }) // up to 1 crore paise
  .map((amount) => ({ status: 'completed', amount }));

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe('Refund Amount Validity', () => {
  /**
   * Property 1: Refund amount must be positive (> 0)
   * Validates: Requirements 6.7, 6.8
   */
  it('rejects non-positive refund amounts', () => {
    fc.assert(
      fc.property(
        completedPaymentArb,
        fc.integer({ min: -1_000_000, max: 0 }),
        (payment, amount) => {
          const result = validateRefundAmount({ amount }, payment);
          expect(result.valid).toBe(false);
        }
      )
    );
  });

  /**
   * Property 2: Refund amount must not exceed original payment amount
   * Validates: Requirements 6.7, 6.8
   */
  it('rejects refund amounts that exceed the original payment amount', () => {
    fc.assert(
      fc.property(
        completedPaymentArb,
        fc.integer({ min: 1, max: 1_000 }),
        (payment, extra) => {
          const amount = payment.amount + extra; // always exceeds
          const result = validateRefundAmount({ amount }, payment);
          expect(result.valid).toBe(false);
        }
      )
    );
  });

  /**
   * Property 3: Full refund (no amount) is always valid when payment is completed
   * Validates: Requirements 6.7, 6.8
   */
  it('accepts full refund (no amount) for completed payments', () => {
    fc.assert(
      fc.property(completedPaymentArb, (payment) => {
        const result = validateRefundAmount({}, payment);
        expect(result.valid).toBe(true);
      })
    );
  });

  /**
   * Property 4: Partial refund amount must be an integer (smallest currency unit)
   * Validates: Requirements 6.7, 6.8
   */
  it('rejects non-integer partial refund amounts', () => {
    fc.assert(
      fc.property(
        completedPaymentArb,
        // Generate a fraction between 0.1 and 0.9 using integer arithmetic
        fc.integer({ min: 1, max: 9 }),
        (payment, digit) => {
          // e.g. 1.1, 2.3, 5.7 — never an integer
          const amount = 1 + digit / 10;
          const result = validateRefundAmount({ amount }, payment);
          expect(result.valid).toBe(false);
        }
      )
    );
  });

  /**
   * Property 5: Zero amount refund is invalid
   * Validates: Requirements 6.7, 6.8
   */
  it('rejects zero amount refunds', () => {
    fc.assert(
      fc.property(completedPaymentArb, (payment) => {
        const result = validateRefundAmount({ amount: 0 }, payment);
        expect(result.valid).toBe(false);
      })
    );
  });

  /**
   * Bonus: Valid partial refunds (positive integer ≤ payment amount) are accepted
   * Validates: Requirements 6.7, 6.8
   */
  it('accepts valid partial refund amounts', () => {
    fc.assert(
      fc.property(
        completedPaymentArb.filter((p) => p.amount >= 2),
        fc.integer({ min: 1, max: 100 }),
        (payment, offset) => {
          // amount is always a positive integer ≤ payment.amount
          const amount = Math.min(offset, payment.amount);
          const result = validateRefundAmount({ amount }, payment);
          expect(result.valid).toBe(true);
        }
      )
    );
  });
});
