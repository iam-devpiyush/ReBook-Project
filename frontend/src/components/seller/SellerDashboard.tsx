'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { SellerListing } from './MyListingsPage';

interface SellerDashboardProps {
    userId: string;
    onNavigate?: (page: 'listings' | 'orders' | 'earnings') => void;
}

type TabFilter = 'all' | 'pending_approval' | 'active' | 'sold';

const TABS: { id: TabFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pending_approval', label: 'Pending' },
    { id: 'active', label: 'Active' },
    { id: 'sold', label: 'Sold' },
];

const STATUS_BADGE: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    pending_approval: 'bg-yellow-100 text-yellow-700',
    rejected: 'bg-red-100 text-red-700',
    sold: 'bg-purple-100 text-purple-700',
    inactive: 'bg-gray-100 text-gray-600',
    rescan_required: 'bg-orange-100 text-orange-700',
};

function statusLabel(s: string) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function SellerDashboard({ userId, onNavigate: _onNavigate }: SellerDashboardProps) {
    const [listings, setListings] = useState<SellerListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<TabFilter>('all');
    const [totalEarnings, setTotalEarnings] = useState(0);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [listingsRes, ordersRes] = await Promise.all([
                fetch('/api/listings/seller/me?pageSize=100'),
                fetch('/api/orders?pageSize=100'),
            ]);
            const listingsJson = await listingsRes.json();
            const ordersJson = await ordersRes.json();

            const allListings: SellerListing[] = listingsJson.data ?? [];
            setListings(allListings);

            // Compute earnings only from orders where this user is the seller
            const orders = (ordersJson.data ?? []) as Array<{ status: string; seller_payout?: number; price?: number; seller_id?: string }>;
            const earned = orders
                .filter(o => o.seller_id === userId)
                .filter(o => o.status === 'delivered' || o.status === 'paid' || o.status === 'shipped')
                .reduce((sum, o) => sum + (o.seller_payout ?? (o.price ?? 0) * 0.875), 0);
            setTotalEarnings(earned);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const total = listings.length;
    const sold = listings.filter(l => l.status === 'sold').length;
    const pending = listings.filter(l => l.status === 'pending_approval').length;
    const active = listings.filter(l => l.status === 'active').length;

    const filtered = tab === 'all' ? listings : listings.filter(l => l.status === tab);

    // Eco: each sold book saves ~0.033 trees
    const treesSaved = (sold / 30).toFixed(2);
    const co2Saved = (sold * 2.5).toFixed(1);

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
                </div>
                <div className="h-32 bg-gray-200 rounded-xl" />
                <div className="h-48 bg-gray-200 rounded-xl" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-center justify-between">
                <span className="text-sm">{error}</span>
                <button onClick={fetchData} className="text-sm font-medium underline ml-4">Retry</button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Listed" value={total} icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>} color="bg-blue-50 text-blue-600" />
                <StatCard label="Books Sold" value={sold} icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} color="bg-green-50 text-green-600" />
                <StatCard label="Pending" value={pending} icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} color="bg-yellow-50 text-yellow-600" />
                <StatCard label="Total Earnings" value={`₹${totalEarnings.toFixed(0)}`} icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} color="bg-purple-50 text-purple-600" />
            </div>

            {/* Eco impact card */}
            <div className="bg-green-600 rounded-2xl p-5 text-white">
                <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    <h3 className="font-semibold text-lg">Your Eco Impact</h3>
                </div>
                <p className="text-green-100 text-sm mb-4">
                    By selling {sold} book{sold !== 1 ? 's' : ''} second-hand, you've contributed to a greener planet.
                </p>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-2xl font-bold">{treesSaved}</p>
                        <p className="text-green-100 text-xs mt-0.5">Trees Saved</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{sold * 50}L</p>
                        <p className="text-green-100 text-xs mt-0.5">Water Saved</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{co2Saved}kg</p>
                        <p className="text-green-100 text-xs mt-0.5">CO₂ Reduced</p>
                    </div>
                </div>
            </div>

            {/* Listings table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-gray-200 px-4">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t.id
                                ? 'border-green-600 text-green-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {t.label}
                            {t.id === 'all' && <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{total}</span>}
                            {t.id === 'pending_approval' && pending > 0 && <span className="ml-1.5 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">{pending}</span>}
                            {t.id === 'active' && <span className="ml-1.5 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{active}</span>}
                            {t.id === 'sold' && <span className="ml-1.5 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">{sold}</span>}
                        </button>
                    ))}
                </div>

                {/* Listing rows */}
                {filtered.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <p className="text-sm">No listings in this category yet.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {filtered.map(listing => {
                            const book = listing.books ?? null;
                            const badge = STATUS_BADGE[listing.status] ?? 'bg-gray-100 text-gray-600';
                            const payout = Math.round(listing.final_price * 0.875);

                            return (
                                <li key={listing.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
                                    {/* Cover */}
                                    <div className="w-12 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                                        {listing.images?.[0] ? (
                                            <img
                                                src={listing.images[0]}
                                                alt={book?.title ?? ''}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 text-sm truncate">{book?.title ?? 'Untitled'}</p>
                                        <p className="text-xs text-gray-500 truncate">{book?.author ?? ''}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">Condition: {listing.condition_score}/5</p>
                                    </div>

                                    {/* Price */}
                                    <div className="text-right flex-shrink-0 hidden sm:block">
                                        <p className="text-sm font-semibold text-gray-900">₹{listing.final_price.toLocaleString('en-IN')}</p>
                                        <p className="text-xs text-gray-400">Payout: ₹{payout.toLocaleString('en-IN')}</p>
                                    </div>

                                    {/* Status */}
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${badge}`}>
                                        {statusLabel(listing.status)}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: ReactNode; color: string }) {
    return (
        <div className={`rounded-xl p-4 ${color.split(' ')[0]} border border-gray-100`}>
            <div className="flex items-center justify-between mb-2">
                <span className={`w-6 h-6 ${color.split(' ')[1]}`}>{icon}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        </div>
    );
}
