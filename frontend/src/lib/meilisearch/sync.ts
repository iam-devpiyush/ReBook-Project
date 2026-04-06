/**
 * Server-side Meilisearch sync utilities.
 * Uses the ADMIN key — never import this in client components.
 */

import { MeiliSearch } from 'meilisearch';
import { createClient } from '@supabase/supabase-js';
import type { ListingDocument } from '@/services/search.service';

function getAdminClient() {
  return new MeiliSearch({
    host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
    apiKey: process.env.MEILISEARCH_ADMIN_API_KEY || process.env.MEILISEARCH_API_KEY || '',
  });
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  ) as any;
}

/**
 * Fetch a listing from Supabase with all joins and sync it to Meilisearch.
 * This is the canonical way to sync a single listing — always fetches fresh data.
 * Retries up to 3 times on failure.
 */
export async function syncListingToMeili(listingId: string): Promise<void> {
  const supabase = getSupabase();

  const { data: listing, error } = await supabase
    .from('listings')
    .select(`
      id, seller_id, status, condition_score, final_price, original_price,
      delivery_cost, images, created_at, updated_at, book_id,
      city, state, pincode, latitude, longitude,
      book:books(id, isbn, title, author, publisher, subject, description, category_id),
      seller:users!listings_seller_id_fkey(id, city, state, pincode, latitude, longitude)
    `)
    .eq('id', listingId)
    .single();

  if (error || !listing) {
    console.error(`[Meilisearch] Failed to fetch listing ${listingId} for sync:`, error);
    return;
  }

  const doc = buildListingDoc(listing);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const client = getAdminClient();
      await client.index('listings').addDocuments([doc]);
      console.info(`[Meilisearch] Synced listing ${listingId} (attempt ${attempt})`);
      return;
    } catch (err) {
      console.error(`[Meilisearch] Sync attempt ${attempt} failed for ${listingId}:`, err);
      if (attempt < 3) await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }
  console.error(`[Meilisearch] All sync attempts failed for listing ${listingId}`);
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
    condition_score: Number(l.condition_score),
    final_price: Number(l.final_price),
    original_price: l.original_price ? Number(l.original_price) : null,
    delivery_cost: l.delivery_cost ? Number(l.delivery_cost) : null,
    images: l.images ?? [],
    location: {
      city: l.seller?.city ?? l.city ?? '',
      state: l.seller?.state ?? l.state ?? '',
      pincode: l.seller?.pincode ?? l.pincode ?? '',
      latitude: l.seller?.latitude ?? l.latitude ?? null,
      longitude: l.seller?.longitude ?? l.longitude ?? null,
    },
    // Unix timestamp for correct numeric sorting in Meilisearch
    created_at: (l.created_at ? Math.floor(new Date(l.created_at).getTime() / 1000) : 0) as unknown as string,
    updated_at: (l.updated_at ? Math.floor(new Date(l.updated_at).getTime() / 1000) : 0) as unknown as string,
  };
}
