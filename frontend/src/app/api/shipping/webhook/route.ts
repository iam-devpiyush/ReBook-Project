/**
 * API Route: /api/shipping/webhook
 *
 * POST: Handle Shiprocket shipment status update webhooks.
 * Shiprocket sends POST requests when shipment status changes.
 *
 * Requirements: 7.6, 7.10
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleShipmentStatusUpdate } from '@/services/shipping.service';
import type { ShipmentStatusCode } from '@/services/shipping.service';

// Shiprocket status strings → our internal status codes
const STATUS_MAP: Record<string, ShipmentStatusCode> = {
  'NEW': 'pending',
  'PICKUP SCHEDULED': 'pending',
  'PICKUP GENERATED': 'pending',
  'PICKUP QUEUED': 'pending',
  'PICKUP ERROR': 'pending',
  'PICKED UP': 'picked_up',
  'IN TRANSIT': 'in_transit',
  'OUT FOR DELIVERY': 'out_for_delivery',
  'DELIVERED': 'delivered',
  'UNDELIVERED': 'failed',
  'RTO INITIATED': 'failed',
  'RTO DELIVERED': 'failed',
  'LOST': 'failed',
  'DAMAGED': 'failed',
};

function mapStatus(shiprocketStatus: string): ShipmentStatusCode {
  const upper = shiprocketStatus.toUpperCase();
  return STATUS_MAP[upper] ?? 'in_transit';
}

export async function POST(request: NextRequest) {
  let body: {
    awb?: string;
    current_status?: string;
    current_status_description?: string;
    scans?: Array<{ location?: string; activity?: string }>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const trackingId = body.awb;
  const statusStr = body.current_status;

  if (!trackingId || !statusStr) {
    // Shiprocket sometimes sends test pings — acknowledge silently
    return NextResponse.json({ received: true });
  }

  const status = mapStatus(statusStr);
  const location = body.scans?.[0]?.location ?? '';
  const description = body.current_status_description ?? statusStr;

  try {
    await handleShipmentStatusUpdate(trackingId, status, location, description);
  } catch (error) {
    console.error('Shipping webhook processing error:', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
