/**
 * Unit Tests for PricingBreakdownDisplay Component
 */

import { render, screen } from '@testing-library/react';
import PricingBreakdownDisplay from '../PricingBreakdownDisplay';
import type { PricingBreakdown } from '@/types/pricing';

describe('PricingBreakdownDisplay', () => {
  const mockPricing: PricingBreakdown = {
    original_price: 500,
    condition_score: 4,
    condition_multiplier: 0.7,
    base_price: 350,
    delivery_cost: 50,
    platform_commission: 35,
    payment_fees: 11.75,
    final_price: 447,
    seller_payout: 315,
  };

  describe('Price Display', () => {
    it('should display all pricing components with rupee symbol', () => {
      render(<PricingBreakdownDisplay pricing={mockPricing} />);
      
      expect(screen.getByText('₹500.00')).toBeInTheDocument(); // Original price
      expect(screen.getByText('₹350.00')).toBeInTheDocument(); // Base price
      expect(screen.getByText('₹50.00')).toBeInTheDocument(); // Delivery cost
      expect(screen.getByText('₹35.00')).toBeInTheDocument(); // Platform commission
      expect(screen.getByText('₹11.75')).toBeInTheDocument(); // Payment fees
      expect(screen.getByText('₹447.00')).toBeInTheDocument(); // Final price
    });

    it('should display condition multiplier as percentage', () => {
      render(<PricingBreakdownDisplay pricing={mockPricing} />);
      
      expect(screen.getByText(/70%/)).toBeInTheDocument();
    });

    it('should display condition adjustment amount', () => {
      render(<PricingBreakdownDisplay pricing={mockPricing} />);
      
      // Original - Base = 500 - 350 = 150
      expect(screen.getByText('-₹150.00')).toBeInTheDocument();
    });

    it('should prominently display final price', () => {
      render(<PricingBreakdownDisplay pricing={mockPricing} />);
      
      const finalPriceElement = screen.getByText('₹447.00');
      expect(finalPriceElement).toHaveClass('text-3xl', 'font-bold', 'text-blue-600');
    });
  });

  describe('Seller Payout Display', () => {
    it('should show seller payout when showSellerPayout is true', () => {
      render(<PricingBreakdownDisplay pricing={mockPricing} showSellerPayout={true} />);
      
      expect(screen.getByText('You will receive')).toBeInTheDocument();
      expect(screen.getByText('₹315.00')).toBeInTheDocument();
    });

    it('should hide seller payout when showSellerPayout is false', () => {
      render(<PricingBreakdownDisplay pricing={mockPricing} showSellerPayout={false} />);
      
      expect(screen.queryByText('You will receive')).not.toBeInTheDocument();
    });

    it('should not show seller payout by default', () => {
      render(<PricingBreakdownDisplay pricing={mockPricing} />);
      
      expect(screen.queryByText('You will receive')).not.toBeInTheDocument();
    });
  });

  describe('Variant Display', () => {
    it('should render default variant with full breakdown', () => {
      render(<PricingBreakdownDisplay pricing={mockPricing} />);
      
      expect(screen.getByText('Pricing Breakdown')).toBeInTheDocument();
      expect(screen.getByText('Original Price')).toBeInTheDocument();
      expect(screen.getByText('Base Price')).toBeInTheDocument();
      expect(screen.getByText('Delivery Cost')).toBeInTheDocument();
      expect(screen.getByText('Platform Commission (10%)')).toBeInTheDocument();
      expect(screen.getByText('Payment Gateway Fees')).toBeInTheDocument();
    });

    it('should render compact variant with simplified display', () => {
      render(<PricingBreakdownDisplay pricing={mockPricing} variant="compact" />);
      
      expect(screen.queryByText('Pricing Breakdown')).not.toBeInTheDocument();
      expect(screen.getByText('Original Price:')).toBeInTheDocument();
      expect(screen.getByText(/Condition Adjustment/)).toBeInTheDocument();
      expect(screen.getByText('Delivery Cost:')).toBeInTheDocument();
      expect(screen.getByText('Final Price:')).toBeInTheDocument();
    });
  });

  describe('Price Formatting', () => {
    it('should format prices with two decimal places', () => {
      const pricingWithDecimals: PricingBreakdown = {
        ...mockPricing,
        payment_fees: 11.756,
      };
      
      render(<PricingBreakdownDisplay pricing={pricingWithDecimals} />);
      
      expect(screen.getByText('₹11.76')).toBeInTheDocument();
    });

    it('should handle zero values correctly', () => {
      const pricingWithZero: PricingBreakdown = {
        ...mockPricing,
        delivery_cost: 0,
      };
      
      render(<PricingBreakdownDisplay pricing={pricingWithZero} />);
      
      expect(screen.getByText('₹0.00')).toBeInTheDocument();
    });
  });

  describe('Information Display', () => {
    it('should display pricing transparency note', () => {
      render(<PricingBreakdownDisplay pricing={mockPricing} />);
      
      expect(screen.getByText('Pricing Transparency')).toBeInTheDocument();
      expect(screen.getByText(/All costs are clearly shown/)).toBeInTheDocument();
    });
  });
});
