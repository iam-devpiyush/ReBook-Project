/**
 * Property-Based Tests for Seller Payout Calculation
 * 
 * **Validates: Requirements 4.7**
 * 
 * These tests verify that seller payout is correctly calculated as:
 * seller_payout = base_price - platform_commission
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateEnhancedPricing,
  calculateSellerPayout,
  calculatePlatformCommission,
} from '../pricing-engine';

// Arbitraries for property-based testing
const locationArbitrary = fc.record({
  city: fc.string({ minLength: 1, maxLength: 50 }),
  state: fc.string({ minLength: 1, maxLength: 50 }),
  pincode: fc.stringMatching(/^[1-9][0-9]{5}$/),
  latitude: fc.option(fc.double({ min: 8.0, max: 37.0 }), { nil: undefined }),
  longitude: fc.option(fc.double({ min: 68.0, max: 97.0 }), { nil: undefined }),
});

const originalPriceArbitrary = fc.double({ min: 10, max: 10000, noNaN: true });
const conditionScoreArbitrary = fc.integer({ min: 1, max: 5 });

describe('Seller Payout Calculation', () => {
  it('Property: Seller payout equals base price minus platform commission', async () => {
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

          const expectedPayout = pricing.base_price - pricing.platform_commission;
          expect(pricing.seller_payout).toBeCloseTo(expectedPayout, 2);
        }
      ),
      { numRuns: 10 }
    );
  }, 60000);

  it('Property: Seller payout is always 90% of base price', async () => {
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

          const expectedPayout = pricing.base_price * 0.90;
          expect(pricing.seller_payout).toBeCloseTo(expectedPayout, 2);
        }
      ),
      { numRuns: 10 }
    );
  }, 60000);

  it('Property: Seller payout is always less than base price', async () => {
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

          expect(pricing.seller_payout).toBeLessThan(pricing.base_price);
        }
      ),
      { numRuns: 10 }
    );
  }, 60000);

  it('Property: Seller payout is always positive', async () => {
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

          expect(pricing.seller_payout).toBeGreaterThan(0);
        }
      ),
      { numRuns: 10 }
    );
  }, 60000);

  it('Property: Base price equals seller payout plus platform commission', async () => {
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

          const reconstructedBasePrice = pricing.seller_payout + pricing.platform_commission;
          expect(reconstructedBasePrice).toBeCloseTo(pricing.base_price, 2);
        }
      ),
      { numRuns: 10 }
    );
  }, 60000);

  it('Property: calculateSellerPayout function produces correct result', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 10, max: 10000, noNaN: true }),
        (basePrice) => {
          const commission = calculatePlatformCommission(basePrice);
          const payout = calculateSellerPayout(basePrice, commission);

          expect(payout).toBeCloseTo(basePrice - commission, 2);
          expect(payout).toBeCloseTo(basePrice * 0.90, 2);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property: Seller payout does not depend on delivery cost', async () => {
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

          // Seller payout should only depend on base price and commission
          // Not on delivery cost, payment fees, or final price
          const expectedPayout = pricing.base_price * 0.90;
          expect(pricing.seller_payout).toBeCloseTo(expectedPayout, 2);
        }
      ),
      { numRuns: 10 }
    );
  }, 60000);

  it('Property: Seller payout does not depend on payment fees', async () => {
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

          // Seller payout should not include payment fees
          // Payment fees are paid by the buyer
          const expectedPayout = pricing.base_price - pricing.platform_commission;
          expect(pricing.seller_payout).toBeCloseTo(expectedPayout, 2);
          
          // Verify payment fees are not deducted from seller payout
          expect(pricing.seller_payout + pricing.payment_fees).not.toBeCloseTo(pricing.base_price, 2);
        }
      ),
      { numRuns: 10 }
    );
  }, 60000);

  it('Property: Higher base prices result in higher seller payouts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.double({ min: 100, max: 1000, noNaN: true }),
        fc.double({ min: 2000, max: 5000, noNaN: true }),
        conditionScoreArbitrary,
        locationArbitrary,
        locationArbitrary,
        async (lowerPrice, higherPrice, conditionScore, sellerLocation, buyerLocation) => {
          const pricingLower = await calculateEnhancedPricing(
            lowerPrice,
            conditionScore,
            sellerLocation,
            buyerLocation
          );
          const pricingHigher = await calculateEnhancedPricing(
            higherPrice,
            conditionScore,
            sellerLocation,
            buyerLocation
          );

          expect(pricingHigher.seller_payout).toBeGreaterThan(pricingLower.seller_payout);
        }
      ),
      { numRuns: 10 }
    );
  }, 60000);
});
