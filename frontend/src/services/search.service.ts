/**
 * Search Service (Frontend Export)
 *
 * Re-exports the search service from the backend for use in API routes.
 */

export {
  addToMeilisearchIndex,
  updateMeilisearchIndex,
  removeFromMeilisearchIndex,
  searchListings,
  getAutocompleteSuggestions,
  getAutocomplete,
  getSearchFacets,
  clearMeilisearchIndex,
  haversineDistance,
  type ListingDocument,
  type UserLocation,
  type SearchFilters,
  type SearchOptions,
  type SearchResult,
  type SortBy,
  type FacetResult,
} from '../../../backend/src/services/search.service';
