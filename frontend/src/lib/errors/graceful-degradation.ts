/**
 * Graceful Degradation Helpers
 *
 * Handles service unavailability for OAuth providers, Meilisearch, and payment gateways.
 * Requirements: 19.1, 19.5
 */

import { ServiceUnavailableError, PaymentError } from './index';
import { withRetry } from './fallbacks';
import { withTimeout } from '@/lib/timeout';

// ---------------------------------------------------------------------------
// OAuth provider unavailability  (Requirement 19.1)
// ---------------------------------------------------------------------------

export type OAuthProvider = 'google' | 'apple' | 'microsoft';

const OAUTH_ALTERNATIVES: Record<OAuthProvider, OAuthProvider[]> = {
    google: ['apple', 'microsoft'],
    apple: ['google', 'microsoft'],
    microsoft: ['google', 'apple'],
};

export interface OAuthUnavailableResult {
    available: false;
    message: string;
    alternatives: OAuthProvider[];
}

/**
 * Call when an OAuth provider returns a 5xx or network error.
 * Returns a structured response with alternative providers to suggest.
 * Requirements: 19.1
 */
export function handleOAuthProviderUnavailable(provider: OAuthProvider): OAuthUnavailableResult {
    const alternatives = OAUTH_ALTERNATIVES[provider];
    return {
        available: false,
        message: `Sign-in with ${capitalize(provider)} is temporarily unavailable. Please try another provider.`,
        alternatives,
    };
}

/**
 * Attempt OAuth sign-in with automatic fallback messaging on failure.
 * Throws ServiceUnavailableError if the provider is down.
 */
export async function withOAuthFallback<T>(
    provider: OAuthProvider,
    fn: () => Promise<T>
): Promise<T> {
    try {
        return await fn();
    } catch (err) {
        const result = handleOAuthProviderUnavailable(provider);
        throw new ServiceUnavailableError(
            `${capitalize(provider)} OAuth (alternatives: ${result.alternatives.join(', ')})`
        );
    }
}

// ---------------------------------------------------------------------------
// Meilisearch → Supabase fallback  (Requirement 19.5)
// ---------------------------------------------------------------------------

export interface SearchFallbackResult<T> {
    data: T;
    usedFallback: boolean;
    fallbackReason?: string;
}

/**
 * Execute a Meilisearch search with automatic fallback to a Supabase query.
 * If Meilisearch is unavailable, the supabaseFallback function is called instead.
 * Requirements: 19.5
 */
export async function withMeilisearchFallback<T>(
    meilisearchFn: () => Promise<T>,
    supabaseFallback: () => Promise<T>
): Promise<SearchFallbackResult<T>> {
    try {
        // 12s timeout on Meilisearch — SGP region can be slow from Vercel US-East on cold start
        const data = await withTimeout(
            withRetry(meilisearchFn, { maxAttempts: 1, baseDelayMs: 0 }),
            12000,
            'Meilisearch'
        );
        return { data, usedFallback: false };
    } catch (err) {
        console.warn('[Search] Meilisearch unavailable or timed out, falling back to Supabase:', err);
        try {
            // 8s timeout on Supabase fallback
            const data = await withTimeout(supabaseFallback(), 8000, 'Supabase search fallback');
            return {
                data,
                usedFallback: true,
                fallbackReason: 'Search index temporarily unavailable. Results may be less relevant.',
            };
        } catch (fallbackErr) {
            console.error('[Search] Supabase fallback also failed:', fallbackErr);
            throw new ServiceUnavailableError('Search');
        }
    }
}

// ---------------------------------------------------------------------------
// Payment gateway failures  (Requirement 19.3)
// ---------------------------------------------------------------------------

export type PaymentGateway = 'stripe' | 'razorpay';

export interface PaymentGatewayError {
    gateway: PaymentGateway;
    code: string;
    message: string;
    retryable: boolean;
}

/** Map gateway error codes to user-friendly messages. */
const PAYMENT_ERROR_MESSAGES: Record<string, string> = {
    card_declined: 'Your card was declined. Please try a different payment method.',
    insufficient_funds: 'Insufficient funds. Please try a different card.',
    expired_card: 'Your card has expired. Please use a different card.',
    incorrect_cvc: 'Incorrect CVC. Please check your card details.',
    processing_error: 'A payment processing error occurred. Please try again.',
    gateway_unavailable: 'Payment service is temporarily unavailable. Please try again in a few minutes.',
};

/**
 * Translate a raw payment gateway error into a structured, user-friendly error.
 * Requirements: 19.3
 */
export function handlePaymentGatewayError(
    gateway: PaymentGateway,
    rawCode: string,
    rawMessage?: string
): PaymentGatewayError {
    const retryableCodes = ['processing_error', 'gateway_unavailable'];
    const message =
        PAYMENT_ERROR_MESSAGES[rawCode] ??
        rawMessage ??
        'Payment failed. Please try again or use a different payment method.';

    return {
        gateway,
        code: rawCode,
        message,
        retryable: retryableCodes.includes(rawCode),
    };
}

/**
 * Execute a payment operation with structured error handling.
 * Throws PaymentError with a user-friendly message on failure.
 */
export async function withPaymentFallback<T>(
    gateway: PaymentGateway,
    fn: () => Promise<T>
): Promise<T> {
    try {
        return await fn();
    } catch (err: unknown) {
        const rawCode =
            (err as { code?: string })?.code ??
            (err as { type?: string })?.type ??
            'processing_error';
        const rawMessage = (err as { message?: string })?.message;
        const parsed = handlePaymentGatewayError(gateway, rawCode, rawMessage);
        throw new PaymentError(parsed.message, parsed.code.toUpperCase());
    }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
