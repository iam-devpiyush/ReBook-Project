/**
 * Export listings as JSON for Meilisearch Cloud import.
 * Usage: npx ts-node --project scripts/tsconfig.json scripts/export-meilisearch-docs.ts
 * Output: meilisearch-documents.json (import this file in Meilisearch Cloud UI)
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../frontend/.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
    console.log('Fetching active listings from Supabase...');

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
        .eq('status', 'active');

    if (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }

    const docs = (data ?? []).map((row: any) => {
        const book = row.books ?? {};
        return {
            id: row.id,
            book_id: row.book_id,
            seller_id: row.seller_id,
            status: row.status,
            title: book.title || '',
            author: book.author || '',
            isbn: book.isbn || '',
            publisher: book.publisher || '',
            subject: book.subject || '',
            description: book.description || '',
            category_id: book.category_id || '',
            publication_year: book.publication_year || null,
            original_price: row.original_price,
            condition_score: row.condition_score,
            final_price: row.final_price,
            delivery_cost: row.delivery_cost,
            platform_commission: row.platform_commission,
            payment_fees: row.payment_fees,
            seller_payout: row.seller_payout,
            location: {
                city: row.city || '',
                state: row.state || '',
                pincode: row.pincode || '',
                latitude: row.latitude || null,
                longitude: row.longitude || null,
            },
            images: row.images || [],
            views: row.views || 0,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    });

    const outPath = path.resolve(__dirname, '../meilisearch-documents.json');
    fs.writeFileSync(outPath, JSON.stringify(docs, null, 2));
    console.log(`Done. Wrote ${docs.length} documents to meilisearch-documents.json`);
    console.log('\nNext steps in Meilisearch Cloud:');
    console.log('  1. Create an index named: listings');
    console.log('  2. Import meilisearch-documents.json');
    console.log('  3. Copy your Cloud host URL + API key into frontend/.env.local');
}

main();
