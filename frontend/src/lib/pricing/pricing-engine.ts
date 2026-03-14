/**
 * Enhanced Pricing Engine
 * 
 * Calculates final prices including real-time delivery costs, platform commission,
 * and payment gateway fees.
 * 
 * Requirements: 4.1-4.10
 */

import { PricingBreakdown, PricingCalculationRequest, Location } from '@/types/pricing';
import { fetchDeliveryCost } from './shipping-api';

// Condition multipliers based on condition score (1-5)
const CONDITION_MULTIPLIERS: Record<number, number> = {
  5: 0.80, // Like New
  4: 0.70, // Very Good
  3: 0.60, // Good
  2: 0.40, // Acceptable
  1: 0.25, // Poor
};

// Platform commission rate (10% of base price)
const PLATFORM_COMMISSION_RATE = 0.10;

// Payment gateway fees (2.5% + ₹3.00)
const PAYMENT_FEE_PERCENTAGE = 0.025;
const PAYMENT_FEE_FIXED = 3.00;

/**
 * Get condition multiplier for a given condition score
 * 
 * @param conditionScore - Integer from 1 to 5
 * @returns Multiplier value
 */
export function getConditionMultiplier(conditionScore: number): number {
  if (conditionScore < 1 || conditionScore > 5) {
    throw new Error('Condition score must be between 1 and 5');
  }
  
  return CONDITION_MULTIPLIERS[conditionScore];
}

/**
 * Calculate platform commission
 * 
 * @param basePrice - Base price after condition multiplier
 * @returns Commission amount
 */
export function calculatePlatformCommission(basePrice: number): number {
  return basePrice * PLATFORM_COMMISSION_RATE;
}

/**
 * Calculate payment gateway fees
 * 
 * @param basePrice - Base price after condition multiplier
 * @returns Payment fees amount
 */
export function calculatePaymentFees(basePrice: number): number {
  return (basePrice * PAYMENT_FEE_PERCENTAGE) + PAYMENT_FEE_FIXED;
}

/**
 * Calculate seller payout
 * 
 * @param basePrice - Base price after condition multiplier
 * @param platformCommission - Platform commission amount
 * @returns Seller payout amount
 */
export function calculateSellerPayout(
  basePrice: number,
  platformCommission: number
): number {
  return basePrice - platformCommission;
}

/**
 * Calculate enhanced pricing with all cost components
 * 
 * Formula:
 * - base_price = original_price × condition_multiplier
 * - delivery_cost = from shipping API
 * - platform_commission = base_price × 0.10
 * - payment_fees = (base_price × 0.025) + 3.00
 * - final_price = base_price + delivery_cost + platform_commission + payment_fees
 * - seller_payout = base_price - platform_commission
 * 
 * @param originalPrice - Original book price
 * @param conditionScore - Condition score (1-5)
 * @param sellerLocation - Seller's location
 * @param buyerLocation - Buyer's location
 * @param weight - Book weight in kg (default: 0.5)
 * @returns Complete pricing breakdown
 * 
 * Requirements: 4.1-4.10
 */
