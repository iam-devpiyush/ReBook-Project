# Meilisearch Setup Guide

This guide will help you set up Meilisearch for the Second-Hand Book Marketplace.

## What is Meilisearch?

Meilisearch is a fast, typo-tolerant search engine that powers the book search functionality in our marketplace. It provides:
- Lightning-fast search (<200ms response time)
- Typo tolerance (e.g., "algoritms" finds "algorithms")
- Faceted filtering (category, price, condition, location)
- Autocomplete suggestions

## Quick Start

### 1. Install Meilisearch

**macOS:**
```bash
brew install meilisearch
```

**Linux:**
```bash
curl -L https://install.meilisearch.com | sh
```

**Windows:**
Download from [GitHub Releases](https://github.com/meilisearch/meilisearch/releases)

**Docker:**
```bash
docker run -d \
  -p 7700:7700 \
  -e MEILI_MASTER_KEY=your-master-key-here \
  -v $(pwd)/meili_data:/meili_data \
  getmeili/meilisearch:v1.5
```

### 2. Start Meilisearch

```bash
meilisearch --master-key="your-master-key-here"
```

Meilisearch will start on `http://localhost:7700`

### 3. Configure Environment Variables

Add to `backend/.env`:

```env
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your-master-key-here
```

### 4. Verify Setup

```bash
npm run verify:meilisearch
```

You should see:
```
✅ All Meilisearch checks passed!
```

## What Was Installed

### 1. Meilisearch SDK
- Package: `meilisearch` (Node.js client)
- Location: `backend/node_modules/meilisearch`

### 2. Client Configuration
- File: `backend/src/lib/meilisearch.ts`
- Exports: `meilisearchClient`, `getListingsIndex()`, `initializeMeilisearchIndex()`

### 3. Search Service
- File: `backend/src/services/search.service.ts`
- Functions:
  - `addToMeilisearchIndex()` - Add listing to index
  - `updateMeilisearchIndex()` - Update listing in index
  - `removeFromMeilisearchIndex()` - Remove listing from index
  - `searchListings()` - Search with filters
  - `getAutocompleteSuggestions()` - Get autocomplete results
  - `getSearchFacets()` - Get faceted search data

### 4. Index Configuration

**Index Name:** `listings`

**Searchable Attributes:**
- title, author, subject, isbn

**Filterable Attributes:**
- status, category_id, condition_score, final_price, seller_id
- location.city, location.state, location.pincode

**Sortable Attributes:**
- final_price, created_at, condition_score

**Ranking Rules:**
- typo, words, proximity, attribute, sort, exactness

**Typo Tolerance:**
- One typo for words ≥4 characters
- Two typos for words ≥8 characters

**Performance Settings:**
- Max total hits: 1000
- Max facet values: 100

### 5. Tests
- `backend/src/__tests__/unit/meilisearch-configuration.test.ts`
- `backend/src/__tests__/unit/search-service.test.ts`

### 6. Verification Script
- `scripts/verify-meilisearch-setup.ts`
- Run with: `npm run verify:meilisearch`

## Usage Examples

### Initialize Index (Run Once)

```typescript
import { initializeMeilisearchIndex } from './lib/meilisearch';

await initializeMeilisearchIndex();
```

### Add Listing to Index

```typescript
import { addToMeilisearchIndex } from './services/search.service';

const listing = {
  id: 'listing-123',
  book_id: 'book-456',
  seller_id: 'seller-789',
  title: 'Introduction to Algorithms',
  author: 'Thomas H. Cormen',
  subject: 'Computer Science',
  isbn: '9780262033848',
  status: 'active', // Only active listings are indexed
  category_id: 'college-cs',
  condition_score: 4,
  final_price: 500,
  original_price: 1000,
  delivery_cost: 50,
  images: ['https://example.com/image1.jpg'],
  location: {
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

await addToMeilisearchIndex(listing);
```

### Search Listings

```typescript
import { searchListings } from './services/search.service';

const results = await searchListings({
  query: 'algorithms',
  filters: {
    category_id: 'college-cs',
    condition_score_min: 3,
    price_max: 1000,
    city: 'Mumbai',
  },
  limit: 20,
  offset: 0,
  sort: ['final_price:asc'],
});

console.log(`Found ${results.hits.length} results in ${results.processingTimeMs}ms`);
```

### Get Autocomplete Suggestions

```typescript
import { getAutocompleteSuggestions } from './services/search.service';

const suggestions = await getAutocompleteSuggestions('algo', 5);
// Returns: ['Introduction to Algorithms', 'Algorithm Design', ...]
```

## Index Consistency Rules

**CRITICAL:** Only listings with `status = "active"` should be in the Meilisearch index.

- ✅ Listing approved → Add to index
- ✅ Listing updated (still active) → Update in index
- ✅ Listing status changes to non-active → Remove from index
- ❌ Never index pending, rejected, or sold listings

## Testing

Run all Meilisearch tests:
```bash
npm test -- meilisearch
```

Run specific tests:
```bash
npm test -- meilisearch-configuration.test.ts
npm test -- search-service.test.ts
```

## Troubleshooting

### Connection Refused Error

**Problem:** `Request to http://localhost:7700/health has failed`

**Solution:**
1. Check if Meilisearch is running:
   ```bash
   curl http://localhost:7700/health
   ```
2. Start Meilisearch:
   ```bash
   meilisearch --master-key="your-master-key-here"
   ```
3. Verify `MEILISEARCH_HOST` in `backend/.env`

### Index Not Found

**Problem:** Index "listings" does not exist

**Solution:**
```typescript
import { initializeMeilisearchIndex } from './lib/meilisearch';
await initializeMeilisearchIndex();
```

### Search Returns No Results

**Problem:** Search query returns empty results

**Solution:**
1. Check if documents are indexed:
   ```bash
   curl http://localhost:7700/indexes/listings/stats
   ```
2. Verify listing status is "active"
3. Check filter syntax in search query

## Production Deployment

### Option 1: Meilisearch Cloud (Recommended)

1. Sign up at https://www.meilisearch.com/cloud
2. Create a new project
3. Get your host URL and API key
4. Update production environment variables:
   ```env
   MEILISEARCH_HOST=https://your-project.meilisearch.io
   MEILISEARCH_API_KEY=your-production-api-key
   ```

### Option 2: Self-Hosted

1. Deploy Meilisearch on your server
2. Configure firewall (allow port 7700)
3. Set up SSL/TLS with reverse proxy (nginx/caddy)
4. Configure backups for `/meili_data` directory
5. Set up monitoring and alerts

## Next Steps

1. ✅ Meilisearch client installed and configured
2. ✅ Search index created with proper settings
3. ✅ Search service implemented
4. ✅ Tests written and passing

**Next:** Implement listing approval workflow (Task 5.2) to start indexing real listings.

## Resources

- [Meilisearch Documentation](https://docs.meilisearch.com/)
- [Meilisearch Node.js SDK](https://github.com/meilisearch/meilisearch-js)
- [Search API Reference](https://docs.meilisearch.com/reference/api/search.html)
- [Meilisearch Cloud](https://www.meilisearch.com/cloud)

## Support

For issues or questions:
1. Check the [Meilisearch Documentation](https://docs.meilisearch.com/)
2. Review `backend/src/lib/README_MEILISEARCH.md`
3. Run `npm run verify:meilisearch` for diagnostics
