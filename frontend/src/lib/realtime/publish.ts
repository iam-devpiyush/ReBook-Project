/**
 * Supabase Realtime Publishing Functions
 *
 * Server-side helpers (used in API routes / Edge Functions) that broadcast
 * events to the appropriate Realtime channels.
 *
 * Requirements: 8.4, 8.5, 8.6, 3.10, 3.11
 */

import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Server-side Supabase client (service role for broadcasting)
// ---------------------------------------------------------------------------

function getServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ---------------------------------------------------------------------------
// Payload types
// ---------------------------------------------------------------------------

export interface ListingApprovalPayload {
  listingId: string;
  status: 'active' | 'rejected' | 'rescan_required';
  reason?: string;
  notes?: string;
  approvedAt?: string;
}

export interface OrderUpdatePayload {
  orderId: string;
  status: string;
  trackingId?: string;
  updatedAt: string;
}

export interface ScanProgressPayload {
  scanId: string;
  progress: number; // 0-100
  message: string;
  isbn?: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// 45.2a – publishListingApproval
// Broadcasts listing status change to the seller.
// Requirements: 8.4, 3.10, 3.11
// ---------------------------------------------------------------------------

export async function publishListingApproval(
  payload: ListingApprovalPayload
): Promise<void> {
  const supabase = getServerSupabase();
  const channelName = `listing:${payload.listingId}`;

  await supabase.channel(channelName).send({
    type: 'broadcast',
    event: 'listing.status_changed',
    payload,
  });
}

// ---------------------------------------------------------------------------
// 45.2b – publishOrderUpdate
// Broadcasts order status change to both buyer and seller channels.
// Requirements: 8.5
// ---------------------------------------------------------------------------

export async function publishOrderUpdate(
  payload: OrderUpdatePayload
): Promise<void> {
  const supabase = getServerSupabase();
  const channelName = `order:${payload.orderId}`;

  await supabase.channel(channelName).send({
    type: 'broadcast',
    event: 'order.status_changed',
    payload,
  });
}

// ---------------------------------------------------------------------------
// 45.2c – publishScanProgress
// Broadcasts AI scan progress to the seller's scan channel.
// Requirements: 8.6
// ---------------------------------------------------------------------------

export async function publishScanProgress(
  payload: ScanProgressPayload
): Promise<void> {
  const supabase = getServerSupabase();
  const channelName = `scan:${payload.scanId}`;

  await supabase.channel(channelName).send({
    type: 'broadcast',
    event: 'scan.progress',
    payload,
  });
}
