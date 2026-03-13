import { getListingsIndex } from '../lib/meilisearch';
import { logger } from '../utils/logger';

/**
 * Search Service
 * Handles all Meilisearch operations for book listings
 */

export interface ListingDocument {
  id: string;
  book_id: string;
  seller_id: string;
  title: string;
  author: string;
  subject?: string;
  isbn?: string;
  publisher?: string;
  description?: string;
  status: string;
  category_id: string;
  condition_score: number;
  final_price: number;
  original_price: number;
  delivery_cost: number;
  images: string[];
  location: {
    city: string;
    state: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface SearchFilters {
  category_id?: string;
  condition_score_min?: number;
  price_min?: number;
  price_max?: number;
  city?: string;
  state?: string;
}

export interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
  sort?: string[];
}

export interface SearchResult {
  hits: ListingDocument[];
  estimatedTotalHits: number;
  limit: number;
  offset: number;
  processingTimeMs: number;
}

/**
 * Add a listing to the Meilisearch index
 * Only active listings should be indexed
 */
export async function addToMeilisearchIndex(
  listing: ListingDocument
): Promise<void> {
  try {
    if (listing.status !== 'active') {
      logger.warn(
        `Attempted to index non-active listing: ${listing.id} with status ${listing.status}`
      );
      return;
    }

    const index = getListingsIndex();
    await index.addDocuments([listing], { primaryKey: 'id' });
    logger.info(`Added listing ${listing.id} to Meilisearch index`);
  } catch (error) {
    logger.error(`Failed to add listing ${listing.id} to index:`, error);
    throw error;
  }
}

/**
 * Update a listing in the Meilisearch index
 */
export async function updateMeilisearchIndex(
  listing: ListingDocument
): Promise<void> {
  try {
    const index = getListingsIndex();

    // If status is not active, remove from index
    if (listing.status !== 'active') {
      await removeFromMeilisearchIndex(listing.id);
      return;
    }

    // Otherwise update the document
    await index.updateDocuments([listing], { primaryKey: 'id' });
    logger.info(`Updated listing ${listing.id} in Meilisearch index`);
  } catch (error) {
    logger.error(`Failed to update listing ${listing.id} in index:`, error);
    throw error;
  }
}

/**
 * Remove a listing from the Meilisearch index
 */
export async function removeFromMeilisearchIndex(
  listingId: string
): Promise<void> {
  try {
    const index = getListingsIndex();
    await index.deleteDocument(listingId);
    logger.info(`Removed listing ${listingId} from Meilisearch index`);
  } catch (error) {
    logger.error(`Failed to remove listing ${listingId} from index:`, error);
    throw error;
  }
}

/**
 * Search listings with filters and sorting
 */
export async function searchListings(
  options: SearchOptions
): Promise<SearchResult> {
  try {
    const index = getListingsIndex();

    // Build filter string
    const filterParts: string[] = ['status = "active"'];

    if (options.filters) {
      const { filters } = options;

      if (filters.category_id) {
        filterParts.push(`category_id = "${filters.category_id}"`);
      }

      if (filters.condition_score_min !== undefined) {
        filterParts.push(`condition_score >= ${filters.condition_score_min}`);
      }

      if (filters.price_min !== undefined) {
        filterParts.push(`final_price >= ${filters.price_min}`);
      }

      if (filters.price_max !== undefined) {
        filterParts.push(`final_price <= ${filters.price_max}`);
      }

      if (filters.city) {
        filterParts.push(`location.city = "${filters.city}"`);
      }

      if (filters.state) {
        filterParts.push(`location.state = "${filters.state}"`);
      }
    }

    const filterString = filterParts.join(' AND ');

    // Execute search
    const result = await index.search(options.query, {
      filter: filterString,
      limit: options.limit || 20,
      offset: options.offset || 0,
      sort: options.sort,
    });

    logger.info(
      `Search completed: query="${options.query}", hits=${result.hits.length}, time=${result.processingTimeMs}ms`
    );

    return {
      hits: result.hits as ListingDocument[],
      estimatedTotalHits: result.estimatedTotalHits || 0,
      limit: result.limit || 20,
      offset: result.offset || 0,
      processingTimeMs: result.processingTimeMs,
    };
  } catch (error) {
    logger.error('Search failed:', error);
    throw error;
  }
}

/**
 * Get autocomplete suggestions
 */
export async function getAutocompleteSuggestions(
  partialQuery: string,
  limit: number = 5
): Promise<string[]> {
  try {
    const index = getListingsIndex();

    const result = await index.search(partialQuery, {
      filter: 'status = "active"',
      limit,
      attributesToRetrieve: ['title'],
    });

    const suggestions = result.hits
      .map((hit: any) => hit.title)
      .filter((title: string) => title);

    return suggestions;
  } catch (error) {
    logger.error('Autocomplete failed:', error);
    throw error;
  }
}

/**
 * Get search facets (category counts, price ranges, etc.)
 */
export async function getSearchFacets(query: string = ''): Promise<any> {
  try {
    const index = getListingsIndex();

    const result = await index.search(query, {
      filter: 'status = "active"',
      facets: ['category_id', 'condition_score', 'location.state'],
      limit: 0, // We only want facets, not results
    });

    return result.facetDistribution;
  } catch (error) {
    logger.error('Failed to get facets:', error);
    throw error;
  }
}

/**
 * Clear all documents from the index (useful for testing)
 */
export async function clearMeilisearchIndex(): Promise<void> {
  try {
    const index = getListingsIndex();
    await index.deleteAllDocuments();
    logger.info('Cleared all documents from Meilisearch index');
  } catch (error) {
    logger.error('Failed to clear Meilisearch index:', error);
    throw error;
  }
}