export async function calculateEnhancedPricing(
  originalPrice: number,
  conditionScore: number,
  sellerLocation: Location,
  buyerLocation: Location,
  weight: number = 0.5
): Promise<PricingBreakdown> {
  // Validate inputs
  if (originalPrice <= 0) {
    throw new Error('Original price must be positive');
  }
  
  if (conditionScore < 1 || conditionScore > 5 || !Number.isInteger(conditionScore)) {
    throw new Error('Condition score must be an integer between 1 and 5');
  }

  // Step 1: Calculate base price with condition multiplier
  const conditionMultiplier = getConditionMultiplier(conditionScore);
  const basePrice = originalPrice * conditionMultiplier;

  // Step 2: Fetch real-time delivery cost from shipping API
  const deliveryCost = await fetchDeliveryCost(sellerLocation, buyerLocation, weight);

  // Step 3: Calculate platform commission (10% of base price)
  const platformCommission = calculatePlatformCommission(basePrice);

  // Step 4: Calculate payment gateway fees
  const paymentFees = calculatePaymentFees(basePrice);

  // Step 5: Calculate final price (sum of all components)
  const finalPriceRaw = basePrice + deliveryCost + platformCommission + paymentFees;
  
  // Step 6: Round final price to nearest rupee
  const finalPrice = Math.round(finalPriceRaw);

  // Step 7: Calculate seller payout
  const sellerPayout = calculateSellerPayout(basePrice, platformCommission);

  // Step 8: Return complete pricing breakdown
  return {
    original_price: originalPrice,
    condition_score: conditionScore,
    condition_multiplier: conditionMultiplier,
    base_price: basePrice,
    delivery_cost: deliveryCost,
    platform_commission: platformCommission,
    payment_fees: paymentFees,
    final_price: finalPrice,
    seller_payout: sellerPayout,
  };
}

/**
 * Calculate pricing breakdown from a request object
 * 
 * @param request - Pricing calculation request
 * @returns Complete pricing breakdown
 */
export async function calculatePricingFromRequest(
  request: PricingCalculationRequest
): Promise<PricingBreakdown> {
  return calculateEnhancedPricing(
    request.original_price,
    request.condition_score,
    request.seller_location,
    request.buyer_location,
    request.weight
  );
}

/**
 * Validate pricing breakdown for correctness
 * 
 * @param pricing - Pricing breakdown to validate
 * @returns True if valid, throws error otherwise
 */
export function validatePricing(pricing: PricingBreakdown): boolean {
  // Validate all values are non-negative
  if (pricing.original_price < 0 || pricing.base_price < 0 || 
      pricing.delivery_cost < 0 || pricing.platform_commission < 0 ||
      pricing.payment_fees < 0 || pricing.final_price < 0 || 
      pricing.seller_payout < 0) {
    throw new Error('All pricing values must be non-negative');
  }

  // Validate condition score
  if (pricing.condition_score < 1 || pricing.condition_score > 5) {
    throw new Error('Condition score must be between 1 and 5');
  }

  // Validate condition multiplier
  const expectedMultiplier = getConditionMultiplier(pricing.condition_score);
  if (Math.abs(pricing.condition_multiplier - expectedMultiplier) > 0.001) {
    throw new Error('Condition multiplier does not match condition score');
  }

  // Validate base price calculation
  const expectedBasePrice = pricing.original_price * pricing.condition_multiplier;
  if (Math.abs(pricing.base_price - expectedBasePrice) > 0.01) {
    throw new Error('Base price calculation is incorrect');
  }

  // Validate platform commission
  const expectedCommission = pricing.base_price * PLATFORM_COMMISSION_RATE;
  if (Math.abs(pricing.platform_commission - expectedCommission) > 0.01) {
    throw new Error('Platform commission calculation is incorrect');
  }

  // Validate payment fees
  const expectedFees = (pricing.base_price * PAYMENT_FEE_PERCENTAGE) + PAYMENT_FEE_FIXED;
  if (Math.abs(pricing.payment_fees - expectedFees) > 0.01) {
    throw new Error('Payment fees calculation is incorrect');
  }

  // Validate seller payout
  const expectedPayout = pricing.base_price - pricing.platform_commission;
  if (Math.abs(pricing.seller_payout - expectedPayout) > 0.01) {
    throw new Error('Seller payout calculation is incorrect');
  }

  // Validate final price (allow 1 rupee tolerance due to rounding)
  const expectedFinalPrice = pricing.base_price + pricing.delivery_cost + 
                            pricing.platform_commission + pricing.payment_fees;
  if (Math.abs(pricing.final_price - expectedFinalPrice) > 1) {
    throw new Error('Final price calculation is incorrect');
  }

  return true;
}
