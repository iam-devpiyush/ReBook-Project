/**
 * Notification Service
 *
 * Sends real-time notifications to users via Supabase Realtime broadcast.
 * Supports retry logic (up to 3 attempts with exponential backoff) and
 * logs failures for observability.
 *
 * Requirements: 25.1-25.7
 */

import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationEventType =
    | 'order_confirmed'
    | 'listing_approved'
    | 'listing_rejected'
    | 'pickup_scheduled'
    | 'shipped'
    | 'delivered';

export interface NotificationPayload {
    type: NotificationEventType;
    userId: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
}

export interface SendNotificationResult {
    success: boolean;
    attempts: number;
    error?: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

// ---------------------------------------------------------------------------
// Supabase server client
// ---------------------------------------------------------------------------

function getServerSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

// ---------------------------------------------------------------------------
// Core: sendNotification with retry + exponential backoff
// Requirements: 25.7
// ---------------------------------------------------------------------------

/**
 * Sends a notification to a user's personal channel via Supabase Realtime.
 * Retries up to MAX_RETRIES times with exponential backoff on failure.
 */
export async function sendNotification(
    payload: NotificationPayload
): Promise<SendNotificationResult> {
    const channelName = `notifications:${payload.userId}`;
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const supabase = getServerSupabase();
            await supabase.channel(channelName).send({
                type: 'broadcast',
                event: 'notification',
                payload,
            });
            return { success: true, attempts: attempt };
        } catch (err) {
            lastError = err instanceof Error ? err.message : String(err);
            console.error(
                `[NotificationService] Attempt ${attempt}/${MAX_RETRIES} failed for user ${payload.userId} (${payload.type}):`,
                lastError
            );

            if (attempt < MAX_RETRIES) {
                // Exponential backoff: 500ms, 1000ms, 2000ms
                const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // All attempts exhausted — log failure (req 25.7)
    console.error(
        `[NotificationService] All ${MAX_RETRIES} attempts failed for user ${payload.userId} (${payload.type}):`,
        lastError
    );

    return { success: false, attempts: MAX_RETRIES, error: lastError };
}

// ---------------------------------------------------------------------------
// Typed helpers for each notification event
// ---------------------------------------------------------------------------

/**
 * Notify buyer that their order was confirmed.
 * Requirements: 25.1
 */
export async function notifyOrderConfirmed(
    buyerId: string,
    orderId: string,
    bookTitle: string
): Promise<SendNotificationResult> {
    return sendNotification({
        type: 'order_confirmed',
        userId: buyerId,
        title: 'Order Confirmed',
        message: `Your order for "${bookTitle}" has been placed successfully.`,
        metadata: { orderId },
    });
}

/**
 * Notify seller that their listing was approved.
 * Requirements: 25.2
 */
export async function notifyListingApproved(
    sellerId: string,
    listingId: string,
    bookTitle: string
): Promise<SendNotificationResult> {
    return sendNotification({
        type: 'listing_approved',
        userId: sellerId,
        title: 'Listing Approved',
        message: `Your listing for "${bookTitle}" is now live on the marketplace.`,
        metadata: { listingId },
    });
}

/**
 * Notify seller that their listing was rejected.
 * Requirements: 25.3
 */
export async function notifyListingRejected(
    sellerId: string,
    listingId: string,
    bookTitle: string,
    reason: string
): Promise<SendNotificationResult> {
    return sendNotification({
        type: 'listing_rejected',
        userId: sellerId,
        title: 'Listing Rejected',
        message: `Your listing for "${bookTitle}" was rejected. Reason: ${reason}`,
        metadata: { listingId, reason },
    });
}

/**
 * Notify seller that pickup has been scheduled.
 * Requirements: 25.4
 */
export async function notifyPickupScheduled(
    sellerId: string,
    orderId: string,
    pickupDate: string
): Promise<SendNotificationResult> {
    return sendNotification({
        type: 'pickup_scheduled',
        userId: sellerId,
        title: 'Pickup Scheduled',
        message: `A pickup has been scheduled for your order on ${pickupDate}.`,
        metadata: { orderId, pickupDate },
    });
}

/**
 * Notify buyer and seller that the order has shipped.
 * Requirements: 25.5
 */
export async function notifyOrderShipped(
    buyerId: string,
    sellerId: string,
    orderId: string,
    trackingId: string
): Promise<[SendNotificationResult, SendNotificationResult]> {
    const message = `Your order has been shipped. Tracking ID: ${trackingId}`;
    return Promise.all([
        sendNotification({
            type: 'shipped',
            userId: buyerId,
            title: 'Order Shipped',
            message,
            metadata: { orderId, trackingId },
        }),
        sendNotification({
            type: 'shipped',
            userId: sellerId,
            title: 'Order Shipped',
            message,
            metadata: { orderId, trackingId },
        }),
    ]);
}

/**
 * Notify buyer that their order has been delivered.
 * Requirements: 25.6
 */
export async function notifyOrderDelivered(
    buyerId: string,
    orderId: string,
    bookTitle: string
): Promise<SendNotificationResult> {
    return sendNotification({
        type: 'delivered',
        userId: buyerId,
        title: 'Order Delivered',
        message: `Your order for "${bookTitle}" has been delivered. Enjoy your book!`,
        metadata: { orderId },
    });
}
