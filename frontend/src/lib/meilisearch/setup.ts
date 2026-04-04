/**
 * Meilisearch Index Setup
 *
 * Creates the `listings` index with proper settings:
 * - Searchable attributes (title, author, etc.)
 * - Filterable attributes (status, price, condition, location)
 * - Sortable attributes (price, condition, date)
 * - Faceting config
 *
 * Uses MEILISEARCH_ADMIN_API_KEY — never call from client-side code.
 */

import { MeiliSearch } from 'meilisearch';

function getAdminClient() {
  const host = process.env.MEILISEARCH_HOST;
  const apiKey = process.env.MEILISEARCH_ADMIN_API_KEY;
  if (!host || !apiKey) {
    throw new Error('MEILISEARCH_HOST and MEILISEARCH_ADMIN_API_KEY must be set');
  }
  return new MeiliSearch({ host, apiKey });
}

export async function setupListingsIndex() {
  const client = getAdminClient();

  // Create index if it doesn't exist (primary key = id)
  await client.createIndex('listings', { primaryKey: 'id' });

  const index = client.index('listings');

  // Wait for index to be ready
  await index.waitForTask(
    (await client.createIndex('listings', { primaryKey: 'id' })).taskUid
  ).catch(() => {
    // Index may already exist — that's fine
  });

  // Configure searchable attributes (order matters — higher = more relevant)
  await index.updateSearchableAttributes([
    'title',
    'author',
    'isbn',
    'subject',
    'publisher',
    'description',
  ]);

  // Configure filterable attributes
  await index.updateFilterableAttributes([
    'status',
    'category_id',
    'condition_score',
    'final_price',
    'location.city',
    'location.state',
    'location.pincode',
    'seller_id',
  ]);

  // Configure sortable attributes
  await index.updateSortableAttributes([
    'final_price',
    'condition_score',
    'created_at',
  ]);

  // Configure faceting
  await index.updateFaceting({
    maxValuesPerFacet: 100,
  });

  // Ranking rules (default + custom)
  await index.updateRankingRules([
    'words',
    'typo',
    'proximity',
    'attribute',
    'sort',
    'exactness',
  ]);

  return { success: true, message: 'listings index configured' };
}

export async function syncListingsFromSupabase(batchSize = 100) {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const client = getAdminClient();
  const index = client.index('listings');

  let offset = 0;
  let totalIndexed = 0;

  while (true) {
    const { data, error } = await supabase
      .from('listings')
      .select(`
        id, seller_id, status, condition_score, final_price, original_price,
        delivery_cost, images, created_at, updated_at,
        book:books(id, isbn, title, author, publisher, subject, description, category_id),
        seller:users(id, city, state, pincode, latitude, longitude)
      `)
      .range(offset, offset + batchSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    // Flatten to ListingDocument shape
    const docs = data.map((l: any) => ({
      id: l.id,
      book_id: l.book?.id ?? '',
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
      created_at: l.created_at,
      updated_at: l.updated_at,
    }));

    const task = await index.addDocuments(docs);
    await index.waitForTask(task.taskUid);

    totalIndexed += docs.length;
    offset += batchSize;

    if (data.length < batchSize) break;
  }

  return { success: true, totalIndexed };
}
