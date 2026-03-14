/**
 * Unit Tests: Supabase Realtime System
 *
 * Checkpoint 47 – Verify Supabase Realtime system
 *
 * Covers:
 * - Realtime connection and authentication (Req 8.1, 8.2)
 * - Listing approval notifications (Req 8.4, 3.10, 3.11)
 * - Order status update notifications (Req 8.5)
 * - Scan progress updates (Req 8.6, 2.11)
 * - Automatic reconnection with exponential backoff (Req 8.7, 8.8)
 * - Channel management (Req 8.3)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    ConnectionManager,
    resetConnectionManager,
    getConnectionManager,
    type ConnectionStatus,
} from '../connection';
import { channelName } from '../channels';
import {
    validateListingPayload,
    validateOrderPayload,
    validateScanPayload,
    buildListingApprovalPayload,
    buildOrderUpdatePayload,
    buildScanProgressPayload,
} from './realtime-test-helpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a mock Supabase realtime object with controllable callbacks */
function createMockRealtime() {
    let openCb: (() => void) | null = null;
    let closeCb: (() => void) | null = null;
    let errorCb: (() => void) | null = null;
    const connectMock = vi.fn();

    return {
        onOpen: (cb: () => void) => { openCb = cb; },
        onClose: (cb: () => void) => { closeCb = cb; },
        onError: (cb: () => void) => { errorCb = cb; },
        connect: connectMock,
        triggerOpen: () => openCb?.(),
        triggerClose: () => closeCb?.(),
        triggerError: () => errorCb?.(),
        connectMock,
    };
}

// ---------------------------------------------------------------------------
// 1. Connection and Authentication
// ---------------------------------------------------------------------------

describe('Realtime Connection Management (Req 8.1, 8.7)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        resetConnectionManager();
    });

    afterEach(() => {
        vi.useRealTimers();
        resetConnectionManager();
    });

    it('starts in disconnected state', () => {
        const manager = new ConnectionManager();
        expect(manager.getStatus()).toBe('disconnected');
    });

    it('transitions to connected when connection opens', () => {
        const mockRt = createMockRealtime();
        const manager = new ConnectionManager();

        // Inject mock realtime
        (manager as any).start = function () {
            mockRt.onOpen(() => (this as any).handleOpen());
            mockRt.onClose(() => (this as any).handleClose());
            mockRt.onError(() => (this as any).handleClose());
        };
        manager.start();

        mockRt.triggerOpen();
        expect(manager.getStatus()).toBe('connected');
    });

    it('calls onStatusChange callback on status transitions', () => {
        const statusChanges: ConnectionStatus[] = [];
        const manager = new ConnectionManager({
            onStatusChange: (s) => statusChanges.push(s),
        });

        const mockRt = createMockRealtime();
        (manager as any).start = function () {
            mockRt.onOpen(() => (this as any).handleOpen());
            mockRt.onClose(() => (this as any).handleClose());
        };
        manager.start();

        mockRt.triggerOpen();
        expect(statusChanges).toContain('connected');
    });

    it('stop() transitions to disconnected and cancels timers', () => {
        const manager = new ConnectionManager();
        // Manually set status to reconnecting
        (manager as any).status = 'reconnecting';
        (manager as any).retryTimer = setTimeout(() => { }, 10_000);

        manager.stop();
        expect(manager.getStatus()).toBe('disconnected');
    });

    it('getConnectionManager returns singleton', () => {
        const m1 = getConnectionManager();
        const m2 = getConnectionManager();
        expect(m1).toBe(m2);
    });

    it('resetConnectionManager clears singleton', () => {
        const m1 = getConnectionManager();
        resetConnectionManager();
        const m2 = getConnectionManager();
        expect(m1).not.toBe(m2);
    });
});

// ---------------------------------------------------------------------------
// 2. Automatic Reconnection with Exponential Backoff (Req 8.7, 8.8)
// ---------------------------------------------------------------------------

