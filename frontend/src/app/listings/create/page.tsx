'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/hooks';
import CreateListingForm from '@/components/listings/CreateListingForm';

export default function CreateListingRoute() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/auth/signin?redirect=/listings/create&message=sign-in-to-sell');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
            </div>
        );
    }

    if (!user) {
        return null; // redirect in progress
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-3xl mx-auto px-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Sell a Book</h1>
                <CreateListingForm />
            </div>
        </div>
    );
}
