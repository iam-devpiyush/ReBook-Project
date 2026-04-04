export const dynamic = 'force-dynamic';
/**
 * API Route: /api/shipping/track/[trackingId]
 *
 * GET: Fetch live shipment tracking status from Shiprocket.
 *
 * Requirements: 7.8
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { trackShipment } from '@/services/shipping.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { trackingId: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) return authResult.response;

    const { trackingId } = params;
    if (!trackingId) {
      return NextResponse.json({ error: 'trackingId is required' }, { status: 400 });
    }

    const status = await trackShipment(trackingId);
    return NextResponse.json({ success: true, data: status });
  } catch (error) {
    console.error('Error in GET /api/shipping/track:', error);
    return NextResponse.json({ error: 'Failed to fetch tracking information' }, { status: 500 });
  }
}
