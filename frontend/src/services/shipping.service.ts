/**
 * Dummy Shipping Service
 *
 * Simulates shipping label generation and tracking without a real courier API.
 * Auto-generates fake tracking IDs. Safe for development/demo use.
 *
 * Requirements: 7.1-7.10
 */

import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShippingLabel {
  trackingId: string;
  labelUrl: string;
  courier: string;
  estimatedDeliveryDays: number;
  pickupInstructions: string;
}

export interface ShipmentStatus {
  trackingId: string;
  status: 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed';
  currentLocation: string;
  estimatedDelivery: string;
  events: Array<{ timestamp: string; location: string; description: string }>;
}

export interface DeliveryCost {
  amount: number;
  currency: string;
  estimatedDays: number;
}

// ---------------------------------------------------------------------------
// Dummy implementations
// ---------------------------------------------------------------------------

/**
 * Generates a dummy shipping label with a fake tracking ID.
 */
export async function generateShippingLabel(
  orderId: string,
  _pickupAddress: string,
  _deliveryAddress: string
): Promise<ShippingLabel> {
  const trackingId = `DUMMY${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
  return {
    trackingId,
    labelUrl: `https://dummy-shipping.example.com/labels/${trackingId}.pdf`,
    courier: 'DummyExpress',
    estimatedDeliveryDays: 3,
    pickupInstructions: 'Pack the book securely. Our dummy courier will pick it up within 24 hours.',
  };
}

/**
 * Returns a dummy shipment status for a tracking ID.
 */
export async function trackShipment(trackingId: string): Promise<ShipmentStatus> {
  const now = new Date();
  const delivery = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  return {
    trackingId,
    status: 'in_transit',
    currentLocation: 'Sorting Facility, Mumbai',
    estimatedDelivery: delivery.toISOString(),
    events: [
      {
        timestamp: now.toISOString(),
        location: 'Sorting Facility, Mumbai',
        description: 'Package in transit',
      },
      {
        timestamp: new Date(now.getTime() - 3600_000).toISOString(),
        location: 'Pickup Point',
        description: 'Package picked up',
      },
    ],
  };
}

/**
 * Returns a dummy delivery cost estimate.
 */
export async function fetchDeliveryCost(
  _originPincode: string,
  _destinationPincode: string,
  _weightGrams = 500
): Promise<DeliveryCost> {
  return { amount: 80, currency: 'INR', estimatedDays: 3 };
}
