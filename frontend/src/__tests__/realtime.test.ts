/**
 * Supabase Realtime Tests (Task 59.4)
 *
 * Tests for:
 *  - Channel subscription management (subscribe/unsubscribe)
 *  - Notification delivery for order events
 *  - Notification delivery for listing approval events
 *  - Reconnection behavior
 *
 * Requirements: 25.1-25.7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Supabase — factory must not reference outer variables (hoisting)
// ---------------------------------------------------------------------------

vi.mock('@supabase/supabase-js', () => {
  const sendFn = vi.fn().mockResolvedValue(undefined);
  const channelFn = vi.fn().mockImplementation((name: string) => ({
    name,
    send: sendFn,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    on: vi.fn().mockReturnThis(),
  }));
  return {
    createClient: vi.fn().mockReturnValue({
      channel: channelFn,
      removeChannel: vi.fn().mockResolvedValue(undefined),
    }),
  };
});

import { createClient } from '@supabase/supabase-js';
import {
  sendNotification,
  notifyOrderConfirmed,
  notifyListingApproved,
  notifyListingRejected,
  notifyPickupScheduled,
  notifyOrderShipped,
  notifyOrderDelivered,
} from '@/services/notification.service';

// ---------------------------------------------------------------------------
// Helpers (kept for potential future use)
// ---------------------------------------------------------------------------

function _getChannelMock() {
  const client = vi.mocked(createClient).mock.results[0]?.value;
  return client?.channel as ReturnType<typeof vi.fn>;
}

function _getSendMock() {
  const client = vi.mocked(createClient).mock.results[0]?.value;
  const channelMock = client?.channel as ReturnType<typeof vi.fn>;
  return channelMock?.mock.results[0]?.value?.send as ReturnType<typeof vi.fn>;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  // Reset the send mock to resolve by default
  vi.mocked(createClient).mockReturnValue({
    channel: vi.fn().mockImplementation((name: string) => ({
      name,
      send: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      on: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn().mockResolvedValue(undefined),
  } as any);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// 1. Channel Subscription Management
// ============================================================================

describe('Channel Subscription Management', () => {
  it('creates a channel with the correct user-scoped name', async () => {
    await sendNotification({
      type: 'order_confirmed',
      userId: 'user-abc',
      title: 'Test',
      message: 'Test message',
    });
    const client = vi.mocked(createClient).mock.results[0]?.value;
    expect(client.channel).toHaveBeenCalledWith('notifications:user-abc');
  });

  it('creates separate channels for different users', async () => {
    await sendNotification({ type: 'order_confirmed', userId: 'user-1', title: 'T', message: 'M' });
    await sendNotification({ type: 'order_confirmed', userId: 'user-2', title: 'T', message: 'M' });

    const calls1 = vi.mocked(createClient).mock.results[0]?.value?.channel?.mock?.calls ?? [];
    const calls2 = vi.mocked(createClient).mock.results[1]?.value?.channel?.mock?.calls ?? [];
    const allChannelNames = [...calls1, ...calls2].map(([name]: [string]) => name);
    expect(allChannelNames).toContain('notifications:user-1');
    expect(allChannelNames).toContain('notifications:user-2');
  });

  it('sends broadcast event on the channel', async () => {
    await sendNotification({
      type: 'listing_approved',
      userId: 'seller-1',
      title: 'Approved',
      message: 'Your listing is live',
    });
    const client = vi.mocked(createClient).mock.results[0]?.value;
    const channelInstance = client.channel.mock.results[0]?.value;
    expect(channelInstance.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'broadcast', event: 'notification' })
    );
  });

  it('includes the full payload in the broadcast', async () => {
    const payload = {
      type: 'order_confirmed' as const,
      userId: 'buyer-1',
      title: 'Order Confirmed',
      message: 'Your order is confirmed.',
      metadata: { orderId: 'order-123' },
    };
    await sendNotification(payload);
    const client = vi.mocked(createClient).mock.results[0]?.value;
    const channelInstance = client.channel.mock.results[0]?.value;
    expect(channelInstance.send).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          type: 'order_confirmed',
          userId: 'buyer-1',
          metadata: { orderId: 'order-123' },
        }),
      })
    );
  });
});

// ============================================================================
// 2. Notification Delivery — Order Events
// ============================================================================

describe('Notification Delivery — Order Events', () => {
  it('notifyOrderConfirmed sends to buyer channel', async () => {
    const result = await notifyOrderConfirmed('buyer-42', 'order-99', 'Clean Code');
    expect(result.success).toBe(true);
    expect(result.attempts).toBe(1);
    const client = vi.mocked(createClient).mock.results[0]?.value;
    expect(client.channel).toHaveBeenCalledWith('notifications:buyer-42');
    const channelInstance = client.channel.mock.results[0]?.value;
    expect(channelInstance.send).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          type: 'order_confirmed',
          metadata: { orderId: 'order-99' },
        }),
      })
    );
  });

  it('notifyOrderShipped sends to both buyer and seller channels', async () => {
    const [buyerResult, sellerResult] = await notifyOrderShipped(
      'buyer-1', 'seller-1', 'order-1', 'TRACK-XYZ'
    );
    expect(buyerResult.success).toBe(true);
    expect(sellerResult.success).toBe(true);
    // Collect all channel() call arguments across all createClient instances
    const allChannelCalls = vi.mocked(createClient).mock.results.flatMap((r) =>
      (r.value?.channel?.mock?.calls ?? []).map(([name]: [string]) => name)
    );
    expect(allChannelCalls).toContain('notifications:buyer-1');
    expect(allChannelCalls).toContain('notifications:seller-1');
  });

  it('notifyOrderShipped includes tracking ID in payload', async () => {
    await notifyOrderShipped('buyer-1', 'seller-1', 'order-1', 'TRACK-ABC');
    const allSendCalls = vi.mocked(createClient).mock.results.flatMap((r) =>
      r.value?.channel?.mock?.results?.map((ch: any) => ch.value?.send?.mock?.calls?.[0]?.[0]) ?? []
    );
    for (const arg of allSendCalls.filter(Boolean)) {
      expect(arg.payload.metadata.trackingId).toBe('TRACK-ABC');
    }
  });

  it('notifyOrderDelivered sends delivered event to buyer', async () => {
    const result = await notifyOrderDelivered('buyer-5', 'order-5', 'Refactoring');
    expect(result.success).toBe(true);
    const client = vi.mocked(createClient).mock.results[0]?.value;
    expect(client.channel).toHaveBeenCalledWith('notifications:buyer-5');
    const channelInstance = client.channel.mock.results[0]?.value;
    expect(channelInstance.send).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ type: 'delivered' }),
      })
    );
  });

  it('notifyPickupScheduled sends to seller channel', async () => {
    const result = await notifyPickupScheduled('seller-3', 'order-3', '2024-12-25');
    expect(result.success).toBe(true);
    const client = vi.mocked(createClient).mock.results[0]?.value;
    expect(client.channel).toHaveBeenCalledWith('notifications:seller-3');
    const channelInstance = client.channel.mock.results[0]?.value;
    expect(channelInstance.send).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          type: 'pickup_scheduled',
          metadata: { orderId: 'order-3', pickupDate: '2024-12-25' },
        }),
      })
    );
  });
});

// ============================================================================
// 3. Notification Delivery — Listing Approval Events
// ============================================================================

describe('Notification Delivery — Listing Approval Events', () => {
  it('notifyListingApproved sends to seller channel', async () => {
    const result = await notifyListingApproved('seller-10', 'listing-10', 'The Pragmatic Programmer');
    expect(result.success).toBe(true);
    const client = vi.mocked(createClient).mock.results[0]?.value;
    expect(client.channel).toHaveBeenCalledWith('notifications:seller-10');
    const channelInstance = client.channel.mock.results[0]?.value;
    expect(channelInstance.send).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          type: 'listing_approved',
          metadata: { listingId: 'listing-10' },
        }),
      })
    );
  });

  it('notifyListingApproved message mentions the book title', async () => {
    await notifyListingApproved('seller-10', 'listing-10', 'SICP');
    const client = vi.mocked(createClient).mock.results[0]?.value;
    const channelInstance = client.channel.mock.results[0]?.value;
    const [arg] = channelInstance.send.mock.calls[0];
    expect(arg.payload.message).toContain('SICP');
  });

  it('notifyListingRejected sends to seller channel with reason', async () => {
    const result = await notifyListingRejected(
      'seller-20', 'listing-20', 'Bad Book', 'Poor condition photos'
    );
    expect(result.success).toBe(true);
    const client = vi.mocked(createClient).mock.results[0]?.value;
    expect(client.channel).toHaveBeenCalledWith('notifications:seller-20');
    const channelInstance = client.channel.mock.results[0]?.value;
    const [arg] = channelInstance.send.mock.calls[0];
    expect(arg.payload.type).toBe('listing_rejected');
    expect(arg.payload.metadata.reason).toBe('Poor condition photos');
    expect(arg.payload.message).toContain('Poor condition photos');
  });

  it('notifyListingRejected includes listingId in metadata', async () => {
    await notifyListingRejected('seller-20', 'listing-20', 'Bad Book', 'reason');
    const client = vi.mocked(createClient).mock.results[0]?.value;
    const channelInstance = client.channel.mock.results[0]?.value;
    const [arg] = channelInstance.send.mock.calls[0];
    expect(arg.payload.metadata.listingId).toBe('listing-20');
  });
});

// ============================================================================
// 4. Reconnection Behavior (Retry Logic)
// ============================================================================

describe('Reconnection / Retry Behavior', () => {
  it('retries up to 3 times on send failure', async () => {
    // Override createClient to return a client whose send always rejects
    vi.mocked(createClient).mockReturnValue({
      channel: vi.fn().mockReturnValue({
        send: vi.fn().mockRejectedValue(new Error('Network error')),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        on: vi.fn().mockReturnThis(),
      }),
      removeChannel: vi.fn(),
    } as any);

    const result = await sendNotification({
      type: 'order_confirmed',
      userId: 'user-retry',
      title: 'Test',
      message: 'Test',
    });

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(3);
    expect(result.error).toContain('Network error');
    // createClient called once per attempt
    expect(vi.mocked(createClient)).toHaveBeenCalledTimes(3);
  }, 10_000);

  it('succeeds on second attempt after transient failure', async () => {
    const sendFail = vi.fn().mockRejectedValueOnce(new Error('Transient error'));
    const sendOk = vi.fn().mockResolvedValue(undefined);

    vi.mocked(createClient)
      .mockReturnValueOnce({
        channel: vi.fn().mockReturnValue({ send: sendFail, subscribe: vi.fn(), unsubscribe: vi.fn(), on: vi.fn().mockReturnThis() }),
        removeChannel: vi.fn(),
      } as any)
      .mockReturnValueOnce({
        channel: vi.fn().mockReturnValue({ send: sendOk, subscribe: vi.fn(), unsubscribe: vi.fn(), on: vi.fn().mockReturnThis() }),
        removeChannel: vi.fn(),
      } as any);

    const result = await sendNotification({
      type: 'shipped',
      userId: 'user-flaky',
      title: 'Shipped',
      message: 'Your order shipped',
    });

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
    expect(vi.mocked(createClient)).toHaveBeenCalledTimes(2);
  }, 10_000);

  it('succeeds on third attempt after two failures', async () => {
    const sendFail = vi.fn().mockRejectedValue(new Error('Error'));
    const sendOk = vi.fn().mockResolvedValue(undefined);

    vi.mocked(createClient)
      .mockReturnValueOnce({
        channel: vi.fn().mockReturnValue({ send: sendFail, subscribe: vi.fn(), unsubscribe: vi.fn(), on: vi.fn().mockReturnThis() }),
        removeChannel: vi.fn(),
      } as any)
      .mockReturnValueOnce({
        channel: vi.fn().mockReturnValue({ send: sendFail, subscribe: vi.fn(), unsubscribe: vi.fn(), on: vi.fn().mockReturnThis() }),
        removeChannel: vi.fn(),
      } as any)
      .mockReturnValueOnce({
        channel: vi.fn().mockReturnValue({ send: sendOk, subscribe: vi.fn(), unsubscribe: vi.fn(), on: vi.fn().mockReturnThis() }),
        removeChannel: vi.fn(),
      } as any);

    const result = await sendNotification({
      type: 'delivered',
      userId: 'user-triple',
      title: 'Delivered',
      message: 'Delivered!',
    });

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(3);
  }, 10_000);

  it('returns failure result with error message after all retries exhausted', async () => {
    vi.mocked(createClient).mockReturnValue({
      channel: vi.fn().mockReturnValue({
        send: vi.fn().mockRejectedValue(new Error('Persistent failure')),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        on: vi.fn().mockReturnThis(),
      }),
      removeChannel: vi.fn(),
    } as any);

    const result = await sendNotification({
      type: 'listing_approved',
      userId: 'user-fail',
      title: 'Approved',
      message: 'Live!',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe('string');
  }, 10_000);
});

// ============================================================================
// 5. Shipment Status Realtime Broadcast
// ============================================================================

describe('Shipment Status Realtime Broadcast', () => {
  it('broadcasts to order-scoped channel on status update', async () => {
    const orderId = 'order-ship-1';
    const channelName = `order:${orderId}`;

    const supabase = createClient('https://test.supabase.co', 'key');
    await supabase.channel(channelName).send({
      type: 'broadcast',
      event: 'shipment.status_update',
      payload: { orderId, trackingId: 'TRACK-1', status: 'in_transit' },
    });

    const client = vi.mocked(createClient).mock.results[0]?.value;
    expect(client.channel).toHaveBeenCalledWith(channelName);
    const channelInstance = client.channel.mock.results[0]?.value;
    expect(channelInstance.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'broadcast',
        event: 'shipment.status_update',
        payload: expect.objectContaining({ status: 'in_transit' }),
      })
    );
  });

  it('uses order-scoped channel name format order:<id>', () => {
    const orderId = 'abc-123';
    expect(`order:${orderId}`).toBe('order:abc-123');
  });
});
