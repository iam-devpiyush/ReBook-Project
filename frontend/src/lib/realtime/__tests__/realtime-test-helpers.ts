/**
 * Test helpers for Supabase Realtime unit tests.
 *
 * Provides pure validation functions and payload builders that mirror
 * the logic in publish.ts without requiring Supabase connections.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ListingStatus = 'active' | 'rejected' | 'rescan_required';
type OrderStatus = 'pending_payment' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export interface ListingApprovalPayload {
    listingId: string;
    status: ListingStatus | string;
    reason?: string;
    notes?: string;
    approvedAt?: string;
}

export interface OrderUpdatePayload {
    orderId: string;
    status: OrderStatus | string;
    trackingId?: string;
    updatedAt: string;
}

export interface ScanProgressPayload {
    scanId: string;
    progress: number;
    message: string;
    isbn?: string;
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

export function validateListingPayload(p: ListingApprovalPayload): boolean {
    if (!p.listingId || p.listingId.trim() === '') return false;
    if (!['active', 'rejected', 'rescan_required'].includes(p.status as string)) return false;
    if (p.status === 'rejected' && (!p.reason || p.reason.trim().length === 0)) return false;
    return true;
}

export function validateOrderPayload(p: OrderUpdatePayload): boolean {
    if (!p.orderId || p.orderId.trim() === '') return false;
    const validStatuses: string[] = ['pending_payment', 'paid', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(p.status as string)) return false;
    if (!p.updatedAt) return false;
    return true;
}

export function validateScanPayload(p: ScanProgressPayload): boolean {
    if (!p.scanId || p.scanId.trim() === '') return false;
    if (p.progress < 0 || p.progress > 100) return false;
    if (!p.message || p.message.trim() === '') return false;
    return true;
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

export function buildListingApprovalPayload(
    overrides: Partial<ListingApprovalPayload> & { listingId: string; status: ListingStatus | string }
): ListingApprovalPayload {
    return { ...overrides };
}

export function buildOrderUpdatePayload(
    overrides: Partial<OrderUpdatePayload> & { orderId: string; status: OrderStatus | string; updatedAt: string }
): OrderUpdatePayload {
    return { ...overrides };
}

export function buildScanProgressPayload(
    overrides: Partial<ScanProgressPayload> & { scanId: string; progress: number; message: string }
): ScanProgressPayload {
    return { ...overrides };
}
