'use client';

import { useRouter } from 'next/navigation';
import SearchPage from '@/components/search/SearchPage';
import type { ListingDocument } from '@/services/search.service';

export default function SearchRoute() {
    const router = useRouter();
    return <SearchPage onListingClick={(listing: ListingDocument) => router.push(`/listings/${listing.id}`)} />;
}
