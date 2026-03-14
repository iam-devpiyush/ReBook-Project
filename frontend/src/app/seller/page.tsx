'use client';

/**
 * Seller Portal Page
 *
 * Tabbed interface for the seller portal: Dashboard, My Listings, Orders, Earnings.
 * Requires authentication.
 */

import { useState } from 'react';
import { useAuth } from '@/lib/auth/useAuth';
import SellerDashboard from '@/components/seller/SellerDashboard';
import MyListingsPage from '@/components/seller/MyListingsPage';
import EarningsPage from '@/components/seller/EarningsPage';
import SellerOrdersPage from '@/components/orders/SellerOrdersPage';

type Tab = 'dashboard' | 'listings' | 'orders' | 'earnings';

const TABS: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'listings', label: 'My Listings' },
    { id: 'orders', label: 'Orders' },
    { id: 'earnings', label: 'Earnings' },
];

export default function SellerPortalPage() {
    const { user, loading } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen text-gray-500">
                <div className="text-center">
                    <p className="text-lg font-medium">Sign in to access the Seller Portal</p>
                    <a href="/auth/signin" className="mt-3 inline-block text-blue-600 hover:underline text-sm">
                        Sign in →
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-14">
                        <h1 className="text-lg font-bold text-gray-900">Seller Dashboard</h1>
                        <span className="text-sm text-gray-500 hidden sm:block">
                            {user.user_metadata?.name ?? user.email}
                        </span>
                    </div>

                    {/* Tabs */}
                    <nav className="flex gap-1 -mb-px" aria-label="Seller portal navigation">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-green-600 text-green-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                aria-current={activeTab === tab.id ? 'page' : undefined}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Content */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                {activeTab === 'dashboard' && (
                    <SellerDashboard
                        userId={user.id}
                        onNavigate={(page) => setActiveTab(page === 'listings' ? 'listings' : page === 'orders' ? 'orders' : 'earnings')}
                    />
                )}
                {activeTab === 'listings' && (
                    <MyListingsPage
                        onEdit={(id) => {
                            // Navigate to edit page
                            window.location.href = `/listings/${id}/edit`;
                        }}
                        onCreateNew={() => {
                            window.location.href = '/listings/create';
                        }}
                    />
                )}
                {activeTab === 'orders' && (
                    <SellerOrdersPage currentUserId={user.id} />
                )}
                {activeTab === 'earnings' && (
                    <EarningsPage />
                )}
            </main>
        </div>
    );
}
