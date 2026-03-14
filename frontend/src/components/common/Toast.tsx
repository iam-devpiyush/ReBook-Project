'use client';

/**
 * Toast notification system — lightweight, accessible, self-contained.
 * Provides useToast hook + ToastContainer component.
 * Requirements: 19.1-19.9 (Task 57.2)
 */

import { useState, useCallback, useEffect, useRef, createContext, useContext } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    variant: ToastVariant;
    title: string;
    message?: string;
    /** ms before auto-dismiss. 0 = no auto-dismiss. Default: 5000 */
    duration?: number;
    /** Show a retry button */
    onRetry?: () => void;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const VARIANT_CONFIG: Record<ToastVariant, { icon: string; bg: string; border: string; titleColor: string }> = {
    success: { icon: '✓', bg: 'bg-green-50', border: 'border-green-300', titleColor: 'text-green-800' },
    error: { icon: '✕', bg: 'bg-red-50', border: 'border-red-300', titleColor: 'text-red-800' },
    warning: { icon: '!', bg: 'bg-yellow-50', border: 'border-yellow-300', titleColor: 'text-yellow-800' },
    info: { icon: 'i', bg: 'bg-blue-50', border: 'border-blue-300', titleColor: 'text-blue-800' },
};

const ICON_BG: Record<ToastVariant, string> = {
    success: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
    warning: 'bg-yellow-100 text-yellow-700',
    info: 'bg-blue-100 text-blue-700',
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface ToastContextValue {
    toasts: Toast[];
    push: (toast: Omit<Toast, 'id'>) => string;
    dismiss: (id: string) => void;
    success: (title: string, message?: string) => string;
    error: (title: string, message?: string, onRetry?: () => void) => string;
    warning: (title: string, message?: string) => string;
    info: (title: string, message?: string) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let _counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const dismiss = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const push = useCallback((toast: Omit<Toast, 'id'>): string => {
        const id = `toast-${++_counter}`;
        setToasts(prev => [...prev.slice(-4), { ...toast, id }]); // cap at 5
        return id;
    }, []);

    const success = useCallback((title: string, message?: string) =>
        push({ variant: 'success', title, message }), [push]);

    const error = useCallback((title: string, message?: string, onRetry?: () => void) =>
        push({ variant: 'error', title, message, duration: 0, onRetry }), [push]);

    const warning = useCallback((title: string, message?: string) =>
        push({ variant: 'warning', title, message }), [push]);

    const info = useCallback((title: string, message?: string) =>
        push({ variant: 'info', title, message }), [push]);

    return (
        <ToastContext.Provider value={{ toasts, push, dismiss, success, error, warning, info }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={dismiss} />
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}

// ─── Single toast item ────────────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
    const cfg = VARIANT_CONFIG[toast.variant];
    const iconBg = ICON_BG[toast.variant];
    const duration = toast.duration ?? 5000;
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (duration <= 0) return;
        timerRef.current = setTimeout(() => onDismiss(toast.id), duration);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [toast.id, duration, onDismiss]);

    return (
        <div
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className={`flex items-start gap-3 rounded-lg border p-4 shadow-lg max-w-sm w-full ${cfg.bg} ${cfg.border}`}
        >
            {/* Icon */}
            <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${iconBg}`} aria-hidden="true">
                {cfg.icon}
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${cfg.titleColor}`}>{toast.title}</p>
                {toast.message && (
                    <p className="text-sm text-gray-600 mt-0.5">{toast.message}</p>
                )}
                {toast.onRetry && (
                    <button
                        onClick={() => { toast.onRetry?.(); onDismiss(toast.id); }}
                        className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800 underline focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                    >
                        Retry
                    </button>
                )}
            </div>

            {/* Dismiss */}
            <button
                onClick={() => onDismiss(toast.id)}
                aria-label="Dismiss notification"
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-lg leading-none focus:outline-none focus:ring-1 focus:ring-gray-400 rounded"
            >
                ×
            </button>
        </div>
    );
}

// ─── Container ────────────────────────────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
    if (toasts.length === 0) return null;
    return (
        <div
            className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
            aria-label="Notifications"
        >
            {toasts.map(t => (
                <div key={t.id} className="pointer-events-auto">
                    <ToastItem toast={t} onDismiss={onDismiss} />
                </div>
            ))}
        </div>
    );
}
