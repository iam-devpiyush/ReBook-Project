/**
 * Pricing Types
 * 
 * Type definitions for the Enhanced Pricing Engine
 */

export interface Location {
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
}

export interface PricingBreakdown {
  original_price: number;
  condition_score: number;
  condition_multiplier: number;
  base_price: number;
  delivery_cost: number;
  platform_commission: number;
  payment_fees: number;
  final_price: number;
  seller_payout: number;
}

export interface DeliveryCostRequest {
  origin: Location;
  destination: Location;
  weight: number; // in kg
}

export interface DeliveryCostResponse {
  cost: number;
  courier_name: string;
  estimated_days: number;
}

export interface PricingCalculationRequest {
  original_price: number;
  condition_score: number;
  seller_location: Location;
  buyer_location: Location;
  weight?: number;
}
