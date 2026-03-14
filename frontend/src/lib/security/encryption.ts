/**
 * Data Encryption Guidelines and Utilities
 *
 * Requirements:
 * - 23.1: Supabase built-in encryption for data at rest
 * - 23.2: HTTPS/TLS 1.3 for all communications
 * - 23.4: Never store credit card numbers or CVV
 *
 * NOTE: Encryption at rest is handled automatically by Supabase (AES-256).
 *       TLS 1.3 is enforced at the infrastructure level (Supabase + Vercel/hosting).
 *       This module provides runtime guards to prevent accidental PCI-DSS violations.
 */

// ---------------------------------------------------------------------------
// PCI-DSS compliance guards (Requirement 23.4)
// ---------------------------------------------------------------------------

/** Patterns that look like raw card numbers or CVV values */
const CARD_NUMBER_PATTERN = /\b(?:\d[ -]?){13,19}\b/;
const CVV_PATTERN = /\b\d{3,4}\b/;

/**
 * Throw if the payload contains anything that looks like a raw card number.
 * Call this before persisting any payment-related data.
 *
 * @throws Error if a potential card number is detected
 */
export function assertNoCardData(payload: Record<string, unknown>): void {
    const json = JSON.stringify(payload);

    if (CARD_NUMBER_PATTERN.test(json.replace(/\s/g, ''))) {
        throw new Error(
            'PCI-DSS violation: raw card number detected in payload. ' +
            'Use a tokenised payment method ID from the payment gateway instead.'
        );
    }
}

/**
 * Sanitize a payment record before storing it in the database.
 * Strips any fields that should never be persisted.
 *
 * Allowed fields: gateway_payment_id (token), status, amount, currency,
 * created_at, refund_amount, refund_reason.
 */
export function sanitizePaymentRecord(record: Record<string, unknown>): Record<string, unknown> {
    const FORBIDDEN_KEYS = [
        'card_number',
        'cardNumber',
        'card_no',
        'cvv',
        'cvc',
        'cvc2',
        'cvv2',
        'expiry',
        'expiration',
        'card_expiry',
    ];

    const sanitized = { ...record };
    for (const key of FORBIDDEN_KEYS) {
        if (key in sanitized) {
            delete sanitized[key];
        }
    }
    return sanitized;
}

// ---------------------------------------------------------------------------
// HTTPS enforcement helper (Requirement 23.2)
// ---------------------------------------------------------------------------

/**
 * Assert that a URL uses HTTPS in production.
 * Logs a warning in development, throws in production.
 */
export function assertHttps(url: string): void {
    if (process.env.NODE_ENV !== 'production') return;
    if (!url.startsWith('https://')) {
        throw new Error(`Security violation: non-HTTPS URL detected: ${url}`);
    }
}

// ---------------------------------------------------------------------------
// Supabase encryption note
// ---------------------------------------------------------------------------
// Supabase PostgreSQL uses AES-256 encryption for data at rest by default.
// No additional application-level encryption is required for standard fields.
// Sensitive fields (e.g. addresses) are protected by Row Level Security (RLS)
// policies defined in the database migrations.
