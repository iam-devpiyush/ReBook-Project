'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import SearchPage from '@/components/search/SearchPage';
import type { ListingDocument } from '@/services/search.service';

export default function SearchRoute() {
    const router = useRouter();
    // Force SearchPage to remount on every visit so it always fetches fresh data
    const [mountKey, setMountKey] = useState(0);
    useEffect(() => { setMountKey(k => k + 1); }, []);

    return <SearchPage key={mountKey} onListingClick={(listing: ListingDocument) => router.push(`/listings/${listing.id}`)} />;
}
