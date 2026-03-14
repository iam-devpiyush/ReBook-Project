/**
 * API Route: /api/pricing/calculate
 * 
 * Calculates enhanced pricing with all cost components including real-time delivery costs.
 * 
 * Requirements: 4.1-4.10
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateEnhancedPricing } from '@/lib/pricing/pricing-engine';
import { PricingCalculationRequest } from '@/types/pricing';

export async function POST(request: NextRequest) {
  try {
    const body: PricingCalculationRequest = await request.json();

    // Validate required fields
    if (!body.original_price || body.original_price <= 0) {
      return NextResponse.json(
        { error: 'Original price must be a positive number' },
        { status: 400 }
      );
    }

    if (!body.condition_score || body.condition_score < 1 || body.condition_score > 5) {
      return NextResponse.json(
        { error: 'Condition score must be an integer between 1 and 5' },
        { status: 400 }
      );
    }

    if (!body.seller_location || !body.seller_location.pincode) {
      return NextResponse.json(
        { error: 'Seller location with pincode is required' },
        { status: 400 }
      );
    }

    if (!body.buyer_location || !body.buyer_location.pincode) {
      return NextResponse.json(
        { error: 'Buyer location with pincode is required' },
        { status: 400 }
      );
    }

    // Calculate pricing breakdown
    const pricingBreakdown = await calculateEnhancedPricing(
      body.original_price,
      body.condition_score,
      body.seller_location,
      body.buyer_location,
      body.weight
    );

    return NextResponse.json({
      success: true,
      data: pricingBreakdown,
    });
  } catch (error) {
    console.error('Error calculating pricing:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to calculate pricing' },
      { status: 500 }
    );
  }
}
