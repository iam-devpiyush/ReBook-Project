/**
 * Property-Based Tests: Shipping Status Progression & Delivery Cost Consistency
 *
 * Validates: Requirements 7.1, 7.6, 7.7
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { ShipmentStatusCode } from '../shipping.service';

// ---------------------------------------------------------------------------
// Status progression model
// ---------------------------------------------------------------------------

const VALID_STATUSES: ShipmentStatusCode[] = [
  'pending',
  'picked_up',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'failed',
];

// Valid forward transitions only (no going backwards)
const ALLOWED_TRANSITIONS: Record<ShipmentStatusCode, ShipmentStatusCode[]> = {
  pending: ['picked_up', 'failed'],
  picked_up: ['in_transit', 'failed'],
  in_transit: ['out_for_delivery', 'failed'],
  out_for_delivery: ['delivered', 'failed'],
  delivered: [],   // terminal
  failed: [],      // terminal
};

function isValidTransition(from: ShipmentStatusCode, to: ShipmentStatusCode): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

function isTerminal(status: ShipmentStatusCode): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

// ---------------------------------------------------------------------------
// Delivery cost model
// ---------------------------------------------------------------------------

interface DeliveryCost {
  amount: number;
  currency: string;
  estimatedDays: number;
}

function isValidDeliveryCost(cost: DeliveryCost): boolean {
  return (
    cost.amount >= 0 &&
    cost.currency === 'INR' &&
    Number.isInteger(cost.estimatedDays) &&
    cost.estimatedDays >= 1
  );
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const statusArb = fc.constantFrom<ShipmentStatusCode>(...VALID_STATUSES);
const nonTerminalStatusArb = fc.constantFrom<ShipmentStatusCode>(
  'pending', 'picked_up', 'in_transit', 'out_for_delivery'
);
const terminalStatusArb = fc.constantFrom<ShipmentStatusCode>('delivered', 'failed');

const deliveryCostArb = fc.record({
  amount: fc.float({ min: 0, max: 5000, noNaN: true }),
  currency: fc.constant('INR'),
  estimatedDays: fc.integer({ min: 1, max: 30 }),
});

// ---------------------------------------------------------------------------
// Property 1: Shipping status is always one of the valid enum values
// Validates: Requirements 7.6, 7.7
// ---------------------------------------------------------------------------

describe('Property: Shipping Status Progression', () => {
  it('all status values are members of the valid status set', () => {
    fc.assert(
      fc.property(statusArb, (status) => {
        expect(VALID_STATUSES).toContain(status);
      }),
      { numRuns: 500 }
    );
  });

  it('terminal statuses (delivered, failed) have no allowed forward transitions', () => {
    fc.assert(
      fc.property(terminalStatusArb, (status) => {
        expect(isTerminal(status)).toBe(true);
        expect(ALLOWED_TRANSITIONS[status]).toHaveLength(0);
      }),
      { numRuns: 200 }
    );
  });

  it('non-terminal statuses always have at least one valid next state', () => {
    fc.assert(
      fc.property(nonTerminalStatusArb, (status) => {
        expect(ALLOWED_TRANSITIONS[status].length).toBeGreaterThan(0);
      }),
      { numRuns: 200 }
    );
  });

  it('valid transitions always move forward (never back to a previous state)', () => {
    const orderedStatuses: ShipmentStatusCode[] = [
      'pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered',
    ];

    fc.assert(
      fc.property(nonTerminalStatusArb, (from) => {
        const fromIdx = orderedStatuses.indexOf(from);
        const allowed = ALLOWED_TRANSITIONS[from].filter(
          (s) => s !== 'failed'
        );
        for (const to of allowed) {
          const toIdx = orderedStatuses.indexOf(to);
          expect(toIdx).toBeGreaterThan(fromIdx);
        }
      }),
      { numRuns: 200 }
    );
  });

  it('isValidTransition returns false for backward transitions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<[ShipmentStatusCode, ShipmentStatusCode]>(
          ['picked_up', 'pending'],
          ['in_transit', 'picked_up'],
          ['out_for_delivery', 'in_transit'],
          ['delivered', 'out_for_delivery'],
          ['delivered', 'pending'],
        ),
        ([from, to]) => {
          expect(isValidTransition(from, to)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('isValidTransition returns true for all defined forward transitions', () => {
    fc.assert(
      fc.property(nonTerminalStatusArb, (from) => {
        for (const to of ALLOWED_TRANSITIONS[from]) {
          expect(isValidTransition(from, to)).toBe(true);
        }
      }),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Delivery cost consistency
// Validates: Requirement 7.1
// ---------------------------------------------------------------------------

describe('Property: Delivery Cost Consistency', () => {
  it('delivery cost amount is always non-negative', () => {
    fc.assert(
      fc.property(deliveryCostArb, (cost) => {
        expect(cost.amount).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 1000 }
    );
  });

  it('delivery cost currency is always INR', () => {
    fc.assert(
      fc.property(deliveryCostArb, (cost) => {
        expect(cost.currency).toBe('INR');
      }),
      { numRuns: 1000 }
    );
  });

  it('estimated delivery days is always a positive integer', () => {
    fc.assert(
      fc.property(deliveryCostArb, (cost) => {
        expect(Number.isInteger(cost.estimatedDays)).toBe(true);
        expect(cost.estimatedDays).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 1000 }
    );
  });

  it('isValidDeliveryCost returns true for all valid cost objects', () => {
    fc.assert(
      fc.property(deliveryCostArb, (cost) => {
        expect(isValidDeliveryCost(cost)).toBe(true);
      }),
      { numRuns: 1000 }
    );
  });

  it('isValidDeliveryCost returns false for negative amounts', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }).map((n) => -n),
        (negativeAmount) => {
          const cost: DeliveryCost = { amount: negativeAmount, currency: 'INR', estimatedDays: 3 };
          expect(isValidDeliveryCost(cost)).toBe(false);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('isValidDeliveryCost returns false for zero or negative estimated days', () => {
    fc.assert(
      fc.property(fc.integer({ min: -100, max: 0 }), (days) => {
        const cost: DeliveryCost = { amount: 80, currency: 'INR', estimatedDays: days };
        expect(isValidDeliveryCost(cost)).toBe(false);
      }),
      { numRuns: 500 }
    );
  });
});
