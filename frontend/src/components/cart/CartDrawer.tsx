'use client';

import { useState } from 'react';
import { useCart } from '@/lib/cart/CartContext';
import { useAuth } from '@/lib/auth/useAuth';
import { useRouter } from 'next/navigation';

const CONDITION_LABELS: Record<number, string> = {
    5: 'Like New', 4: 'Very Good', 3: 'Good', 2: 'Acceptable', 1: 'Poor',
};

export default function CartDrawer() {
    const { items, removeItem, clearCart, open, setOpen } = useCart();
    const { user } = useAuth();
    const router = useRouter();
    const [placingId] = useState<string | null>(null);
    const [successIds] = useState<Set<string>>(new Set());

    const total = items.reduce((sum, i) => sum + i.price, 0);

    const handlePlaceOrder = async (listingId: string) => {
        if (!user) { router.push('/auth/signin'); return; }
        // Redirect to the proper checkout page with address form + Razorpay payment
        setOpen(false);
        router.push(`/orders/checkout?listing_id=${listingId}`);
    };

    const handlePlaceAll = async () => {
        const first = items.find(i => !successIds.has(i.listingId));
        if (first) handlePlaceOrder(first.listingId);
    };

    if (!open) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 z-40 transition-opacity"
                onClick={() => setOpen(false)}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        <h2 className="font-semibold text-gray-900">Cart</h2>
                        {items.length > 0 && (
                            <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                                {items.length}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => setOpen(false)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                    {items.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            <p className="text-sm">Your cart is empty</p>
                            <button
                                onClick={() => { setOpen(false); router.push('/search'); }}
                                className="mt-4 text-sm text-green-600 font-medium hover:underline"
                            >
                                Browse Books →
                            </button>
                        </div>
                    ) : (
                        items.map(item => {
                            const isSuccess = successIds.has(item.listingId);
                            const isPlacing = placingId === item.listingId;

                            return (
                                <div key={item.listingId} className={`flex gap-3 p-3 rounded-xl border transition-colors ${isSuccess ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
                                    {/* Cover */}
                                    <div className="w-12 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                                        {item.image ? (
                                            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">📚</div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                                        <p className="text-xs text-gray-500 truncate">{item.author}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{CONDITION_LABELS[item.conditionScore] ?? `Score ${item.conditionScore}`}</p>
                                        <p className="text-sm font-bold text-green-600 mt-1">₹{item.price.toLocaleString('en-IN')}</p>

                                        {isSuccess ? (
                                            <p className="text-xs text-green-600 font-medium mt-1">✓ Order placed!</p>
                                        ) : (
                                            <button
                                                onClick={() => handlePlaceOrder(item.listingId)}
                                                disabled={isPlacing}
                                                className="mt-2 text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
                                            >
                                                {isPlacing ? 'Placing...' : 'Place Order'}
                                            </button>
                                        )}
                                    </div>

                                    {/* Remove */}
                                    {!isSuccess && (
                                        <button
                                            onClick={() => removeItem(item.listingId)}
                                            className="flex-shrink-0 p-1 text-gray-300 hover:text-red-400 transition-colors self-start"
                                            aria-label="Remove from cart"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Total ({items.length} item{items.length !== 1 ? 's' : ''})</span>
                            <span className="font-bold text-gray-900">₹{total.toLocaleString('en-IN')}</span>
                        </div>
                        <button
                            onClick={handlePlaceAll}
                            disabled={placingId !== null || items.every(i => successIds.has(i.listingId))}
                            className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                            Place All Orders
                        </button>
                        <button
                            onClick={clearCart}
                            className="w-full py-2 text-sm text-gray-400 hover:text-red-500 transition-colors"
                        >
                            Clear cart
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
