/**
 * Shipping API Integration Service
 * 
 * Integrates with Delhivery or Shiprocket API for real-time delivery cost calculation.
 * Implements fallback to cached estimates when API is unavailable.
 * 
 * Requirements: 4.3, 7.1, 7.2, 19.4
 */

import { Location, DeliveryCostRequest, DeliveryCostResponse } from '@/types/pricing';

// Cache for delivery cost estimates (in-memory for now, could be Redis in production)
const deliveryCostCache = new Map<string, { cost: number; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

// Default fallback estimates based on distance tiers
const FALLBACK_ESTIMATES = {
  same_city: 50,
  same_state: 80,
  different_state: 120,
};

/**
 * Calculate distance between two locations using Haversine formula
 */
function calculateDistance(loc1: Location, loc2: Location): number {
  if (!loc1.latitude || !loc1.longitude || !loc2.latitude || !loc2.longitude) {
    // Fallback: estimate based on pincode/state
    if (loc1.pincode === loc2.pincode) return 10; // Same area
    if (loc1.city === loc2.city) return 30; // Same city
    if (loc1.state === loc2.state) return 300; // Same state
    return 1000; // Different state
  }

  const R = 6371; // Earth's radius in km
  const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
  const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(loc1.latitude * Math.PI / 180) *
    Math.cos(loc2.latitude * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generate cache key for delivery cost
 */
function getCacheKey(origin: Location, destination: Location, weight: number): string {
  return `${origin.pincode}-${destination.pincode}-${weight}`;
}

/**
 * Get cached delivery cost if available and not expired
 */
function getCachedCost(cacheKey: string): number | null {
  const cached = deliveryCostCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.cost;
  }
  return null;
}

/**
 * Store delivery cost in cache
 */
function setCachedCost(cacheKey: string, cost: number): void {
  deliveryCostCache.set(cacheKey, { cost, timestamp: Date.now() });
}

/**
 * Calculate fallback delivery cost based on location
 */
function calculateFallbackCost(origin: Location, destination: Location, weight: number): number {
  const distance = calculateDistance(origin, destination);
  
  let baseCost: number;
  if (distance < 50) {
    baseCost = FALLBACK_ESTIMATES.same_city;
  } else if (origin.state === destination.state) {
    baseCost = FALLBACK_ESTIMATES.same_state;
  } else {
    baseCost = FALLBACK_ESTIMATES.different_state;
  }

  // Add weight-based cost (₹10 per 0.5kg above 0.5kg)
  const weightSurcharge = weight > 0.5 ? Math.ceil((weight - 0.5) / 0.5) * 10 : 0;
  
  return baseCost + weightSurcharge;
}

/**
 * Fetch delivery cost from Delhivery API (mock implementation)
 * In production, this would call the actual Delhivery/Shiprocket API
 */
async function fetchFromDelhiveryAPI(
  origin: Location,
  destination: Location,
  weight: number
): Promise<DeliveryCostResponse> {
  // Mock API call - in production, replace with actual API integration
  // Example: POST https://track.delhivery.com/api/kinko/v1/invoice/charges/.json
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // For now, use fallback calculation
  const cost = calculateFallbackCost(origin, destination, weight);
  const distance = calculateDistance(origin, destination);
  
  return {
    cost,
    courier_name: 'Delhivery',
    estimated_days: distance < 50 ? 2 : distance < 500 ? 4 : 7,
  };
}

/**
 * Fetch delivery cost from Shiprocket API (mock implementation)
 * In production, this would call the actual Shiprocket API
 */
async function fetchFromShiprocketAPI(
  origin: Location,
  destination: Location,
  weight: number
): Promise<DeliveryCostResponse> {
  // Mock API call - in production, replace with actual API integration
  // Example: GET https://apiv2.shiprocket.in/v1/external/courier/serviceability/
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // For now, use fallback calculation
  const cost = calculateFallbackCost(origin, destination, weight);
  const distance = calculateDistance(origin, destination);
  
  return {
    cost,
    courier_name: 'Shiprocket',
    estimated_days: distance < 50 ? 2 : distance < 500 ? 4 : 7,
  };
}

/**
 * Fetch real-time delivery cost from shipping API
 * 
 * @param origin - Seller's location
 * @param destination - Buyer's location
 * @param weight - Estimated weight in kg (default: 0.5kg for a book)
 * @returns Delivery cost in rupees
 * 
 * Requirements: 4.3, 7.1, 7.2, 19.4
 */
export async function fetchDeliveryCost(
  origin: Location,
  destination: Location,
  weight: number = 0.5
): Promise<number> {
  // Validate inputs
  if (!origin.pincode || !destination.pincode) {
    throw new Error('Origin and destination pincodes are required');
  }

  if (weight <= 0) {
    throw new Error('Weight must be positive');
  }

  // Check cache first
  const cacheKey = getCacheKey(origin, destination, weight);
  const cachedCost = getCachedCost(cacheKey);
  if (cachedCost !== null) {
    return cachedCost;
  }

  try {
    // Try primary API (Delhivery)
    const response = await fetchFromDelhiveryAPI(origin, destination, weight);
    const cost = response.cost;
    
    // Cache the result
    setCachedCost(cacheKey, cost);
    
    return cost;
  } catch (error) {
    console.error('Primary shipping API failed:', error);
    
    try {
      // Try fallback API (Shiprocket)
      const response = await fetchFromShiprocketAPI(origin, destination, weight);
      const cost = response.cost;
      
      // Cache the result
      setCachedCost(cacheKey, cost);
      
      return cost;
    } catch (fallbackError) {
      console.error('Fallback shipping API failed:', fallbackError);
      
      // Use cached estimate or calculate fallback
      const fallbackCost = calculateFallbackCost(origin, destination, weight);
      
      // Cache the fallback estimate
      setCachedCost(cacheKey, fallbackCost);
      
      return fallbackCost;
    }
  }
}

/**
 * Get detailed delivery cost information including courier and estimated days
 */
export async function getDeliveryCostDetails(
  origin: Location,
  destination: Location,
  weight: number = 0.5
): Promise<DeliveryCostResponse> {
  try {
    return await fetchFromDelhiveryAPI(origin, destination, weight);
  } catch (error) {
    try {
      return await fetchFromShiprocketAPI(origin, destination, weight);
    } catch (fallbackError) {
      const cost = calculateFallbackCost(origin, destination, weight);
      const distance = calculateDistance(origin, destination);
      
      return {
        cost,
        courier_name: 'Standard Delivery',
        estimated_days: distance < 50 ? 2 : distance < 500 ? 4 : 7,
      };
    }
  }
}
