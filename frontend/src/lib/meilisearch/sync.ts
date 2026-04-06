/**
 * Server-side Meilisearch sync utilities.
 * Uses the ADMIN key — never import this in client components.
 */

import { MeiliSearch } from 'meilisearch';
import type { ListingDocument } from '@/services/search.service';

function getAdminClient() {
  return new MeiliSearch({
    host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
    apiKey: process.env.MEILISEARCH_ADMIN_API_KEY || process.env.MEILISEARCH_API_KEY || '',
  });
}

export async function meiliAddListing(doc: ListingDocument): Promise<void> {
  try {
    const client = getAdminClient();
    await client.index('listings').addDocuments([doc]);
  } catch (err) {
    console.error('[Meilisearch] addListing failed:', err);
  }
}

export async function meiliUpdateListing(doc: ListingDocument): Promise<void> {
  try {
    const client = getAdminClient();
    await client.index('listings').updateDocuments([doc]);
  } catch (err) {
    console.error('[Meilisearch] updateListing failed:', err);
  }
}

export async function meiliDeleteListing(id: string): Promise<void> {
  try {
    const client = getAdminClient();
    await client.index('listings').deleteDocument(id);
  } catch (err) {
    console.error('[Meilisearch] deleteListing failed:', err);
  }
}

/** Build a ListingDocument from a raw Supabase listing row with joined book/seller */
export function buildListingDoc(l: any): ListingDocument {
  return {
    id: l.id,
    book_id: l.book_id ?? l.book?.id ?? '',
    seller_id: l.seller_id,
    title: l.book?.title ?? l.title ?? '',
    author: l.book?.author ?? l.author ?? '',
    isbn: l.book?.isbn ?? l.isbn ?? null,
    subject: l.book?.subject ?? l.subject ?? null,
    publisher: l.book?.publisher ?? l.publisher ?? null,
    description: l.book?.description ?? l.description ?? null,
    category_id: l.book?.category_id ?? l.category_id ?? '',
    status: l.status,
    condition_score: l.condition_score,
    final_price: l.final_price,
    original_price: l.original_price,
    delivery_cost: l.delivery_cost,
    images: l.images ?? [],
    location: {
      city: l.seller?.city ?? l.city ?? '',
      state: l.seller?.state ?? l.state ?? '',
      pincode: l.seller?.pincode ?? l.pincode ?? '',
      latitude: l.seller?.latitude ?? l.latitude ?? null,
      longitude: l.seller?.longitude ?? l.longitude ?? null,
    },
    created_at: l.created_at,
    updated_at: l.updated_at,
  };
}
