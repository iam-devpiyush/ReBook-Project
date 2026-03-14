'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import CheckoutPage from '@/components/payment/CheckoutPage';
import type { OrderSummary } from '@/components/payment/CheckoutPage';

export default function CheckoutRoute() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: authLoading } = useAuth();
    const listingId = searchParams.get('listing_id');

    const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push(`/auth/signin?redirect=/orders/checkout?listing_id=${listingId}`);
            return;
        }
        if (!listingId) {
            setError('No listing specified.');
            setLoading(false);
            return;
        }

        // 1. Fetch listing details
        fetch(`/api/listings/${listingId}`)
            .then((r) => r.json())
            .then(async (json) => {
                if (!json.data) throw new Error(json.error ?? 'Listing not found');
                const listing = json.data;

                // 2. Create the order
                const orderRes = await fetch('/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        listing_id: listing.id,
                        delivery_address: {
                            name: user.user_metadata?.name ?? user.email,
                            address_line1: 'Demo Address',
                            city: 'Mumbai',
                            state: 'Maharashtra',
                            pincode: '400001',
                            phone: '9800000000',
                        },
                    }),
                });
                const orderJson = await orderRes.json();
                if (!orderRes.ok) throw new Error(orderJson.error ?? 'Failed to create order');

                const order = orderJson.data;
                setOrderSummary({
                    orderId: order.id,
                    bookTitle: listing.book?.title ?? 'Book',
                    bookAuthor: listing.book?.author ?? '',
                    bookImage: listing.images?.[0],
                    sellerName: listing.seller?.name ?? 'Seller',
                    pricing: {
                        original_price: listing.original_price,
                        condition_score: listing.condition_score,
                        suggested_price: listing.suggested_price ?? listing.final_price,
                        final_price: listing.final_price,
                        delivery_cost: listing.delivery_cost,
                        platform_commission: listing.platform_commission,
                        payment_fees: listing.payment_fees,
                        seller_payout: listing.seller_payout,
                    },
                });
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [listingId, user, authLoading, router]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-red-600 font-medium">{error}</p>
                <button onClick={() => router.back()} className="text-blue-600 underline text-sm">
                    Go back
                </button>
            </div>
        );
    }

    if (!orderSummary) return null;

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-2xl mx-auto px-4 mb-4">
                <button
                    onClick={() => router.back()}
                    className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                >
                    ← Back
                </button>
            </div>
            <CheckoutPage
                order={orderSummary}
                userEmail={user?.email}
                userName={user?.user_metadata?.name}
                onSuccess={() => router.push('/orders')}
                onFailure={(err) => setError(err)}
            />
        </div>
    );
}
