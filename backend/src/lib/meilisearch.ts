import { MeiliSearch, Index } from 'meilisearch';

const logger = {
  info: (msg: string, ...args: unknown[]) => console.info('[meilisearch]', msg, ...args),
  error: (msg: string, ...args: unknown[]) => console.error('[meilisearch]', msg, ...args),
  warn: (msg: string, ...args: unknown[]) => console.warn('[meilisearch]', msg, ...args),
};

/**
 * Meilisearch client configuration
 * Provides fast, typo-tolerant search for book listings
 */

// Initialize Meilisearch client
const meilisearchClient = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_API_KEY || '',
});

// Index name for book listings
export const LISTINGS_INDEX_NAME = 'listings';

/**
 * Get the listings search index
 */
export function getListingsIndex(): Index {
  return meilisearchClient.index(LISTINGS_INDEX_NAME);
}

/**
 * Initialize the Meilisearch index with proper configuration
 * Sets up searchable attributes, filterable attributes, and sortable attributes
 */
export async function initializeMeilisearchIndex(): Promise<void> {
  try {
    logger.info('Initializing Meilisearch index...');

    // Create or get the index
    const index = getListingsIndex();

    // Configure searchable attributes (fields to search in)
    // Only include core search fields as per design document
    await index.updateSearchableAttributes([
      'title',
      'author',
      'subject',
      'isbn',
    ]);

    // Configure filterable attributes (fields to filter by)
    await index.updateFilterableAttributes([
      'status',
      'category_id',
      'condition_score',
      'final_price',
      'seller_id',
      'location.city',
      'location.state',
      'location.pincode',
    ]);

    // Configure sortable attributes
    await index.updateSortableAttributes([
      'final_price',
      'created_at',
      'condition_score',
    ]);

    // Configure ranking rules for relevance
    // Order matters: earlier rules have higher priority
    await index.updateRankingRules([
      'typo',
      'words',
      'proximity',
      'attribute',
      'sort',
      'exactness',
    ]);

    // Configure typo tolerance
    await index.updateTypoTolerance({
      enabled: true,
      minWordSizeForTypos: {
        oneTypo: 4,
        twoTypos: 8,
      },
      disableOnWords: [], // Can add words that should never have typos
      disableOnAttributes: [], // Can disable typo tolerance on specific attributes
    });

    // Configure pagination settings
    await index.updatePagination({
      maxTotalHits: 1000, // Maximum number of results that can be retrieved
    });

    // Configure faceting settings
    await index.updateFaceting({
      maxValuesPerFacet: 100, // Maximum number of values per facet
    });

    logger.info('Meilisearch index initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Meilisearch index:', error);
    throw error;
  }
}

/**
 * Check if Meilisearch is healthy and accessible
 */
export async function checkMeilisearchHealth(): Promise<boolean> {
  try {
    const health = await meilisearchClient.health();
    logger.info('Meilisearch health check:', health);
    return health.status === 'available';
  } catch (error) {
    logger.error('Meilisearch health check failed:', error);
    return false;
  }
}

/**
 * Get Meilisearch version information
 */
export async function getMeilisearchVersion(): Promise<string> {
  try {
    const version = await meilisearchClient.getVersion();
    return version.pkgVersion;
  } catch (error) {
    logger.error('Failed to get Meilisearch version:', error);
    throw error;
  }
}

export { meilisearchClient };
