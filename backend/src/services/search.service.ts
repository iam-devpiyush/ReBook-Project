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

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export interface SearchFilters {
  category_id?: string;
  condition_score_min?: number;
  price_min?: number;
  price_max?: number;
  city?: string;
  state?: string;
}

export type SortBy = 'relevance' | 'price_asc' | 'price_desc' | 'condition_desc' | 'date_desc' | 'proximity';

export interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  userLocation?: UserLocation;
  sortBy?: SortBy;
  limit?: number;
  offset?: number;
  /** @deprecated use sortBy instead */
  sort?: string[];
}

/**
 * Calculate haversine distance in km between two lat/lng points
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
 * Search listings with filters, sorting, and optional proximity scoring
 * Requirements: 5.1-5.9
 */
export async function searchListings(
  options: SearchOptions
): Promise<SearchResult> {
  try {
    const index = getListingsIndex();

    // Build filter string — always restrict to active listings
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

    // Resolve Meilisearch sort array from sortBy enum
    let meiliSort: string[] | undefined;
    const sortBy = options.sortBy;

    if (sortBy === 'price_asc') {
      meiliSort = ['final_price:asc'];
    } else if (sortBy === 'price_desc') {
      meiliSort = ['final_price:desc'];
    } else if (sortBy === 'condition_desc') {
      meiliSort = ['condition_score:desc'];
    } else if (sortBy === 'date_desc') {
      meiliSort = ['created_at:desc'];
    } else if (options.sort) {
      // Legacy support
      meiliSort = options.sort;
    }
    // 'relevance' and 'proximity' use Meilisearch's default ranking

    const limit = options.limit || 20;
    const offset = options.offset || 0;

    // For proximity sort we fetch a larger set then re-rank client-side
    const fetchLimit = sortBy === 'proximity' && options.userLocation ? Math.min(limit * 5, 200) : limit;

    const result = await index.search(options.query, {
      filter: filterString,
      limit: fetchLimit,
      offset: sortBy === 'proximity' ? 0 : offset,
      sort: meiliSort,
    });

    let hits = result.hits as ListingDocument[];

    // Proximity re-ranking: sort by haversine distance then slice
    if (sortBy === 'proximity' && options.userLocation) {
      const { latitude: uLat, longitude: uLon } = options.userLocation;
      hits = hits
        .map((h) => ({
          hit: h,
          dist:
            h.location.latitude != null && h.location.longitude != null
              ? haversineDistance(uLat, uLon, h.location.latitude, h.location.longitude)
              : Infinity,
        }))
        .sort((a, b) => a.dist - b.dist)
        .slice(offset, offset + limit)
        .map((x) => x.hit);
    }

    logger.info(
      `Search completed: query="${options.query}", hits=${hits.length}, time=${result.processingTimeMs}ms`
    );

    return {
      hits,
      estimatedTotalHits: result.estimatedTotalHits || 0,
      limit,
      offset,
      processingTimeMs: result.processingTimeMs,
    };
  } catch (error) {
    logger.error('Search failed:', error);
    throw error;
  }
}

/**
 * Get autocomplete suggestions from titles and authors
 * Requirements: Search UX
 */
export async function getAutocompleteSuggestions(
  partialQuery: string,
  limit: number = 10
): Promise<string[]> {
  try {
    const index = getListingsIndex();

    const result = await index.search(partialQuery, {
      filter: 'status = "active"',
      limit,
      attributesToRetrieve: ['title', 'author'],
    });

    // Collect unique suggestions from both title and author fields
    const seen = new Set<string>();
    const suggestions: string[] = [];

    for (const hit of result.hits as any[]) {
      if (hit.title && !seen.has(hit.title)) {
        seen.add(hit.title);
        suggestions.push(hit.title);
      }
      if (hit.author && !seen.has(hit.author)) {
        seen.add(hit.author);
        suggestions.push(hit.author);
      }
      if (suggestions.length >= limit) break;
    }

    return suggestions;
  } catch (error) {
    logger.error('Autocomplete failed:', error);
    throw error;
  }
}

/** Alias for getAutocompleteSuggestions */
export const getAutocomplete = getAutocompleteSuggestions;

export interface FacetResult {
  categories: Record<string, number>;
  conditionScores: Record<string, number>;
  states: Record<string, number>;
  priceRanges: Array<{ label: string; min: number; max: number; count: number }>;
}

/**
 * Get search facets: categories, condition scores, states, and price ranges
 * Requirements: Search filtering
 */
export async function getSearchFacets(query: string = ''): Promise<FacetResult> {
  try {
    const index = getListingsIndex();

    const result = await index.search(query, {
      filter: 'status = "active"',
      facets: ['category_id', 'condition_score', 'location.state'],
      limit: 0,
    });

    const dist = result.facetDistribution || {};

    // Build price range counts from a separate search
    const priceRangeDefs = [
      { label: 'Under ₹200', min: 0, max: 199 },
      { label: '₹200 – ₹500', min: 200, max: 500 },
      { label: '₹500 – ₹1000', min: 501, max: 1000 },
      { label: '₹1000 – ₹2000', min: 1001, max: 2000 },
      { label: 'Over ₹2000', min: 2001, max: 999999 },
    ];

    const priceRanges = await Promise.all(
      priceRangeDefs.map(async (range) => {
        const r = await index.search(query, {
          filter: `status = "active" AND final_price >= ${range.min} AND final_price <= ${range.max}`,
          limit: 0,
        });
        return { ...range, count: r.estimatedTotalHits || 0 };
      })
    );

    return {
      categories: (dist['category_id'] as Record<string, number>) || {},
      conditionScores: (dist['condition_score'] as Record<string, number>) || {},
      states: (dist['location.state'] as Record<string, number>) || {},
      priceRanges,
    };
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
