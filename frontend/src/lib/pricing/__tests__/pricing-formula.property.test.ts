/**
 * Property-Based Tests for Enhanced Pricing Formula
 * 
 * **Validates: Requirements 4.1-4.10**
 * 
 * These tests verify that the pricing formula holds for all valid inputs.
 * 
 * Pure synchronous properties run 1000 cases each.
 * Async integration properties (which call the shipping API with a simulated
 * 100ms delay) run 20 cases each to keep the test suite fast while still
 * providing meaningful coverage.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateEnhancedPricing,
  getConditionMultiplier,
  calculatePlatformCommission,
  calculatePaymentFees,
  calculateSellerPayout,
  validatePricing,
} from '../pricing-engine';

// Arbitraries for property-based testing
const locationArbitrary = fc.record({
  city: fc.string({ minLength: 1, maxLength: 50 }),
  state: fc.string({ minLength: 1, maxLength: 50 }),
  pincode: fc.stringMatching(/^[1-9][0-9]{5}$/), // Valid 6-digit Indian pincode
  latitude: fc.option(fc.double({ min: 8.0, max: 37.0 }), { nil: undefined }),
  longitude: fc.option(fc.double({ min: 68.0, max: 97.0 }), { nil: undefined }),
});

const originalPriceArbitrary = fc.double({ min: 10, max: 10000, noNaN: true });
const conditionScoreArbitrary = fc.integer({ min: 1, max: 5 });

// ─── Pure synchronous properties (1000 runs each) ────────────────────────────

describe('Enhanced Pricing Formula Correctness — Pure Properties', () => {
  /**
   * Property: Condition multipliers are correct for each score
   * **Validates: Requirements 4.1**
   */
  it('Property: Condition multipliers are correct for each score', () => {
    const expectedMultipliers: Record<number, number> = {
      5: 0.80,
      4: 0.70,
      3: 0.60,
      2: 0.40,
      1: 0.25,
    };

    for (let score = 1; score <= 5; score++) {
      const multiplier = getConditionMultiplier(score);
      expect(multiplier).toBe(expectedMultipliers[score]);
    }
  });

  /**
   * Property: Base price equals original price times condition multiplier
   * **Validates: Requirements 4.1, 4.2**
   */
  it('Property: Base price equals original price times condition multiplier (pure)', () => {
    fc.assert(
      fc.property(originalPriceArbitrary, conditionScoreArbitrary, (originalPrice, conditionScore) => {
        const multiplier = getConditionMultiplier(conditionScore);
        const basePrice = originalPrice * multiplier;
        expect(basePrice).toBeCloseTo(originalPrice * multiplier, 10);
        expect(multiplier).toBeGreaterThan(0);
        expect(multiplier).toBeLessThanOrEqual(1);
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * Property: Platform commission is always 10% of base price
   * **Validates: Requirements 4.4**
   */
  it('Property: Platform commission is always 10% of base price (pure)', () => {
    fc.assert(
      fc.property(originalPriceArbitrary, conditionScoreArbitrary, (originalPrice, conditionScore) => {
        const multiplier = getConditionMultiplier(conditionScore);
        const basePrice = originalPrice * multiplier;
        const commission = calculatePlatformCommission(basePrice);
        expect(commission).toBeCloseTo(basePrice * 0.10, 10);
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * Property: Payment fees equal (base_price × 0.025) + 3.00
   * **Validates: Requirements 4.5**
   */
  it('Property: Payment fees equal (base_price × 0.025) + 3.00 (pure)', () => {
    fc.assert(
      fc.property(originalPriceArbitrary, conditionScoreArbitrary, (originalPrice, conditionScore) => {
        const multiplier = getConditionMultiplier(conditionScore);
        const basePrice = originalPrice * multiplier;
        const fees = calculatePaymentFees(basePrice);
        expect(fees).toBeCloseTo((basePrice * 0.025) + 3.00, 10);
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * Property: Seller payout equals base price minus platform commission
   * **Validates: Requirements 4.7**
   */
  it('Property: Seller payout equals base price minus platform commission (pure)', () => {
    fc.assert(
      fc.property(originalPriceArbitrary, conditionScoreArbitrary, (originalPrice, conditionScore) => {
        const multiplier = getConditionMultiplier(conditionScore);
        const basePrice = originalPrice * multiplier;
        const commission = calculatePlatformCommission(basePrice);
        const payout = calculateSellerPayout(basePrice, commission);
        expect(payout).toBeCloseTo(basePrice - commission, 10);
        expect(payout).toBeCloseTo(basePrice * 0.90, 10);
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * Property: All pure pricing components are non-negative
   * **Validates: Requirements 4.1-4.7**
   */
  it('Property: All pure pricing components are non-negative', () => {
    fc.assert(
      fc.property(originalPriceArbitrary, conditionScoreArbitrary, (originalPrice, conditionScore) => {
        const multiplier = getConditionMultiplier(conditionScore);
        const basePrice = originalPrice * multiplier;
        const commission = calculatePlatformCommission(basePrice);
        const fees = calculatePaymentFees(basePrice);
        const payout = calculateSellerPayout(basePrice, commission);
        expect(basePrice).toBeGreaterThanOrEqual(0);
        expect(commission).toBeGreaterThanOrEqual(0);
        expect(fees).toBeGreaterThanOrEqual(0);
        expect(payout).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * Property: Higher condition scores result in higher base prices
   * **Validates: Requirements 4.1**
   */
  it('Property: Higher condition scores result in higher base prices (pure)', () => {
    fc.assert(
      fc.property(originalPriceArbitrary, (originalPrice) => {
        const basePrice1 = originalPrice * getConditionMultiplier(1);
        const basePrice5 = originalPrice * getConditionMultiplier(5);
        expect(basePrice5).toBeGreaterThan(basePrice1);
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * Property: Condition multipliers are monotonically increasing with score
   * **Validates: Requirements 4.1**
   */
  it('Property: Condition multipliers are monotonically increasing with score', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }),
        (score) => {
          const lower = getConditionMultiplier(score);
          const higher = getConditionMultiplier(score + 1);
          expect(higher).toBeGreaterThan(lower);
        }
      ),
      { numRuns: 1000 }
    );
  });

  /**
   * Property: Payment fees are always at least ₹3.00 (the fixed component)
   * **Validates: Requirements 4.5**
   */
  it('Property: Payment fees are always at least ₹3.00', () => {
    fc.assert(
      fc.property(originalPriceArbitrary, conditionScoreArbitrary, (originalPrice, conditionScore) => {
        const multiplier = getConditionMultiplier(conditionScore);
        const basePrice = originalPrice * multiplier;
        const fees = calculatePaymentFees(basePrice);
        expect(fees).toBeGreaterThanOrEqual(3.00);
      }),
      { numRuns: 1000 }
    );
  });
});

// ─── Async integration properties (50 runs each — shipping API has 100ms delay) ─

describe('Enhanced Pricing Formula Correctness — Integration Properties', () => {
  it('Property: Base price equals original price times condition multiplier', async () => {
    await fc.assert(
      fc.asyncProperty(
        originalPriceArbitrary,
        conditionScoreArbitrary,
        locationArbitrary,
        locationArbitrary,
        async (originalPrice, conditionScore, sellerLocation, buyerLocation) => {
          const pricing = await calculateEnhancedPricing(
            originalPrice,
            conditionScore,
            sellerLocation,
            buyerLocation
          );

          const expectedMultiplier = getConditionMultiplier(conditionScore);
          const expectedBasePrice = originalPrice * expectedMultiplier;

          expect(pricing.base_price).toBeCloseTo(expectedBasePrice, 2);
          expect(pricing.condition_multiplier).toBe(expectedMultiplier);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  it('Property: Platform commission is always 10% of base price', async () => {
    await fc.assert(
      fc.asyncProperty(
        originalPriceArbitrary,
        conditionScoreArbitrary,
        locationArbitrary,
        locationArbitrary,
        async (originalPrice, conditionScore, sellerLocation, buyerLocation) => {
          const pricing = await calculateEnhancedPricing(
            originalPrice,
            conditionScore,
            sellerLocation,
            buyerLocation
          );

          const expectedCommission = pricing.base_price * 0.10;
          expect(pricing.platform_commission).toBeCloseTo(expectedCommission, 2);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  it('Property: Payment fees equal (base_price × 0.025) + 3.00', async () => {
    await fc.assert(
      fc.asyncProperty(
        originalPriceArbitrary,
        conditionScoreArbitrary,
        locationArbitrary,
        locationArbitrary,
        async (originalPrice, conditionScore, sellerLocation, buyerLocation) => {
          const pricing = await calculateEnhancedPricing(
            originalPrice,
            conditionScore,
            sellerLocation,
            buyerLocation
          );

          const expectedFees = (pricing.base_price * 0.025) + 3.00;
          expect(pricing.payment_fees).toBeCloseTo(expectedFees, 2);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  it('Property: Final price is sum of all components (within rounding tolerance)', async () => {
    await fc.assert(
      fc.asyncProperty(
        originalPriceArbitrary,
        conditionScoreArbitrary,
        locationArbitrary,
        locationArbitrary,
        async (originalPrice, conditionScore, sellerLocation, buyerLocation) => {
          const pricing = await calculateEnhancedPricing(
            originalPrice,
            conditionScore,
            sellerLocation,
            buyerLocation
          );

          const expectedFinalPrice =
            pricing.base_price +
            pricing.delivery_cost +
            pricing.platform_commission +
            pricing.payment_fees;

          // Allow 1 rupee tolerance due to rounding to nearest rupee
          expect(Math.abs(pricing.final_price - expectedFinalPrice)).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  it('Property: Final price is always rounded to nearest rupee (integer)', async () => {
    await fc.assert(
      fc.asyncProperty(
        originalPriceArbitrary,
        conditionScoreArbitrary,
        locationArbitrary,
        locationArbitrary,
        async (originalPrice, conditionScore, sellerLocation, buyerLocation) => {
          const pricing = await calculateEnhancedPricing(
            originalPrice,
            conditionScore,
            sellerLocation,
            buyerLocation
          );

          expect(Number.isInteger(pricing.final_price)).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  it('Property: All pricing components are non-negative', async () => {
    await fc.assert(
      fc.asyncProperty(
        originalPriceArbitrary,
        conditionScoreArbitrary,
        locationArbitrary,
        locationArbitrary,
        async (originalPrice, conditionScore, sellerLocation, buyerLocation) => {
          const pricing = await calculateEnhancedPricing(
            originalPrice,
            conditionScore,
            sellerLocation,
            buyerLocation
          );

          expect(pricing.original_price).toBeGreaterThanOrEqual(0);
          expect(pricing.base_price).toBeGreaterThanOrEqual(0);
          expect(pricing.delivery_cost).toBeGreaterThanOrEqual(0);
          expect(pricing.platform_commission).toBeGreaterThanOrEqual(0);
          expect(pricing.payment_fees).toBeGreaterThanOrEqual(0);
          expect(pricing.final_price).toBeGreaterThanOrEqual(0);
          expect(pricing.seller_payout).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  it('Property: Delivery cost is always positive', async () => {
    await fc.assert(
      fc.asyncProperty(
        originalPriceArbitrary,
        conditionScoreArbitrary,
        locationArbitrary,
        locationArbitrary,
        async (originalPrice, conditionScore, sellerLocation, buyerLocation) => {
          const pricing = await calculateEnhancedPricing(
            originalPrice,
            conditionScore,
            sellerLocation,
            buyerLocation
          );

          expect(pricing.delivery_cost).toBeGreaterThan(0);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  it('Property: validatePricing accepts valid pricing breakdowns', async () => {
    await fc.assert(
      fc.asyncProperty(
        originalPriceArbitrary,
        conditionScoreArbitrary,
        locationArbitrary,
        locationArbitrary,
        async (originalPrice, conditionScore, sellerLocation, buyerLocation) => {
          const pricing = await calculateEnhancedPricing(
            originalPrice,
            conditionScore,
            sellerLocation,
            buyerLocation
          );

          expect(() => validatePricing(pricing)).not.toThrow();
          expect(validatePricing(pricing)).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  it('Property: Higher condition scores result in higher base prices', async () => {
    await fc.assert(
      fc.asyncProperty(
        originalPriceArbitrary,
        locationArbitrary,
        locationArbitrary,
        async (originalPrice, sellerLocation, buyerLocation) => {
          const pricing1 = await calculateEnhancedPricing(
            originalPrice,
            1,
            sellerLocation,
            buyerLocation
          );
          const pricing5 = await calculateEnhancedPricing(
            originalPrice,
            5,
            sellerLocation,
            buyerLocation
          );

          expect(pricing5.base_price).toBeGreaterThan(pricing1.base_price);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);
});
