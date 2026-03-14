/**
 * Supabase Realtime Client Service
 *
 * Initialises the Realtime client, manages the authenticated connection,
 * and wires up automatic reconnection with exponential backoff.
 *
 * Requirements: 8.1, 8.7
 */

'use client';

import { supabase } from '@/lib/supabase/client';
import { getConnectionManager } from './connection';
import { removeAllChannels } from './channels';

// ---------------------------------------------------------------------------
// Initialise
// ---------------------------------------------------------------------------

let _started = false;

/**
 * Start the Realtime connection manager.
 * Safe to call multiple times — only initialises once per page load.
 *
 * @param onReconnect  Optional callback invoked after a reconnect so the
 *                     caller can re-fetch any missed updates (req 8.8).
 */
export function initRealtimeClient(onReconnect?: () => void | Promise<void>): void {
  if (_started) return;
  _started = true;

  const manager = getConnectionManager({ onReconnect });
  manager.start();
}

/**
 * Tear down all active channels and stop the connection manager.
 * Call this on logout (req 8.9 — max 3 concurrent connections).
 */
export async function teardownRealtimeClient(): Promise<void> {
  _started = false;
  getConnectionManager().stop();
  await removeAllChannels();
}

/**
 * Expose the underlying Supabase client so hooks can subscribe to channels
 * without importing the singleton directly.
 */
export { supabase as realtimeClient };
