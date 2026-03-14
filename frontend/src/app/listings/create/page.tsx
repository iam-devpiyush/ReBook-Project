'use client';

import CreateListingForm from '@/components/listings/CreateListingForm';

export default function CreateListingRoute() {
    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-3xl mx-auto px-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Sell a Book</h1>
                <CreateListingForm />
            </div>
        </div>
    );
}
