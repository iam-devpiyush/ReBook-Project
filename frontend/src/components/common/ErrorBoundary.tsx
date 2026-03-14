'use client';

/**
 * ErrorBoundary — catches render errors in the React tree.
 * Requirements: 19.1-19.9 (Task 57.2)
 */

import React from 'react';

interface Props {
    children: React.ReactNode;
    /** Custom fallback UI. Receives error and a reset callback. */
    fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface State {
    error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary]', error, info.componentStack);
    }

    reset = () => this.setState({ error: null });

    render() {
        const { error } = this.state;
        if (error) {
            if (this.props.fallback) {
                return this.props.fallback(error, this.reset);
            }
            return <DefaultErrorFallback error={error} reset={this.reset} />;
        }
        return this.props.children;
    }
}

/** Default fallback shown when no custom fallback is provided */
function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
    return (
        <div
            role="alert"
            className="flex flex-col items-center justify-center min-h-[20vh] gap-4 p-8 text-center"
        >
            <div className="text-4xl" aria-hidden="true">⚠️</div>
            <div>
                <p className="font-semibold text-gray-800">Something went wrong</p>
                <p className="text-sm text-gray-500 mt-1 max-w-sm">
                    {friendlyMessage(error)}
                </p>
            </div>
            <button
                onClick={reset}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
                Try again
            </button>
        </div>
    );
}

/** Map technical errors to user-friendly messages */
function friendlyMessage(error: Error): string {
    const msg = error.message.toLowerCase();
    if (msg.includes('network') || msg.includes('fetch')) {
        return 'A network error occurred. Please check your connection and try again.';
    }
    if (msg.includes('unauthorized') || msg.includes('401')) {
        return 'Your session has expired. Please sign in again.';
    }
    if (msg.includes('forbidden') || msg.includes('403')) {
        return "You don't have permission to view this content.";
    }
    if (msg.includes('not found') || msg.includes('404')) {
        return 'The requested content could not be found.';
    }
    return 'An unexpected error occurred. Please try again.';
}

export default ErrorBoundary;
