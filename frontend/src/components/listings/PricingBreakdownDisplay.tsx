/**
 * PricingBreakdownDisplay Component
 * 
 * Shows complete pricing breakdown with all components:
 * - Original price
 * - Base price with condition multiplier
 * - Delivery cost
 * - Platform commission
 * - Payment fees
 * - Final price (prominently displayed)
 * - Seller payout
 * 
 * All prices formatted in Indian Rupees with ₹ symbol.
 * 
 * Requirements: 4.8, 4.9, 4.10
 */

'use client';

import { PricingBreakdown } from '@/types/pricing';

interface PricingBreakdownDisplayProps {
  pricing: PricingBreakdown;
  showSellerPayout?: boolean;
  variant?: 'default' | 'compact';
}

export default function PricingBreakdownDisplay({
  pricing,
  showSellerPayout = false,
  variant = 'default',
}: PricingBreakdownDisplayProps) {
  const formatPrice = (amount: number | undefined): string => {
    if (amount === undefined || amount === null || isNaN(amount)) return '₹0.00';
    return `₹${amount.toFixed(2)}`;
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(0)}%`;
  };

  if (variant === 'compact') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600">Original Price:</span>
          <span className="font-medium">{formatPrice(pricing.original_price)}</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600">
            Condition Adjustment ({formatPercentage(pricing.condition_multiplier)}):
          </span>
          <span className="font-medium text-green-600">
            -{formatPrice(pricing.original_price - pricing.base_price)}
          </span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600">Delivery Cost:</span>
          <span className="font-medium">{formatPrice(pricing.delivery_cost)}</span>
        </div>
        <div className="border-t border-gray-200 pt-2 mt-2">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">Final Price:</span>
            <span className="text-2xl font-bold text-blue-600">
              {formatPrice(pricing.final_price)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-bold mb-4">Pricing Breakdown</h3>

      {/* Original Price */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Original Price</span>
          <span className="font-semibold">{formatPrice(pricing.original_price)}</span>
        </div>

        {/* Condition Multiplier */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">
            Condition Multiplier ({formatPercentage(pricing.condition_multiplier)})
          </span>
          <span className="text-green-600 font-medium">
            -{formatPrice(pricing.original_price - pricing.base_price)}
          </span>
        </div>

        {/* Base Price */}
        <div className="flex justify-between items-center bg-gray-50 -mx-6 px-6 py-2">
          <span className="font-medium text-gray-700">Base Price</span>
          <span className="font-bold">{formatPrice(pricing.base_price)}</span>
        </div>

        {/* Delivery Cost */}
        <div className="flex justify-between items-center pt-2">
          <span className="text-gray-700">Delivery Cost</span>
          <span className="font-semibold">{formatPrice(pricing.delivery_cost)}</span>
        </div>

        {/* Platform Commission */}
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Platform Commission (10%)</span>
          <span className="font-semibold">{formatPrice(pricing.platform_commission)}</span>
        </div>

        {/* Payment Fees */}
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Payment Gateway Fees</span>
          <span className="font-semibold">{formatPrice(pricing.payment_fees)}</span>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-300 pt-3 mt-3">
          {/* Final Price */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-xl font-bold text-gray-900">Final Price</span>
            <span className="text-3xl font-bold text-blue-600">
              {formatPrice(pricing.final_price)}
            </span>
          </div>

          {/* Seller Payout */}
          {showSellerPayout && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-gray-600">You will receive</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    (Base price - Platform commission)
                  </div>
                </div>
                <span className="text-2xl font-bold text-green-600">
                  {formatPrice(pricing.seller_payout)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Note */}
      <div className="mt-4 text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded p-3">
        <p className="font-medium text-blue-900 mb-1">Pricing Transparency</p>
        <p>
          All costs are clearly shown. The final price includes delivery, platform fees, and
          payment processing charges.
        </p>
      </div>
    </div>
  );
}
