/**
 * Property-Based Tests for Enhanced Pricing Formula
 * 
 * **Validates: Requirements 4.1-4.10**
 * 
 * These tests verify that the pricing formula holds for all valid inputs.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateEnhancedPricing,
  getConditionMultiplier,
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

describe('Enhanced Pricing Formula Correctness', () => {
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
      { numRuns: 10 }
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
      { numRuns: 10 }
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
      { numRuns: 10 }
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
      { numRuns: 10 }
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
      { numRuns: 10 }
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
      { numRuns: 10 }
    );
  }, 60000);

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
      { numRuns: 10 }
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
      { numRuns: 10 }
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
      { numRuns: 10 }
    );
  }, 60000);
});
