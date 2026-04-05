/**
 * Search Service (Frontend)
 *
 * Client-side search functions that call the /api/search routes.
 * Types mirror the backend service for compatibility.
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
  stock_count?: number;
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

export type SortBy =
  | 'relevance'
  | 'price_asc'
  | 'price_desc'
  | 'condition_desc'
  | 'date_desc'
  | 'proximity';

export interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  userLocation?: UserLocation;
  sortBy?: SortBy;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  hits: ListingDocument[];
  estimatedTotalHits: number;
  limit: number;
  offset: number;
  processingTimeMs: number;
}

export interface FacetResult {
  categories: Record<string, number>;
  conditionScores: Record<string, number>;
  states: Record<string, number>;
  priceRanges: Array<{ label: string; min: number; max: number; count: number }>;
}

/** Haversine distance in km (kept for any client-side use) */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function searchListings(options: SearchOptions): Promise<SearchResult> {
  const params = new URLSearchParams();
  if (options.query) params.set('q', options.query);
  if (options.sortBy) params.set('sort_by', options.sortBy);
  if (options.limit) params.set('page_size', String(options.limit));
  if (options.offset) params.set('page', String(Math.floor(options.offset / (options.limit || 20)) + 1));
  if (options.userLocation) {
    params.set('lat', String(options.userLocation.latitude));
    params.set('lng', String(options.userLocation.longitude));
  }
  if (options.filters) {
    const f = options.filters;
    if (f.category_id) params.set('category_id', f.category_id);
    if (f.condition_score_min != null) params.set('condition_min', String(f.condition_score_min));
    if (f.price_min != null) params.set('price_min', String(f.price_min));
    if (f.price_max != null) params.set('price_max', String(f.price_max));
    if (f.city) params.set('city', f.city);
    if (f.state) params.set('state', f.state);
  }

  const res = await fetch(`/api/search?${params}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Search failed');

  return {
    hits: json.data ?? [],
    estimatedTotalHits: json.pagination?.total_hits ?? 0,
    limit: options.limit ?? 20,
    offset: options.offset ?? 0,
    processingTimeMs: json.processing_time_ms ?? 0,
  };
}

export async function getAutocompleteSuggestions(
  partialQuery: string,
  limit = 10
): Promise<string[]> {
  const params = new URLSearchParams({ q: partialQuery, limit: String(limit) });
  const res = await fetch(`/api/search/autocomplete?${params}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Autocomplete failed');
  return json.suggestions ?? [];
}

export const getAutocomplete = getAutocompleteSuggestions;

export async function getSearchFacets(query = ''): Promise<FacetResult> {
  const params = new URLSearchParams({ q: query });
  const res = await fetch(`/api/search/facets?${params}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Facets failed');
  return json.facets ?? { categories: {}, conditionScores: {}, states: {}, priceRanges: [] };
}

export async function addToMeilisearchIndex(_listing: ListingDocument): Promise<void> {
  // Index management is handled server-side only
}

export async function updateMeilisearchIndex(_listing: ListingDocument): Promise<void> {
  // Index management is handled server-side only
}

export async function removeFromMeilisearchIndex(_listingId: string): Promise<void> {
  // Index management is handled server-side only
}

export async function clearMeilisearchIndex(): Promise<void> {
  // Index management is handled server-side only
}
