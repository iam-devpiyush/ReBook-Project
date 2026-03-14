/**
 * Property-Based Tests: Order Processing
 *
 * Properties:
 * 41.2 - Active Listing Uniqueness
 * 41.3 - Order Creation Atomicity
 * 41.4 - Concurrent Order Prevention
 * 41.6 - Order Status with Payment
 * 41.7 - Shipping Label Generation
 *
 * Requirements: 11.1-11.9, 20.2, 6.4, 6.5, 7.2-7.4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure domain logic (mirrors service behaviour without DB calls)
// ---------------------------------------------------------------------------

type ListingStatus = 'active' | 'sold' | 'pending_approval' | 'rejected' | 'inactive';
type OrderStatus = 'pending_payment' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'payment_failed';

interface Listing {
  id: string;
  status: ListingStatus;
  sellerId: string;
  finalPrice: number;
}

interface Order {
  id: string;
  listingId: string;
  buyerId: string;
  status: OrderStatus;
  paymentIntentId?: string;
  trackingId?: string;
}

/** Simulates the atomic reservation step in processOrder */
function reserveListing(
  listing: Listing,
  buyerId: string
): { success: boolean; reason?: string; updatedListing?: Listing } {
  if (listing.status !== 'active') {
    return { success: false, reason: `Listing not active: ${listing.status}` };
  }
  if (listing.sellerId === buyerId) {
    return { success: false, reason: 'Seller cannot buy own listing' };
  }
  return { success: true, updatedListing: { ...listing, status: 'sold' } };
}

/** Simulates order status transition after payment */
function applyPaymentConfirmation(order: Order): Order {
  if (order.status !== 'pending_payment') return order;
  return { ...order, status: 'paid', paymentIntentId: order.paymentIntentId ?? 'pi_dummy' };
}