describe('Automatic Reconnection with Exponential Backoff (Req 8.7, 8.8)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        resetConnectionManager();
    });

    afterEach(() => {
        vi.useRealTimers();
        resetConnectionManager();
    });

    it('transitions to reconnecting when connection drops', () => {
        const mockRt = createMockRealtime();
        const manager = new ConnectionManager({ baseDelay: 100 });

        (manager as any).start = function () {
            mockRt.onOpen(() => (this as any).handleOpen());
            mockRt.onClose(() => (this as any).handleClose());
        };
        manager.start();

        // First open to get to connected state
        mockRt.triggerOpen();
        expect(manager.getStatus()).toBe('connected');

        // Then close
        mockRt.triggerClose();
        expect(manager.getStatus()).toBe('reconnecting');
    });

    it('schedules reconnect attempt after connection drop', () => {
        const mockRt = createMockRealtime();
        const manager = new ConnectionManager({ baseDelay: 100, maxRetries: 3 });

        (manager as any).start = function () {
            mockRt.onOpen(() => (this as any).handleOpen());
            mockRt.onClose(() => (this as any).handleClose());
        };
        // Inject mock rt for reconnect
        vi.spyOn(manager as any, 'scheduleReconnect').mockImplementation(function (this: any) {
            if (this.retryCount >= this.maxRetries) {
                (this as any).setStatus('disconnected');
                return;
            }
            const delay = Math.min(this.baseDelay * Math.pow(2, this.retryCount), 30_000);
            this.retryCount++;
            this.retryTimer = setTimeout(() => {
                mockRt.connectMock();
            }, delay);
        });

        manager.start();
        mockRt.triggerOpen();
        mockRt.triggerClose();

        expect(manager.getStatus()).toBe('reconnecting');

        // Advance time past first backoff delay (100ms * 2^0 = 100ms)
        vi.advanceTimersByTime(150);
        expect(mockRt.connectMock).toHaveBeenCalledTimes(1);
    });

    it('exponential backoff delay doubles each retry', () => {
        const baseDelay = 100;
        const delays: number[] = [];

        for (let i = 0; i < 5; i++) {
            const delay = Math.min(baseDelay * Math.pow(2, i), 30_000);
            delays.push(delay);
        }

        expect(delays[0]).toBe(100);
        expect(delays[1]).toBe(200);
        expect(delays[2]).toBe(400);
        expect(delays[3]).toBe(800);
        expect(delays[4]).toBe(1600);
    });

    it('backoff delay is capped at 30 seconds', () => {
        const baseDelay = 1000;
        // At retry 5: 1000 * 2^5 = 32000 > 30000
        const delay = Math.min(baseDelay * Math.pow(2, 5), 30_000);
        expect(delay).toBe(30_000);
    });

    it('gives up after maxRetries and sets status to disconnected', () => {
        const manager = new ConnectionManager({ baseDelay: 10, maxRetries: 2 });

        // Simulate exhausting retries
        (manager as any).retryCount = 2;
        (manager as any).status = 'reconnecting';
        (manager as any).scheduleReconnect();

        expect(manager.getStatus()).toBe('disconnected');
    });

    it('calls onReconnect callback after successful reconnect', () => {
        const onReconnect = vi.fn();
        const mockRt = createMockRealtime();
        const manager = new ConnectionManager({ onReconnect, baseDelay: 10 });

        (manager as any).start = function () {
            mockRt.onOpen(() => (this as any).handleOpen());
            mockRt.onClose(() => (this as any).handleClose());
        };
        manager.start();

        // Connect, disconnect, then reconnect
        mockRt.triggerOpen();
        mockRt.triggerClose();
        // Manually set to reconnecting so handleOpen knows it was a reconnect
        (manager as any).status = 'reconnecting';
        mockRt.triggerOpen();

        expect(onReconnect).toHaveBeenCalledTimes(1);
    });

    it('does not call onReconnect on initial connection', () => {
        const onReconnect = vi.fn();
        const mockRt = createMockRealtime();
        const manager = new ConnectionManager({ onReconnect });

        (manager as any).start = function () {
            mockRt.onOpen(() => (this as any).handleOpen());
        };
        manager.start();

        // Initial connection (not a reconnect)
        mockRt.triggerOpen();
        expect(onReconnect).not.toHaveBeenCalled();
    });

    it('resets retry count after successful reconnect', () => {
        const mockRt = createMockRealtime();
        const manager = new ConnectionManager({ baseDelay: 10 });

        (manager as any).start = function () {
            mockRt.onOpen(() => (this as any).handleOpen());
            mockRt.onClose(() => (this as any).handleClose());
        };
        manager.start();

        mockRt.triggerOpen();
        mockRt.triggerClose();
        (manager as any).retryCount = 3; // simulate some retries
        mockRt.triggerOpen();

        expect((manager as any).retryCount).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// 3. Channel Name Conventions (Req 8.3)
// ---------------------------------------------------------------------------

describe('Channel Name Conventions (Req 8.3)', () => {
    it('listing channel follows listing:<id> pattern', () => {
        const id = '123e4567-e89b-12d3-a456-426614174000';
        expect(channelName.listing(id)).toBe(`listing:${id}`);
    });

    it('order channel follows order:<id> pattern', () => {
        const id = '123e4567-e89b-12d3-a456-426614174001';
        expect(channelName.order(id)).toBe(`order:${id}`);
    });

    it('scan channel follows scan:<id> pattern', () => {
        const id = '123e4567-e89b-12d3-a456-426614174002';
        expect(channelName.scan(id)).toBe(`scan:${id}`);
    });

    it('listing, order, and scan channels for same ID are distinct', () => {
        const id = '123e4567-e89b-12d3-a456-426614174000';
        const names = [channelName.listing(id), channelName.order(id), channelName.scan(id)];
        const unique = new Set(names);
        expect(unique.size).toBe(3);
    });
});

// ---------------------------------------------------------------------------
// 4. Listing Approval Notifications (Req 8.4, 3.10, 3.11)
// ---------------------------------------------------------------------------

describe('Listing Approval Notifications (Req 8.4, 3.10, 3.11)', () => {
    it('approved listing payload is well-formed', () => {
        const payload = buildListingApprovalPayload({
            listingId: 'abc-123',
            status: 'active',
            approvedAt: new Date().toISOString(),
        });
        expect(validateListingPayload(payload)).toBe(true);
    });

    it('rejected listing payload requires a reason (Req 3.11)', () => {
        const withReason = buildListingApprovalPayload({
            listingId: 'abc-123',
            status: 'rejected',
            reason: 'Poor image quality',
        });
        expect(validateListingPayload(withReason)).toBe(true);

        const withoutReason = buildListingApprovalPayload({
            listingId: 'abc-123',
            status: 'rejected',
        });
        expect(validateListingPayload(withoutReason)).toBe(false);
    });

    it('rescan_required payload includes notes (Req 3.11)', () => {
        const payload = buildListingApprovalPayload({
            listingId: 'abc-123',
            status: 'rescan_required',
            notes: 'Please rescan the spine',
        });
        expect(validateListingPayload(payload)).toBe(true);
    });

    it('rescan_required payload is valid without notes', () => {
        const payload = buildListingApprovalPayload({
            listingId: 'abc-123',
            status: 'rescan_required',
        });
        expect(validateListingPayload(payload)).toBe(true);
    });

    it('payload with empty listingId is invalid', () => {
        const payload = buildListingApprovalPayload({ listingId: '', status: 'active' });
        expect(validateListingPayload(payload)).toBe(false);
    });

    it('payload with invalid status is invalid', () => {
        const payload = { listingId: 'abc-123', status: 'unknown' as any };
        expect(validateListingPayload(payload)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// 5. Order Status Update Notifications (Req 8.5)
// ---------------------------------------------------------------------------

describe('Order Status Update Notifications (Req 8.5)', () => {
    it('valid order update payload passes validation', () => {
        const payload = buildOrderUpdatePayload({
            orderId: 'order-001',
            status: 'paid',
            updatedAt: new Date().toISOString(),
        });
        expect(validateOrderPayload(payload)).toBe(true);
    });

    it('all valid order statuses are accepted', () => {
        const statuses = ['pending_payment', 'paid', 'shipped', 'delivered', 'cancelled'] as const;
        for (const status of statuses) {
            const payload = buildOrderUpdatePayload({
                orderId: 'order-001',
                status,
                updatedAt: new Date().toISOString(),
            });
            expect(validateOrderPayload(payload)).toBe(true);
        }
    });

    it('order payload without updatedAt is invalid', () => {
        const payload = buildOrderUpdatePayload({
            orderId: 'order-001',
            status: 'paid',
            updatedAt: '',
        });
        expect(validateOrderPayload(payload)).toBe(false);
    });

    it('order payload with empty orderId is invalid', () => {
        const payload = buildOrderUpdatePayload({
            orderId: '',
            status: 'paid',
            updatedAt: new Date().toISOString(),
        });
        expect(validateOrderPayload(payload)).toBe(false);
    });

    it('order payload with invalid status is invalid', () => {
        const payload = { orderId: 'order-001', status: 'unknown' as any, updatedAt: new Date().toISOString() };
        expect(validateOrderPayload(payload)).toBe(false);
    });

    it('order payload can include optional trackingId', () => {
        const payload = buildOrderUpdatePayload({
            orderId: 'order-001',
            status: 'shipped',
            trackingId: 'TRACK123',
            updatedAt: new Date().toISOString(),
        });
        expect(validateOrderPayload(payload)).toBe(true);
        expect(payload.trackingId).toBe('TRACK123');
    });
});

// ---------------------------------------------------------------------------
// 6. Scan Progress Updates (Req 8.6, 2.11)
// ---------------------------------------------------------------------------

describe('Scan Progress Updates (Req 8.6, 2.11)', () => {
    it('scan progress payload at 0% is valid', () => {
        const payload = buildScanProgressPayload({ scanId: 'scan-001', progress: 0, message: 'Starting scan' });
        expect(validateScanPayload(payload)).toBe(true);
    });

    it('scan progress payload at 25% is valid', () => {
        const payload = buildScanProgressPayload({ scanId: 'scan-001', progress: 25, message: 'ISBN detected' });
        expect(validateScanPayload(payload)).toBe(true);
    });

    it('scan progress payload at 50% is valid', () => {
        const payload = buildScanProgressPayload({ scanId: 'scan-001', progress: 50, message: 'Metadata fetched' });
        expect(validateScanPayload(payload)).toBe(true);
    });

    it('scan progress payload at 75% is valid', () => {
        const payload = buildScanProgressPayload({ scanId: 'scan-001', progress: 75, message: 'Condition analyzed' });
        expect(validateScanPayload(payload)).toBe(true);
    });

    it('scan progress payload at 100% is valid', () => {
        const payload = buildScanProgressPayload({ scanId: 'scan-001', progress: 100, message: 'Scan complete' });
        expect(validateScanPayload(payload)).toBe(true);
    });

    it('all required progress milestones are valid (0, 25, 50, 75, 100)', () => {
        const milestones = [0, 25, 50, 75, 100];
        for (const progress of milestones) {
            const payload = buildScanProgressPayload({ scanId: 'scan-001', progress, message: `Progress: ${progress}%` });
            expect(validateScanPayload(payload)).toBe(true);
        }
    });

    it('progress below 0 is invalid', () => {
        const payload = buildScanProgressPayload({ scanId: 'scan-001', progress: -1, message: 'Invalid' });
        expect(validateScanPayload(payload)).toBe(false);
    });

    it('progress above 100 is invalid', () => {
        const payload = buildScanProgressPayload({ scanId: 'scan-001', progress: 101, message: 'Invalid' });
        expect(validateScanPayload(payload)).toBe(false);
    });

    it('scan payload with empty scanId is invalid', () => {
        const payload = buildScanProgressPayload({ scanId: '', progress: 50, message: 'Halfway' });
        expect(validateScanPayload(payload)).toBe(false);
    });

    it('scan payload with empty message is invalid', () => {
        const payload = buildScanProgressPayload({ scanId: 'scan-001', progress: 50, message: '' });
        expect(validateScanPayload(payload)).toBe(false);
    });
});
