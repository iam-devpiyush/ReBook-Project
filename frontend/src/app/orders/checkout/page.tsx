'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import CheckoutPage from '@/components/payment/CheckoutPage';
import type { OrderSummary } from '@/components/payment/CheckoutPage';

interface DeliveryAddress {
    name: string;
    phone: string;
    address_line1: string;
    city: string;
    state: string;
    pincode: string;
}

interface ListingData {
    id: string;
    images?: string[];
    original_price: number;
    condition_score: number;
    condition_multiplier?: number;
    base_price?: number;
    final_price: number;
    delivery_cost: number;
    platform_commission: number;
    payment_fees: number;
    seller_payout: number;
    book?: { title?: string; author?: string };
    seller?: { name?: string };
}

type Stage = 'address' | 'payment';

export default function CheckoutRoute() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: authLoading } = useAuth();
    const listingId = searchParams.get('listing_id');

    const [listing, setListing] = useState<ListingData | null>(null);
    const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
    const [stage, setStage] = useState<Stage>('address');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [address, setAddress] = useState<DeliveryAddress>({
        name: '',
        phone: '',
        address_line1: '',
        city: '',
        state: '',
        pincode: '',
    });
    const [addressErrors, setAddressErrors] = useState<Partial<DeliveryAddress>>({});

    // Fetch listing on mount
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

        fetch(`/api/listings/${listingId}`)
            .then((r) => r.json())
            .then((json) => {
                if (!json.data) throw new Error(json.error ?? 'Listing not found');
                setListing(json.data);
                setError(null); // clear any previous error
                // Pre-fill name from user profile
                setAddress((a) => ({
                    ...a,
                    name: user.user_metadata?.name ?? user.email ?? '',
                }));
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [listingId, user, authLoading, router]);

    const validateAddress = (): boolean => {
        const errs: Partial<DeliveryAddress> = {};
        if (!address.name.trim()) errs.name = 'Required';
        if (!/^\d{10}$/.test(address.phone)) errs.phone = 'Must be 10 digits';
        if (!address.address_line1.trim()) errs.address_line1 = 'Required';
        if (!address.city.trim()) errs.city = 'Required';
        if (!address.state.trim()) errs.state = 'Required';
        if (!/^\d{6}$/.test(address.pincode)) errs.pincode = 'Must be 6 digits';
        setAddressErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleProceedToPayment = async () => {
        if (!validateAddress() || !listing) return;
        setSubmitting(true);
        setError(null);

        try {
            const orderRes = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    listing_id: listing.id,
                    delivery_address: address,
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
                razorpayOrderId: order.payment_intent_id,
                razorpayAmount: order.price ?? order.total_amount,
                pricing: {
                    original_price: listing.original_price,
                    condition_score: listing.condition_score,
                    condition_multiplier: listing.condition_multiplier ?? 1,
                    base_price: listing.base_price ?? listing.final_price,
                    final_price: listing.final_price,
                    delivery_cost: listing.delivery_cost,
                    platform_commission: listing.platform_commission,
                    payment_fees: listing.payment_fees,
                    seller_payout: listing.seller_payout,
                },
            });
            setStage('payment');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to create order');
        } finally {
            setSubmitting(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (error && !listing) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-red-600 font-medium">{error}</p>
                <button onClick={() => router.back()} className="text-blue-600 underline text-sm">
                    Go back
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-2xl mx-auto px-4">
                <button
                    onClick={() => stage === 'payment' ? setStage('address') : router.back()}
                    className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 mb-6"
                >
                    ← {stage === 'payment' ? 'Edit address' : 'Back'}
                </button>

                {/* Stage 1: Delivery address */}
                {stage === 'address' && listing && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                        <h1 className="text-xl font-bold text-gray-900">Delivery Address</h1>

                        {/* Book summary */}
                        <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                            {listing.images?.[0] && (
                                <img src={listing.images[0]} alt="" className="w-12 h-16 object-cover rounded" />
                            )}
                            <div>
                                <p className="font-medium text-sm text-gray-900">{listing.book?.title ?? 'Book'}</p>
                                <p className="text-xs text-gray-500">{listing.book?.author}</p>
                                <p className="text-sm font-semibold text-green-700 mt-1">₹{listing.final_price}</p>
                            </div>
                        </div>

                        {/* Address form */}
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                                    <input
                                        type="text"
                                        value={address.name}
                                        onChange={(e) => setAddress((a) => ({ ...a, name: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        placeholder="Your name"
                                    />
                                    {addressErrors.name && <p className="text-xs text-red-600 mt-0.5">{addressErrors.name}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone *</label>
                                    <input
                                        type="tel"
                                        value={address.phone}
                                        onChange={(e) => setAddress((a) => ({ ...a, phone: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        placeholder="10-digit mobile"
                                        maxLength={10}
                                    />
                                    {addressErrors.phone && <p className="text-xs text-red-600 mt-0.5">{addressErrors.phone}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Address *</label>
                                <input
                                    type="text"
                                    value={address.address_line1}
                                    onChange={(e) => setAddress((a) => ({ ...a, address_line1: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    placeholder="House/flat no., street, area"
                                />
                                {addressErrors.address_line1 && <p className="text-xs text-red-600 mt-0.5">{addressErrors.address_line1}</p>}
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">City *</label>
                                    <input
                                        type="text"
                                        value={address.city}
                                        onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        placeholder="City"
                                    />
                                    {addressErrors.city && <p className="text-xs text-red-600 mt-0.5">{addressErrors.city}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">State *</label>
                                    <input
                                        type="text"
                                        value={address.state}
                                        onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        placeholder="State"
                                    />
                                    {addressErrors.state && <p className="text-xs text-red-600 mt-0.5">{addressErrors.state}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Pincode *</label>
                                    <input
                                        type="text"
                                        value={address.pincode}
                                        onChange={(e) => setAddress((a) => ({ ...a, pincode: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        placeholder="6 digits"
                                        maxLength={6}
                                    />
                                    {addressErrors.pincode && <p className="text-xs text-red-600 mt-0.5">{addressErrors.pincode}</p>}
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
                        )}

                        <button
                            onClick={handleProceedToPayment}
                            disabled={submitting}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl transition-colors"
                        >
                            {submitting ? 'Processing...' : 'Proceed to Payment →'}
                        </button>
                    </div>
                )}

                {/* Stage 2: Payment */}
                {stage === 'payment' && orderSummary && (
                    <CheckoutPage
                        order={orderSummary}
                        userEmail={user?.email}
                        userName={user?.user_metadata?.name}
                        onSuccess={() => router.push('/orders')}
                        onFailure={(err) => setError(err)}
                    />
                )}
            </div>
        </div>
    );
}