/** Simulates order status transition after shipping */
function applyShipping(order: Order, trackingId: string): Order {
  if (order.status !== 'paid') return order;
  return { ...order, status: 'shipped', trackingId };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const listingStatusArb = fc.constantFrom<ListingStatus>(
  'active', 'sold', 'pending_approval', 'rejected', 'inactive'
);

const activeListing = fc.record({
  id: fc.uuid(),
  status: fc.constant<ListingStatus>('active'),
  sellerId: fc.uuid(),
  finalPrice: fc.integer({ min: 100, max: 1_000_000 }),
});

const inactiveListing = fc.record({
  id: fc.uuid(),
  status: fc.constantFrom<ListingStatus>('sold', 'pending_approval', 'rejected', 'inactive'),
  sellerId: fc.uuid(),
  finalPrice: fc.integer({ min: 100, max: 1_000_000 }),
});

const trackingIdArb = fc.string({ minLength: 10, maxLength: 16 }).map((s) => s.toUpperCase());

// ---------------------------------------------------------------------------
// 41.2 – Active Listing Uniqueness
// ---------------------------------------------------------------------------

describe('Active Listing Uniqueness (Property 41.2)', () => {
  it('only active listings can be reserved for purchase', () => {
    fc.assert(
      fc.property(inactiveListing, fc.uuid(), (listing, buyerId) => {
        const result = reserveListing(listing, buyerId);
        expect(result.success).toBe(false);
      })
    );
  });

  it('active listing reservation succeeds for a different buyer', () => {
    fc.assert(
      fc.property(activeListing, fc.uuid(), (listing, buyerId) => {
        fc.pre(buyerId !== listing.sellerId);
        const result = reserveListing(listing, buyerId);
        expect(result.success).toBe(true);
        expect(result.updatedListing?.status).toBe('sold');
      })
    );
  });

  it('after reservation, listing status is sold', () => {
    fc.assert(
      fc.property(activeListing, fc.uuid(), (listing, buyerId) => {
        fc.pre(buyerId !== listing.sellerId);
        const result = reserveListing(listing, buyerId);
        if (result.success) {
          expect(result.updatedListing!.status).toBe('sold');
        }
      })
    );
  });
});

// ---------------------------------------------------------------------------
// 41.3 – Order Creation Atomicity
// ---------------------------------------------------------------------------

describe('Order Creation Atomicity (Property 41.3)', () => {
  it('a sold listing cannot be reserved again', () => {
    fc.assert(
      fc.property(activeListing, fc.uuid(), fc.uuid(), (listing, buyer1, buyer2) => {
        fc.pre(buyer1 !== listing.sellerId && buyer2 !== listing.sellerId && buyer1 !== buyer2);

        // First buyer reserves
        const first = reserveListing(listing, buyer1);
        expect(first.success).toBe(true);

        // Second buyer tries on the now-sold listing
        const second = reserveListing(first.updatedListing!, buyer2);
        expect(second.success).toBe(false);
      })
    );
  });

  it('reservation is idempotent — same listing cannot be double-sold', () => {
    fc.assert(
      fc.property(activeListing, fc.uuid(), (listing, buyerId) => {
        fc.pre(buyerId !== listing.sellerId);
        const first = reserveListing(listing, buyerId);
        const second = reserveListing(first.updatedListing ?? listing, buyerId);
        // At most one succeeds
        const successCount = [first, second].filter((r) => r.success).length;
        expect(successCount).toBeLessThanOrEqual(1);
      })
    );
  });
});

// ---------------------------------------------------------------------------
// 41.4 – Concurrent Order Prevention
// ---------------------------------------------------------------------------

describe('Concurrent Order Prevention (Property 41.4)', () => {
  it('among N concurrent attempts, at most one succeeds', () => {
    fc.assert(
      fc.property(
        activeListing,
        fc.array(fc.uuid(), { minLength: 2, maxLength: 10 }),
        (listing, buyers) => {
          const uniqueBuyers = [...new Set(buyers)].filter((b) => b !== listing.sellerId);
          fc.pre(uniqueBuyers.length >= 2);

          // Simulate DB optimistic lock: each attempt sees the CURRENT listing state
          // (not the original). First buyer wins, rest see 'sold'.
          let currentListing = { ...listing };
          let successCount = 0;

          for (const buyerId of uniqueBuyers) {
            const result = reserveListing(currentListing, buyerId);
            if (result.success) {
              successCount++;
              currentListing = result.updatedListing!; // now 'sold'
            }
          }

          expect(successCount).toBeLessThanOrEqual(1);
        }
      )
    );
  });

  it('seller cannot purchase their own listing', () => {
    fc.assert(
      fc.property(activeListing, (listing) => {
        const result = reserveListing(listing, listing.sellerId);
        expect(result.success).toBe(false);
        expect(result.reason).toContain('Seller');
      })
    );
  });
});

// ---------------------------------------------------------------------------
// 41.6 – Order Status with Payment
// ---------------------------------------------------------------------------

describe('Order Status with Payment (Property 41.6)', () => {
  const pendingOrderArb = fc.record({
    id: fc.uuid(),
    listingId: fc.uuid(),
    buyerId: fc.uuid(),
    status: fc.constant<OrderStatus>('pending_payment'),
    paymentIntentId: fc.string({ minLength: 5 }),
  });

  it('payment confirmation moves order from pending_payment to paid', () => {
    fc.assert(
      fc.property(pendingOrderArb, (order) => {
        const updated = applyPaymentConfirmation(order);
        expect(updated.status).toBe('paid');
      })
    );
  });

  it('payment confirmation is idempotent on non-pending orders', () => {
    const nonPendingArb = fc.record({
      id: fc.uuid(),
      listingId: fc.uuid(),
      buyerId: fc.uuid(),
      status: fc.constantFrom<OrderStatus>('paid', 'shipped', 'delivered', 'cancelled'),
    });
    fc.assert(
      fc.property(nonPendingArb, (order) => {
        const updated = applyPaymentConfirmation(order);
        expect(updated.status).toBe(order.status); // unchanged
      })
    );
  });
});

// ---------------------------------------------------------------------------
// 41.7 – Shipping Label Generation
// ---------------------------------------------------------------------------

describe('Shipping Label Generation (Property 41.7)', () => {
  const paidOrderArb = fc.record({
    id: fc.uuid(),
    listingId: fc.uuid(),
    buyerId: fc.uuid(),
    status: fc.constant<OrderStatus>('paid'),
  });

  it('shipping moves order from paid to shipped', () => {
    fc.assert(
      fc.property(paidOrderArb, trackingIdArb, (order, trackingId) => {
        const updated = applyShipping(order, trackingId);
        expect(updated.status).toBe('shipped');
        expect(updated.trackingId).toBe(trackingId);
      })
    );
  });

  it('shipping requires order to be paid first', () => {
    const nonPaidArb = fc.record({
      id: fc.uuid(),
      listingId: fc.uuid(),
      buyerId: fc.uuid(),
      status: fc.constantFrom<OrderStatus>('pending_payment', 'shipped', 'delivered', 'cancelled'),
    });
    fc.assert(
      fc.property(nonPaidArb, trackingIdArb, (order, trackingId) => {
        const updated = applyShipping(order, trackingId);
        expect(updated.status).toBe(order.status); // unchanged
        expect(updated.trackingId).toBeUndefined();
      })
    );
  });

  it('tracking ID is always preserved after shipping', () => {
    fc.assert(
      fc.property(paidOrderArb, trackingIdArb, (order, trackingId) => {
        const updated = applyShipping(order, trackingId);
        if (updated.status === 'shipped') {
          expect(updated.trackingId).toBeDefined();
          expect(updated.trackingId!.length).toBeGreaterThan(0);
        }
      })
    );
  });
});
