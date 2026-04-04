/**
 * Supabase Realtime Notification Hooks
 *
 * React hooks that subscribe to Realtime broadcast channels and surface
 * incoming messages to components.
 *
 * Requirements: 8.3, 8.4, 8.5, 8.6
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { realtimeClient } from './client';
import { channelName } from './channels';
import type {
  ListingApprovalPayload,
  OrderUpdatePayload,
  ScanProgressPayload,
} from './publish';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseListingNotificationsOptions {
  /** Called whenever a listing status change is received */
  onStatusChange?: (payload: ListingApprovalPayload) => void;
}

export interface UseOrderNotificationsOptions {
  /** Called whenever an order status change is received */
  onStatusChange?: (payload: OrderUpdatePayload) => void;
}

export interface UseScanProgressOptions {
  /** Called on every progress update */
  onProgress?: (payload: ScanProgressPayload) => void;
}

// ---------------------------------------------------------------------------
// 46.2a – useListingNotifications
// Subscribe to listing approval / rejection / rescan events.
// Requirements: 8.3, 8.4
// ---------------------------------------------------------------------------

export function useListingNotifications(
  listingId: string | null | undefined,
  options: UseListingNotificationsOptions = {}
): { lastPayload: ListingApprovalPayload | null } {
  const [lastPayload, setLastPayload] = useState<ListingApprovalPayload | null>(null);
  const onStatusChangeRef = useRef(options.onStatusChange);
  onStatusChangeRef.current = options.onStatusChange;

  useEffect(() => {
    if (!listingId) return;

    const name = channelName.listing(listingId);
    const channel = realtimeClient
      .channel(name)
      .on('broadcast', { event: 'listing.status_changed' }, ({ payload }) => {
        const typed = payload as ListingApprovalPayload;
        setLastPayload(typed);
        onStatusChangeRef.current?.(typed);
      })
      .subscribe();

    return () => {
      realtimeClient.removeChannel(channel);
    };
  }, [listingId]);

  return { lastPayload };
}

// ---------------------------------------------------------------------------
// 46.2b – useOrderNotifications
// Subscribe to order status change events (buyer + seller).
// Requirements: 8.5
// ---------------------------------------------------------------------------

export function useOrderNotifications(
  orderId: string | null | undefined,
  options: UseOrderNotificationsOptions = {}
): { lastPayload: OrderUpdatePayload | null } {
  const [lastPayload, setLastPayload] = useState<OrderUpdatePayload | null>(null);
  const onStatusChangeRef = useRef(options.onStatusChange);
  onStatusChangeRef.current = options.onStatusChange;

  useEffect(() => {
    if (!orderId) return;

    const name = channelName.order(orderId);
    const channel = realtimeClient
      .channel(name)
      .on('broadcast', { event: 'order.status_changed' }, ({ payload }) => {
        const typed = payload as OrderUpdatePayload;
        setLastPayload(typed);
        onStatusChangeRef.current?.(typed);
      })
      .subscribe();

    return () => {
      realtimeClient.removeChannel(channel);
    };
  }, [orderId]);

  return { lastPayload };
}

// ---------------------------------------------------------------------------
// 46.2c – useScanProgress
// Subscribe to AI scan progress updates.
// Requirements: 8.6
// ---------------------------------------------------------------------------

export function useScanProgress(
  scanId: string | null | undefined,
  options: UseScanProgressOptions = {}
): { progress: number; message: string; lastPayload: ScanProgressPayload | null } {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [lastPayload, setLastPayload] = useState<ScanProgressPayload | null>(null);
  const onProgressRef = useRef(options.onProgress);
  onProgressRef.current = options.onProgress;

  useEffect(() => {
    if (!scanId) return;

    const name = channelName.scan(scanId);
    const channel = realtimeClient
      .channel(name)
      .on('broadcast', { event: 'scan.progress' }, ({ payload }) => {
        const typed = payload as ScanProgressPayload;
        setProgress(typed.progress);
        setMessage(typed.message);
        setLastPayload(typed);
        onProgressRef.current?.(typed);
      })
      .subscribe();

    return () => {
      realtimeClient.removeChannel(channel);
    };
  }, [scanId]);

  return { progress, message, lastPayload };
}
