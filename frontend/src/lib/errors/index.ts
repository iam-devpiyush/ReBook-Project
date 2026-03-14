/**
 * Error Response Utilities
 *
 * Centralised error classes and HTTP response helpers for all API routes.
 * Requirements: 19.1-19.9
 */

import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

export class AppError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number,
        public readonly code?: string
    ) {
        super(message);
        this.name = 'AppError';
    }
}

/** 400 – invalid input / validation failure */
export class ValidationError extends AppError {
    constructor(message: string, code = 'VALIDATION_ERROR') {
        super(message, 400, code);
        this.name = 'ValidationError';
    }
}

/** 401 – not authenticated */
export class UnauthorizedError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401, 'UNAUTHORIZED');
        this.name = 'UnauthorizedError';
    }
}

/** 403 – authenticated but not allowed */
export class ForbiddenError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403, 'FORBIDDEN');
        this.name = 'ForbiddenError';
    }
}

/** 404 – resource not found */
export class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}

/** 409 – conflict (e.g. duplicate order, sold listing) */
export class ConflictError extends AppError {
    constructor(message: string) {
        super(message, 409, 'CONFLICT');
        this.name = 'ConflictError';
    }
}

/** 429 – rate limit exceeded */
export class RateLimitError extends AppError {
    constructor(message = 'Too many requests. Please try again later.') {
        super(message, 429, 'RATE_LIMIT_EXCEEDED');
        this.name = 'RateLimitError';
    }
}

/** 402 – payment required / payment failed */
export class PaymentError extends AppError {
    constructor(message: string, code = 'PAYMENT_FAILED') {
        super(message, 402, code);
        this.name = 'PaymentError';
    }
}

/** 503 – upstream service unavailable */
export class ServiceUnavailableError extends AppError {
    constructor(service: string) {
        super(`${service} is currently unavailable. Please try again later.`, 503, 'SERVICE_UNAVAILABLE');
        this.name = 'ServiceUnavailableError';
    }
}

/** 504 – upstream service timed out */
export class GatewayTimeoutError extends AppError {
    constructor(service: string) {
        super(`${service} did not respond in time. Please try again.`, 504, 'GATEWAY_TIMEOUT');
        this.name = 'GatewayTimeoutError';
    }
}

/** 500 – unexpected internal error */
export class InternalServerError extends AppError {
    constructor(message = 'An unexpected error occurred') {
        super(message, 500, 'INTERNAL_SERVER_ERROR');
        this.name = 'InternalServerError';
    }
}

// ---------------------------------------------------------------------------
// Response formatter
// ---------------------------------------------------------------------------

export interface ErrorResponseBody {
    error: string;
    code?: string;
    details?: unknown;
}

/**
 * Build a NextResponse JSON error from any thrown value.
 * Logs unexpected errors server-side without leaking internals to clients.
 */
export function errorResponse(err: unknown): NextResponse<ErrorResponseBody> {
    if (err instanceof AppError) {
        return NextResponse.json(
            { error: err.message, code: err.code },
            { status: err.statusCode }
        );
    }

    // Unknown / unexpected error – log and return 500
    console.error('[API Error]', err);
    return NextResponse.json(
        { error: 'An unexpected error occurred', code: 'INTERNAL_SERVER_ERROR' },
        { status: 500 }
    );
}

/**
 * Wrap an async route handler so any thrown AppError (or unknown error)
 * is automatically converted to the correct HTTP response.
 *
 * Usage:
 *   export const GET = withErrorHandling(async (req) => { ... });
 */
export function withErrorHandling<T extends unknown[]>(
    handler: (...args: T) => Promise<NextResponse>
) {
    return async (...args: T): Promise<NextResponse> => {
        try {
            return await handler(...args);
        } catch (err) {
            return errorResponse(err);
        }
    };
}
