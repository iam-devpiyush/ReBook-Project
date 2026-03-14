/**
 * Supabase Realtime Connection Management
 *
 * Handles connection lifecycle with automatic reconnection using
 * exponential backoff, and fetches missed updates on reconnect.
 *
 * Requirements: 8.7, 8.8
 */

import { supabase } from '@/lib/supabase/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface ConnectionManagerOptions {
  /** Called when connection status changes */
  onStatusChange?: (status: ConnectionStatus) => void;
  /** Called when missed updates should be fetched (reconnect) */
  onReconnect?: () => void | Promise<void>;
  /** Max reconnect attempts before giving up (default: 10) */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff (default: 1000) */
  baseDelay?: number;
}

// ---------------------------------------------------------------------------
// ConnectionManager
// ---------------------------------------------------------------------------

export class ConnectionManager {
  private status: ConnectionStatus = 'disconnected';
  private retryCount = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly maxRetries: number;
  private readonly baseDelay: number;
  private readonly onStatusChange?: (status: ConnectionStatus) => void;
  private readonly onReconnect?: () => void | Promise<void>;

  constructor(options: ConnectionManagerOptions = {}) {
    this.maxRetries = options.maxRetries ?? 10;
    this.baseDelay = options.baseDelay ?? 1000;
    this.onStatusChange = options.onStatusChange;
    this.onReconnect = options.onReconnect;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Start monitoring the Supabase Realtime connection. */
  start(): void {
    // Supabase JS v2 exposes connection state via the realtime client
    const rt = (supabase as any).realtime;
    if (!rt) return;

    rt.onOpen(() => this.handleOpen());
    rt.onClose(() => this.handleClose());
    rt.onError(() => this.handleClose());
  }

  /** Stop monitoring and cancel any pending reconnect timers. */
  stop(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.setStatus('disconnected');
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  // ---------------------------------------------------------------------------
  // Internal handlers
  // ---------------------------------------------------------------------------

  private handleOpen(): void {
    const wasReconnecting = this.status === 'reconnecting';
    this.retryCount = 0;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.setStatus('connected');

    // Fetch missed updates after a reconnect (req 8.8)
    if (wasReconnecting && this.onReconnect) {
      void Promise.resolve(this.onReconnect());
    }
  }

  private handleClose(): void {
    if (this.status === 'disconnected') return; // already handling
    this.setStatus('reconnecting');
    this.scheduleReconnect();
  }

  /** Exponential backoff: delay = baseDelay * 2^retryCount, capped at 30s */
  private scheduleReconnect(): void {
    if (this.retryCount >= this.maxRetries) {
      this.setStatus('disconnected');
      return;
    }

    const delay = Math.min(this.baseDelay * Math.pow(2, this.retryCount), 30_000);
    this.retryCount++;

    this.retryTimer = setTimeout(() => {
      const rt = (supabase as any).realtime;
      if (rt) {
        try {
          rt.connect();
        } catch {
          // connect() may throw if already connecting — safe to ignore
        }
      }
    }, delay);
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.onStatusChange?.(status);
  }
}

// ---------------------------------------------------------------------------
// Singleton instance for app-wide use
// ---------------------------------------------------------------------------

let _manager: ConnectionManager | null = null;

export function getConnectionManager(options?: ConnectionManagerOptions): ConnectionManager {
  if (!_manager) {
    _manager = new ConnectionManager(options);
  }
  return _manager;
}

/** Reset the singleton (useful in tests). */
export function resetConnectionManager(): void {
  _manager?.stop();
  _manager = null;
}
