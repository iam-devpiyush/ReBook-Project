'use client';

/**
 * ErrorMessage — inline error display with optional retry button.
 * Requirements: 19.1-19.9 (Task 57.2)
 */

interface ErrorMessageProps {
    message: string;
    onRetry?: () => void;
    className?: string;
    /** 'block' = full-width card, 'inline' = compact inline text */
    variant?: 'block' | 'inline';
}

/** Map API/network error messages to user-friendly text */
export function friendlyError(err: unknown): string {
    if (!err) return 'An unexpected error occurred.';
    const msg = err instanceof Error ? err.message : String(err);
    const lower = msg.toLowerCase();

    if (lower.includes('network') || lower.includes('failed to fetch') || lower.includes('load failed')) {
        return 'Network error. Please check your connection and try again.';
    }
    if (lower.includes('401') || lower.includes('unauthorized')) {
        return 'Your session has expired. Please sign in again.';
    }
    if (lower.includes('403') || lower.includes('forbidden')) {
        return "You don't have permission to perform this action.";
    }
    if (lower.includes('404') || lower.includes('not found')) {
        return 'The requested resource could not be found.';
    }
    if (lower.includes('409') || lower.includes('conflict')) {
        return 'This action conflicts with the current state. Please refresh and try again.';
    }
    if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many')) {
        return 'Too many requests. Please wait a moment and try again.';
    }
    if (lower.includes('500') || lower.includes('internal server')) {
        return 'A server error occurred. Please try again later.';
    }
    if (lower.includes('503') || lower.includes('service unavailable')) {
        return 'The service is temporarily unavailable. Please try again later.';
    }
    // Return original if it's already user-friendly (short, no stack trace)
    if (msg.length < 120 && !msg.includes('at ')) return msg;
    return 'An unexpected error occurred. Please try again.';
}

export default function ErrorMessage({
    message,
    onRetry,
    className = '',
    variant = 'block',
}: ErrorMessageProps) {
    if (variant === 'inline') {
        return (
            <span role="alert" className={`text-sm text-red-600 ${className}`}>
                {message}
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="ml-2 underline font-medium hover:text-red-800 focus:outline-none focus:ring-1 focus:ring-red-500 rounded"
                    >
                        Retry
                    </button>
                )}
            </span>
        );
    }

    return (
        <div
            role="alert"
            className={`flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}
        >
            <span className="text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </span>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-red-700">{message}</p>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-900 focus:outline-none focus:ring-1 focus:ring-red-500 rounded"
                    >
                        Try again
                    </button>
                )}
            </div>
        </div>
    );
}
