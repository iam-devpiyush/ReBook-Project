# Meilisearch Configuration

This directory contains the Meilisearch client configuration for the Second-Hand Book Marketplace.

## Overview

Meilisearch provides fast, typo-tolerant search functionality for book listings. It enables:
- Full-text search across titles, authors, subjects, and ISBNs
- Typo-tolerant queries (e.g., "algoritms" finds "algorithms")
- Faceted filtering by category, condition, price, and location
- Fast response times (<200ms at p95)
- Autocomplete suggestions

## Files

- `meilisearch.ts` - Client initialization and index configuration
- `../services/search.service.ts` - Search operations (index, update, remove, search)

## Configuration

### Environment Variables

Add to `backend/.env`:

```env
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your-master-key-here
```

### Index Configuration

The `listings` index is configured with:

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
- Enabled: true
- One typo allowed for words ≥4 characters
- Two typos allowed for words ≥8 characters

**Pagination:**
- Max total hits: 1000

**Faceting:**
- Max values per facet: 100

## Installation

### Local Development

1. Install Meilisearch:
```bash
# macOS
brew install meilisearch

# Linux
curl -L https://install.meilisearch.com | sh

# Windows
# Download from https://github.com/meilisearch/meilisearch/releases
```

2. Start Meilisearch:
```bash
meilisearch --master-key="your-master-key-here"
```

3. Verify setup:
```bash
npm run verify:meilisearch
```

### Docker

```bash
docker run -d \
  -p 7700:7700 \
  -e MEILI_MASTER_KEY=your-master-key-here \
  -v $(pwd)/meili_data:/meili_data \
  getmeili/meilisearch:v1.5
```

## Usage

### Initialize Index

```typescript
import { initializeMeilisearchIndex } from './lib/meilisearch';

await initializeMeilisearchIndex();
```

### Add Listing to Index

```typescript
import { addToMeilisearchIndex } from './services/search.service';

const listing = {
  id: 'listing-123',
  title: 'Introduction to Algorithms',
  author: 'Thomas H. Cormen',
  status: 'active',
  // ... other fields
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
  },
  limit: 20,
  sort: ['final_price:asc'],
});
```

### Update Index

```typescript
import { updateMeilisearchIndex } from './services/search.service';

await updateMeilisearchIndex(updatedListing);
```

### Remove from Index

```typescript
import { removeFromMeilisearchIndex } from './services/search.service';

await removeFromMeilisearchIndex('listing-123');
```

## Index Consistency Rules

**Critical:** Only listings with `status = "active"` should be in the index.

- When listing is approved → Add to index
- When listing status changes to non-active → Remove from index
- When listing is updated → Update in index (or remove if not active)

## Testing

Run unit tests:
```bash
npm test -- meilisearch-configuration.test.ts
npm test -- search-service.test.ts
```

Run verification script:
```bash
npm run verify:meilisearch
```

## Production Deployment

### Meilisearch Cloud

1. Sign up at https://www.meilisearch.com/cloud
2. Create a new project
3. Get your host URL and API key
4. Update production environment variables

### Self-Hosted

1. Deploy Meilisearch on your server
2. Configure firewall rules (port 7700)
3. Set up SSL/TLS with reverse proxy (nginx/caddy)
4. Configure backups for `/meili_data` directory

## Performance

- Search response time: <200ms (p95)
- Index update time: <100ms per document
- Typo tolerance: 1 typo for words ≥4 chars, 2 typos for words ≥8 chars

## Troubleshooting

### Connection Refused
- Check if Meilisearch is running: `curl http://localhost:7700/health`
- Verify MEILISEARCH_HOST in .env
- Check firewall rules

### Index Not Found
- Run `initializeMeilisearchIndex()` to create the index
- Check index name is "listings"

### Search Returns No Results
- Verify documents are indexed: Check index stats
- Ensure listing status is "active"
- Check filter syntax

## References

- [Meilisearch Documentation](https://docs.meilisearch.com/)
- [Meilisearch Node.js SDK](https://github.com/meilisearch/meilisearch-js)
- [Search API Reference](https://docs.meilisearch.com/reference/api/search.html)
