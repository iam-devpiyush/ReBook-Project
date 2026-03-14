/**
 * Supabase Realtime Channel Management
 *
 * Provides channel setup, subscription utilities, and authentication
 * for Realtime events. RLS policies on the underlying tables enforce
 * per-user access — only rows the user can SELECT will be broadcast.
 *
 * Channel naming conventions:
 *   listing:<listingId>   – listing status changes (seller)
 *   order:<orderId>       – order status changes (buyer + seller)
 *   scan:<scanId>         – AI scan progress (seller)
 *
 * Requirements: 8.1, 8.2, 8.3
 */

import { supabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Channel name helpers
// ---------------------------------------------------------------------------

export const channelName = {
  listing: (listingId: string) => `listing:${listingId}`,
  order:   (orderId: string)   => `order:${orderId}`,
  scan:    (scanId: string)    => `scan:${scanId}`,
};

// ---------------------------------------------------------------------------
// Active channel registry (prevents duplicate subscriptions)
// ---------------------------------------------------------------------------

const activeChannels = new Map<string, RealtimeChannel>();

/**
 * Get or create a Supabase Realtime channel.
 * Re-uses an existing channel if one is already open for the same name.
 */
export function getOrCreateChannel(name: string): RealtimeChannel {
  const existing = activeChannels.get(name);
  if (existing) return existing;

  const channel = supabase.channel(name);
  activeChannels.set(name, channel);
  return channel;
}

/**
 * Remove a channel from the registry and unsubscribe from Supabase.
 */
export async function removeChannel(name: string): Promise<void> {
  const channel = activeChannels.get(name);
  if (!channel) return;
  activeChannels.delete(name);
  await supabase.removeChannel(channel);
}

/**
 * Remove all active channels (e.g. on logout).
 */
export async function removeAllChannels(): Promise<void> {
  const names = Array.from(activeChannels.keys());
  await Promise.all(names.map(removeChannel));
}
