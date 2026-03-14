'use client';

/**
 * EarningsPage Component
 *
 * Displays total sales, platform commission, payment fees, net earnings,
 * and a per-order earnings breakdown.
 *
 * Requirements: Seller earnings (Requirement 15.8)
 */

import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EarningsOrder {
    id: string;
    price: number;
    delivery_cost: number;
    platform_commission: number;
    payment_fees: number;
    seller_payout: number;
    status: string;
    created_at: string;
    listing?: {
        book?: { title: string; author: string } | null;
    } | null;
}

interface EarningsSummary {
    total_sales: number;
    platform_commission: number;
    payment_fees: number;
    net_earnings: number;
    order_count: number;
}

export interface EarningsPageProps {
    /** Pre-fetched orders (optional; component fetches if not provided) */
    orders?: EarningsOrder[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COMPLETED_STATUSES = new Set(['delivered', 'shipped', 'paid']);

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
    });
}

function formatCurrency(amount: number) {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Derive breakdown from order fields */
function deriveBreakdown(order: EarningsOrder) {
    const total = order.price ?? 0;
    const commission = order.platform_commission ?? total * 0.10;
    const fees = order.payment_fees ?? (total * 0.025 + 3);
    const payout = order.seller_payout ?? (total - commission - fees);
    return { total, commission, fees, payout };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
    label,
    value,
    icon,
    color,
    note,
}: {
    label: string;
    value: string;
    icon: React.ReactNode;
    color: string;
    note?: string;
}) {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-5 flex items-start gap-4">
            <div className={`p-2.5 rounded-full ${color} flex-shrink-0`}>{icon}</div>
            <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
                {note && <p className="text-xs text-gray-400 mt-0.5">{note}</p>}
            </div>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-lg" />)}
            </div>
            <div className="h-64 bg-gray-200 rounded-lg" />
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EarningsPage({ orders: propOrders }: EarningsPageProps) {
    const [orders, setOrders] = useState<EarningsOrder[]>(propOrders ?? []);
    const [loading, setLoading] = useState(!propOrders);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchOrders = useCallback(async () => {
        if (propOrders) return;
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ page: String(page), pageSize: '20' });
            const res = await fetch(`/api/orders?${params}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? 'Failed to load orders');
            setOrders(json.data ?? []);
            setTotalPages(json.pagination?.totalPages ?? 1);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load earnings');
        } finally {
            setLoading(false);
        }
    }, [page, propOrders]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Compute summary from completed orders
    const completedOrders = orders.filter(o => COMPLETED_STATUSES.has(o.status));
    const summary: EarningsSummary = completedOrders.reduce(
        (acc, order) => {
            const { total, commission, fees, payout } = deriveBreakdown(order);
            return {
                total_sales: acc.total_sales + total,
                platform_commission: acc.platform_commission + commission,
                payment_fees: acc.payment_fees + fees,
                net_earnings: acc.net_earnings + payout,
                order_count: acc.order_count + 1,
            };
        },
        { total_sales: 0, platform_commission: 0, payment_fees: 0, net_earnings: 0, order_count: 0 }
    );

    if (loading) return <LoadingSkeleton />;

    if (error) {
        return (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex items-center justify-between">
                <span className="text-sm">{error}</span>
                <button onClick={fetchOrders} className="text-sm font-medium underline ml-4">Retry</button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>

            {/* ── Summary Cards ── */}
            <section>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <SummaryCard
                        label="Total Sales"
                        value={formatCurrency(summary.total_sales)}
                        icon={<RevenueIcon />}
                        color="bg-emerald-100 text-emerald-600"
                        note={`${summary.order_count} order${summary.order_count !== 1 ? 's' : ''}`}
                    />
                    <SummaryCard
                        label="Platform Commission"
                        value={formatCurrency(summary.platform_commission)}
                        icon={<CommissionIcon />}
                        color="bg-orange-100 text-orange-600"
                        note="10% of base price"
                    />
                    <SummaryCard
                        label="Payment Fees"
                        value={formatCurrency(summary.payment_fees)}
                        icon={<FeeIcon />}
                        color="bg-yellow-100 text-yellow-600"
                        note="2.5% + ₹3 per order"
                    />
                    <SummaryCard
                        label="Net Earnings"
                        value={formatCurrency(summary.net_earnings)}
                        icon={<WalletIcon />}
                        color="bg-teal-100 text-teal-600"
                        note="After all deductions"
                    />
                </div>
            </section>

            {/* ── Earnings Breakdown ── */}
            <section>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Order Breakdown</h2>

                {orders.length === 0 ? (
                    <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-3xl mb-2" aria-hidden="true">💰</p>
                        <p className="font-medium text-gray-700">No earnings yet</p>
                        <p className="text-sm mt-1">Your earnings will appear here once orders are placed.</p>
                    </div>
                ) : (
                    <>
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            {/* Table header */}
                            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                <span>Book / Order</span>
                                <span className="text-right">Sale Price</span>
                                <span className="text-right">Commission</span>
                                <span className="text-right">Fees</span>
                                <span className="text-right">Your Payout</span>
                            </div>

                            {/* Order rows */}
                            <ul aria-label="Earnings breakdown by order">
                                {orders.map((order, idx) => {
                                    const book = order.listing?.book;
                                    const { total, commission, fees, payout } = deriveBreakdown(order);
                                    const isCompleted = COMPLETED_STATUSES.has(order.status);

                                    return (
                                        <li
                                            key={order.id}
                                            className={`px-4 py-4 ${idx !== orders.length - 1 ? 'border-b border-gray-100' : ''} ${!isCompleted ? 'opacity-60' : ''}`}
                                        >
                                            {/* Mobile layout */}
                                            <div className="sm:hidden space-y-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <p className="font-medium text-gray-900 text-sm line-clamp-1">
                                                            {book?.title ?? 'Unknown Book'}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            #{order.id.slice(0, 8).toUpperCase()} · {formatDate(order.created_at)}
                                                        </p>
                                                    </div>
                                                    {!isCompleted && (
                                                        <span className="text-xs text-gray-400 italic shrink-0">Pending</span>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                                    <div className="text-gray-500">Sale: <span className="text-gray-800 font-medium">{formatCurrency(total)}</span></div>
                                                    <div className="text-gray-500">Commission: <span className="text-red-600 font-medium">-{formatCurrency(commission)}</span></div>
                                                    <div className="text-gray-500">Fees: <span className="text-red-600 font-medium">-{formatCurrency(fees)}</span></div>
                                                    <div className="text-gray-500">Payout: <span className={`font-bold ${isCompleted ? 'text-green-600' : 'text-gray-600'}`}>{formatCurrency(payout)}</span></div>
                                                </div>
                                            </div>

                                            {/* Desktop layout */}
                                            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center">
                                                <div>
                                                    <p className="font-medium text-gray-900 text-sm line-clamp-1">
                                                        {book?.title ?? 'Unknown Book'}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        #{order.id.slice(0, 8).toUpperCase()} · {formatDate(order.created_at)}
                                                        {!isCompleted && <span className="ml-2 text-gray-400 italic">({order.status.replace(/_/g, ' ')})</span>}
                                                    </p>
                                                </div>
                                                <span className="text-sm text-gray-800 font-medium text-right">{formatCurrency(total)}</span>
                                                <span className="text-sm text-red-600 text-right">-{formatCurrency(commission)}</span>
                                                <span className="text-sm text-red-600 text-right">-{formatCurrency(fees)}</span>
                                                <span className={`text-sm font-bold text-right ${isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                                                    {formatCurrency(payout)}
                                                </span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>

                            {/* Totals row */}
                            {completedOrders.length > 0 && (
                                <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm font-semibold text-gray-800">
                                    <span>Total ({summary.order_count} completed)</span>
                                    <span className="text-right">{formatCurrency(summary.total_sales)}</span>
                                    <span className="text-right text-red-600">-{formatCurrency(summary.platform_commission)}</span>
                                    <span className="text-right text-red-600">-{formatCurrency(summary.payment_fees)}</span>
                                    <span className="text-right text-green-600">{formatCurrency(summary.net_earnings)}</span>
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-3 pt-4">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1 || loading}
                                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                                >
                                    Previous
                                </button>
                                <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages || loading}
                                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* ── Pricing note ── */}
            <p className="text-xs text-gray-400 text-center">
                Commission = 10% of base price · Payment fees = 2.5% + ₹3 per order · Net earnings = sale price − commission
            </p>
        </div>
    );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function RevenueIcon() {
    return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function CommissionIcon() {
    return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
    );
}

function FeeIcon() {
    return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
    );
}

function WalletIcon() {
    return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
    );
}
