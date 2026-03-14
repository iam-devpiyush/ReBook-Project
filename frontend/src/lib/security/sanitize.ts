/**
 * Input Sanitization Utilities
 *
 * Sanitizes user-provided strings to prevent XSS and injection attacks.
 *
 * Requirements:
 * - 17.8: Use parameterized queries (enforced by Supabase client)
 * - 17.9: Sanitize HTML to prevent XSS
 * - 23.2: Security best practices
 */

// ---------------------------------------------------------------------------
// HTML entity encoding (no external dependency needed)
// ---------------------------------------------------------------------------

const HTML_ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
};

/**
 * Escape HTML special characters to prevent XSS (Requirement 17.9).
 * Use this when rendering user-generated content as plain text in HTML.
 */
export function escapeHtml(input: string): string {
    return input.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] ?? char);
}

/**
 * Strip all HTML tags from a string.
 * Useful for fields that should never contain markup (names, titles, etc.).
 */
export function stripHtml(input: string): string {
    return input.replace(/<[^>]*>/g, '').trim();
}

/**
 * Sanitize a plain-text field:
 * 1. Strip HTML tags
 * 2. Trim whitespace
 * 3. Collapse multiple spaces
 */
export function sanitizeText(input: string): string {
    return stripHtml(input).replace(/\s+/g, ' ').trim();
}

/**
 * Sanitize a search query — strip HTML and limit length.
 */
export function sanitizeSearchQuery(input: string, maxLength = 200): string {
    return sanitizeText(input).slice(0, maxLength);
}

/**
 * Validate and sanitize an email address (Requirement 17.1).
 * Returns the lowercased email or null if invalid.
 */
export function sanitizeEmail(input: string): string | null {
    const trimmed = input.trim().toLowerCase();
    // RFC 5322 simplified pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmed) ? trimmed : null;
}

/**
 * Validate a 6-digit Indian pincode (Requirement 17.6).
 */
export function isValidPincode(input: string): boolean {
    return /^\d{6}$/.test(input.trim());
}

/**
 * Validate a positive decimal price (Requirement 17.4).
 */
export function isValidPrice(value: number): boolean {
    return typeof value === 'number' && isFinite(value) && value > 0;
}

/**
 * Validate a condition score (1–5 integer) (Requirement 17.5).
 */
export function isValidConditionScore(value: number): boolean {
    return Number.isInteger(value) && value >= 1 && value <= 5;
}

/**
 * Mask a phone number for public display (Requirement 23.8).
 * e.g. "9876543210" → "98XXXXXX10"
 */
export function maskPhoneNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return 'XXXXXX';
    return digits.slice(0, 2) + 'X'.repeat(digits.length - 4) + digits.slice(-2);
}

/**
 * Redact a full address for public display (Requirement 23.9).
 * Returns only city and state, hiding street details.
 */
export function redactAddress(address: {
    street?: string;
    city: string;
    state: string;
    pincode?: string;
}): string {
    return `${address.city}, ${address.state}`;
}
