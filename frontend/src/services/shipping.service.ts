/**
 * Shiprocket Shipping Service
 *
 * Implements shipping label generation, tracking, delivery cost estimation,
 * and shipment status updates via the Shiprocket API.
 *
 * Requirements: 7.1-7.10
 */

import { shiprocketRequest } from '@/lib/shiprocket/client';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Address {
  name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

export interface ShippingLabel {
  trackingId: string;
  shipmentId: number;
  orderId: number;
  labelUrl: string;
  courier: string;
  estimatedDeliveryDays: number;
  pickupInstructions: string;
}

export type ShipmentStatusCode =
  | 'pending'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed';

export interface ShipmentEvent {
  timestamp: string;
  location: string;
  description: string;
}

export interface ShipmentStatus {
  trackingId: string;
  status: ShipmentStatusCode;
  currentLocation: string;
  estimatedDelivery: string;
  events: ShipmentEvent[];
}

export interface DeliveryCost {
  amount: number;
  currency: string;
  estimatedDays: number;
  courierId?: number;
  courierName?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not set');
  return createClient(url, key);
}

/** Map Shiprocket status strings to our internal status codes */
function mapShiprocketStatus(status: string): ShipmentStatusCode {
  const s = status.toLowerCase();
  if (s.includes('delivered')) return 'delivered';
  if (s.includes('out for delivery')) return 'out_for_delivery';
  if (s.includes('in transit') || s.includes('transit')) return 'in_transit';
  if (s.includes('picked') || s.includes('pickup')) return 'picked_up';
  if (s.includes('failed') || s.includes('rto') || s.includes('lost')) return 'failed';
  return 'pending';
}

// ---------------------------------------------------------------------------
// Delivery cost estimation (Requirement 7.1)
// ---------------------------------------------------------------------------

export async function fetchDeliveryCost(
  originPincode: string,
  destinationPincode: string,
  weightGrams = 500
): Promise<DeliveryCost> {
  try {
    const weightKg = weightGrams / 1000;
    const data = await shiprocketRequest<{
      data?: {
        available_courier_companies?: Array<{
          courier_company_id: number;
          courier_name: string;
          freight_charge: number;
          estimated_delivery_days: number;
        }>;
      };
    }>(
      `/courier/serviceability/?pickup_postcode=${originPincode}&delivery_postcode=${destinationPincode}&weight=${weightKg}&cod=0`
    );

    const couriers = data?.data?.available_courier_companies ?? [];
    if (couriers.length === 0) {
      // Fallback estimate if no couriers available for this route
      return { amount: 80, currency: 'INR', estimatedDays: 5 };
    }

    // Pick the cheapest available courier
    const cheapest = couriers.reduce((a, b) =>
      a.freight_charge <= b.freight_charge ? a : b
    );

    return {
      amount: cheapest.freight_charge,
      currency: 'INR',
      estimatedDays: cheapest.estimated_delivery_days,
      courierId: cheapest.courier_company_id,
      courierName: cheapest.courier_name,
    };
  } catch {
    // Graceful fallback — never block listing creation due to shipping API issues
    return { amount: 80, currency: 'INR', estimatedDays: 5 };
  }
}

// ---------------------------------------------------------------------------
// Shipping label generation (Requirements 7.2, 7.3, 7.4)
// ---------------------------------------------------------------------------

export async function generateShippingLabel(
  orderId: string,
  pickup: Address,
  delivery: Address,
  bookTitle: string,
  weightGrams = 500
): Promise<ShippingLabel> {
  // Step 1: Create a Shiprocket order
  const orderPayload = {
    order_id: `RBK-${orderId.slice(0, 12)}`,
    order_date: new Date().toISOString().split('T')[0],
    pickup_location: 'Primary',
    channel_id: '',
    comment: `Second-hand book: ${bookTitle}`,
    billing_customer_name: delivery.name,
    billing_last_name: '',
    billing_address: delivery.address_line1,
    billing_address_2: delivery.address_line2 ?? '',
    billing_city: delivery.city,
    billing_pincode: delivery.pincode,
    billing_state: delivery.state,
    billing_country: delivery.country ?? 'India',
    billing_email: '',
    billing_phone: delivery.phone,
    shipping_is_billing: true,
    order_items: [
      {
        name: bookTitle,
        sku: `BOOK-${orderId.slice(0, 8)}`,
        units: 1,
        selling_price: 0, // price handled separately
        discount: 0,
        tax: 0,
        hsn: 4901, // HSN code for printed books
      },
    ],
    payment_method: 'Prepaid',
    shipping_charges: 0,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: 0,
    sub_total: 0,
    length: 25,
    breadth: 20,
    height: 3,
    weight: weightGrams / 1000,
  };

  const createRes = await shiprocketRequest<{
    order_id: number;
    shipment_id: number;
    status: string;
  }>('/orders/create/adhoc', {
    method: 'POST',
    body: JSON.stringify(orderPayload),
  });

  const shiprocketOrderId = createRes.order_id;
  const shipmentId = createRes.shipment_id;

  // Step 2: Get serviceability and assign cheapest courier
  const costData = await fetchDeliveryCost(pickup.pincode, delivery.pincode, weightGrams);
  const courierId = costData.courierId;

  if (courierId) {
    await shiprocketRequest('/courier/assign/awb', {
      method: 'POST',
      body: JSON.stringify({ shipment_id: shipmentId, courier_id: courierId }),
    });
  }

  // Step 3: Generate label
  const labelRes = await shiprocketRequest<{
    label_url?: string;
    response?: { label_url?: string };
  }>('/courier/generate/label', {
    method: 'POST',
    body: JSON.stringify({ shipment_id: [shipmentId] }),
  });

  const labelUrl =
    labelRes.label_url ??
    labelRes.response?.label_url ??
    `https://apiv2.shiprocket.in/v1/external/courier/generate/label?shipment_id=${shipmentId}`;

  // Step 4: Get AWB (tracking ID)
  const awbRes = await shiprocketRequest<{
    data?: { awb_code?: string; courier_name?: string };
  }>(`/orders/show/${shiprocketOrderId}`);

  const trackingId = awbRes.data?.awb_code ?? `SRP${shipmentId}`;
  const courierName = awbRes.data?.courier_name ?? costData.courierName ?? 'Shiprocket';

  return {
    trackingId,
    shipmentId,
    orderId: shiprocketOrderId,
    labelUrl,
    courier: courierName,
    estimatedDeliveryDays: costData.estimatedDays,
    pickupInstructions: `Pack the book securely. ${courierName} will pick it up within 24-48 hours. Keep the label printed and attached to the package.`,
  };
}

// ---------------------------------------------------------------------------
// Shipment tracking (Requirement 7.8)
// ---------------------------------------------------------------------------

export async function trackShipment(trackingId: string): Promise<ShipmentStatus> {
  const data = await shiprocketRequest<{
    tracking_data?: {
      track_status?: number;
      shipment_status?: string;
      shipment_track?: Array<{
        current_status?: string;
        current_status_description?: string;
        delivered_date?: string;
        etd?: string;
      }>;
      shipment_track_activities?: Array<{
        date?: string;
        activity?: string;
        location?: string;
        'sr-status-label'?: string;
      }>;
    };
  }>(`/courier/track/awb/${trackingId}`);

  const trackData = data?.tracking_data;
  const track = trackData?.shipment_track?.[0];
  const activities = trackData?.shipment_track_activities ?? [];

  const statusStr = track?.current_status ?? trackData?.shipment_status ?? 'pending';
  const status = mapShiprocketStatus(statusStr);

  const estimatedDelivery =
    track?.etd ?? track?.delivered_date ?? new Date(Date.now() + 5 * 86400_000).toISOString();

  const events: ShipmentEvent[] = activities.map((a) => ({
    timestamp: a.date ?? new Date().toISOString(),
    location: a.location ?? '',
    description: a['sr-status-label'] ?? a.activity ?? '',
  }));

  const currentLocation =
    activities[0]?.location ?? track?.current_status_description ?? 'In transit';

  return { trackingId, status, currentLocation, estimatedDelivery, events };
}

// ---------------------------------------------------------------------------
// Shipment status update handler (Requirements 7.6, 7.7, 7.10)
// ---------------------------------------------------------------------------

export async function handleShipmentStatusUpdate(
  trackingId: string,
  newStatus: ShipmentStatusCode,
  location: string,
  description: string
): Promise<void> {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  // Build timestamp fields based on status
  const timestamps: Record<string, string> = {};
  if (newStatus === 'picked_up') timestamps.picked_up_at = now;
  if (newStatus === 'delivered') timestamps.delivered_at = now;

  // Update shipping record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: shipping } = await (supabase as any)
    .from('shipping')
    .update({ status: newStatus, ...timestamps, updated_at: now })
    .eq('tracking_id', trackingId)
    .select('order_id')
    .single();

  if (!shipping?.order_id) return;

  const orderId = shipping.order_id;

  // Map shipping status → order status
  const orderStatusMap: Partial<Record<ShipmentStatusCode, string>> = {
    picked_up: 'shipped',
    in_transit: 'shipped',
    out_for_delivery: 'shipped',
    delivered: 'delivered',
    failed: 'delivery_failed',
  };
  const orderStatus = orderStatusMap[newStatus];

  if (orderStatus) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('orders')
      .update({ status: orderStatus, updated_at: now })
      .eq('id', orderId);
  }

  // Publish Supabase Realtime notification to buyer/seller
  await supabase.channel(`order:${orderId}`).send({
    type: 'broadcast',
    event: 'shipment.status_update',
    payload: { orderId, trackingId, status: newStatus, location, description },
  });
}
