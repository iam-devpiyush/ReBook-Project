/**
 * Meilisearch Sync Script
 * Pulls all active listings from Supabase and indexes them in Meilisearch.
 * Also configures index settings (searchable/filterable/sortable attributes).
 *
 * Usage:
 *   npx ts-node --project scripts/tsconfig.json scripts/sync-meilisearch.ts
 *
 * Run this after seeding demo data or whenever the Meilisearch index is out of sync.
 */

import { createClient } from '@supabase/supabase-js';
import { MeiliSearch } from 'meilisearch';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../frontend/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const MEILI_HOST = process.env.MEILISEARCH_HOST || 'http://localhost:7700';
const MEILI_KEY = process.env.MEILISEARCH_API_KEY || '';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const meili = new MeiliSearch({ host: MEILI_HOST, apiKey: MEILI_KEY });

async function configureIndex() {
    console.log('\n⚙️  Configuring Meilisearch index settings...');
    const index = meili.index('listings');

    await index.updateSettings({
        searchableAttributes: ['title', 'author', 'subject', 'isbn', 'publisher', 'description'],
        filterableAttributes: [
            'status',
            'category_id',
            'condition_score',
            'final_price',
            'location.city',
            'location.state',
            'location.pincode',
        ],
        sortableAttributes: ['final_price', 'created_at', 'condition_score'],
        typoTolerance: { enabled: true, minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 } },
        rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
    });

    console.log('  ✓ Index settings updated');
}

async function fetchListings() {
    console.log('\n📦 Fetching active listings from Supabase...');
    const PAGE_SIZE = 100;
    let offset = 0;
    const all: any[] = [];

    while (true) {
        const { data, error } = await supabase
            .from('listings')
            .select(`
        id, book_id, seller_id, status,
        original_price, condition_score, final_price, delivery_cost,
        platform_commission, payment_fees, seller_payout,
        images, city, state, pincode, latitude, longitude,
        views, created_at, updated_at,
        books (
          id, isbn, title, author, publisher, edition,
          publication_year, category_id, subject, description
        )
      `)
            .eq('status', 'active')
            .range(offset, offset + PAGE_SIZE - 1);

        if (error) throw new Error(`Supabase fetch error: ${error.message}`);
        if (!data || data.length === 0) break;

        all.push(...data);
        process.stdout.write(`  Fetched ${all.length} listings...\r`);

        if (data.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
    }

    console.log(`\n  ✓ ${all.length} active listings fetched`);
    return all;
}

function transformListing(row: any) {
    const book = row.books ?? {};
    return {
        id: row.id,
        book_id: row.book_id,
        seller_id: row.seller_id,
        status: row.status,
        // Book fields (searchable)
        title: book.title ?? '',
        author: book.author ?? '',
        isbn: book.isbn ?? '',
        publisher: book.publisher ?? '',
        subject: book.subject ?? '',
        description: book.description ?? '',
        category_id: book.category_id ?? '',
        publication_year: book.publication_year ?? null,
        // Pricing
        original_price: row.original_price,
        condition_score: row.condition_score,
        final_price: row.final_price,
        delivery_cost: row.delivery_cost,
        platform_commission: row.platform_commission,
        payment_fees: row.payment_fees,
        seller_payout: row.seller_payout,
        // Location (nested for Meilisearch filtering)
        location: {
            city: row.city ?? '',
            state: row.state ?? '',
            pincode: row.pincode ?? '',
            latitude: row.latitude ?? null,
            longitude: row.longitude ?? null,
        },
        // Metadata
        images: row.images ?? [],
        views: row.views ?? 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

async function indexListings(listings: any[]) {
    if (listings.length === 0) {
        console.log('\n⚠️  No listings to index');
        return;
    }

    console.log(`\n🔍 Indexing ${listings.length} listings into Meilisearch...`);
    const index = meili.index('listings');
    const documents = listings.map(transformListing);

    // Batch in chunks of 100
    const BATCH = 100;
    let lastTask: any;
    for (let i = 0; i < documents.length; i += BATCH) {
        const chunk = documents.slice(i, i + BATCH);
        lastTask = await index.addDocuments(chunk, { primaryKey: 'id' });
        process.stdout.write(`  Batch ${Math.floor(i / BATCH) + 1}: task ${lastTask.taskUid}\r`);
    }

    // Wait for last batch task to finish
    if (lastTask) {
        console.log('\n  Waiting for indexing to complete...');
        await meili.tasks.waitForTask(lastTask.taskUid);
    }

    const stats = await index.getStats();
    console.log(`  ✓ Index now has ${stats.numberOfDocuments} documents`);
}

async function main() {
    console.log('🔄 Meilisearch Sync');
    console.log('===================');
    console.log(`Meilisearch: ${MEILI_HOST}`);
    console.log(`Supabase:    ${SUPABASE_URL}`);

    // Check Meilisearch connectivity
    try {
        await meili.health();
        console.log('\n✓ Meilisearch is reachable');
    } catch {
        console.error('\n❌ Cannot reach Meilisearch at', MEILI_HOST);
        console.error('   Make sure Meilisearch is running: docker run -p 7700:7700 getmeili/meilisearch');
        process.exit(1);
    }

    await configureIndex();
    const listings = await fetchListings();
    await indexListings(listings);

    console.log('\n✅ Sync complete!');
}

main().catch((err) => {
    console.error('❌ Sync failed:', err);
    process.exit(1);
});
