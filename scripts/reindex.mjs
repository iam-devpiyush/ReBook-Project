#!/usr/bin/env node
/**
 * Reindex all active listings from Supabase into Meilisearch.
 * Usage: node scripts/reindex.mjs
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *           MEILISEARCH_HOST, MEILISEARCH_ADMIN_API_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { MeiliSearch } from 'meilisearch';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local from frontend/
config({ path: resolve(process.cwd(), 'frontend/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MEILI_HOST = process.env.MEILISEARCH_HOST;
const MEILI_KEY = process.env.MEILISEARCH_ADMIN_API_KEY || process.env.MEILISEARCH_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !MEILI_HOST || !MEILI_KEY) {
  console.error('Missing required environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const meili = new MeiliSearch({ host: MEILI_HOST, apiKey: MEILI_KEY });

async function fetchAllListings() {
  const PAGE = 200;
  let offset = 0;
  const all = [];

  while (true) {
    const { data, error } = await supabase
      .from('listings')
      .select(`
        id, seller_id, status, condition_score, final_price, original_price,
        delivery_cost, images, created_at, updated_at, book_id,
        book:books(id, isbn, title, author, publisher, subject, description, category_id),
        seller:users!listings_seller_id_fkey(id, city, state, pincode, latitude, longitude)
      `)
      .eq('status', 'active')
      .range(offset, offset + PAGE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

function buildDoc(l) {
  return {
    id: l.id,
    book_id: l.book?.id ?? l.book_id ?? '',
    seller_id: l.seller_id,
    title: l.book?.title ?? '',
    author: l.book?.author ?? '',
    isbn: l.book?.isbn ?? null,
    subject: l.book?.subject ?? null,
    publisher: l.book?.publisher ?? null,
    description: l.book?.description ?? null,
    category_id: l.book?.category_id ?? '',
    status: l.status,
    condition_score: l.condition_score,
    final_price: l.final_price,
    original_price: l.original_price,
    delivery_cost: l.delivery_cost,
    images: l.images ?? [],
    location: {
      city: l.seller?.city ?? '',
      state: l.seller?.state ?? '',
      pincode: l.seller?.pincode ?? '',
      latitude: l.seller?.latitude ?? null,
      longitude: l.seller?.longitude ?? null,
    },
    // Store as Unix timestamp so Meilisearch sorts numerically, not lexicographically
    created_at: l.created_at ? Math.floor(new Date(l.created_at).getTime() / 1000) : 0,
    updated_at: l.updated_at ? Math.floor(new Date(l.updated_at).getTime() / 1000) : 0,
  };
}

async function main() {
  console.log('Fetching listings from Supabase...');
  const listings = await fetchAllListings();
  console.log(`Fetched ${listings.length} active listings.`);

  const index = meili.index('listings');

  console.log('Deleting all existing Meilisearch documents...');
  await index.deleteAllDocuments();
  // Give Meilisearch time to process the delete before inserting
  await new Promise(r => setTimeout(r, 3000));
  console.log('Deleted all documents.');

  const docs = listings.map(buildDoc);
  const BATCH = 100;
  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH);
    await index.addDocuments(batch);
    console.log(`Indexed ${Math.min(i + BATCH, docs.length)}/${docs.length}`);
    // Small delay between batches
    if (i + BATCH < docs.length) await new Promise(r => setTimeout(r, 500));
  }

  // Wait for indexing to complete
  await new Promise(r => setTimeout(r, 3000));
  const stats = await index.getStats();
  console.log(`Done. Meilisearch now has ${stats.numberOfDocuments} documents.`);
}

main().catch(err => { console.error('Reindex failed:', err); process.exit(1); });
