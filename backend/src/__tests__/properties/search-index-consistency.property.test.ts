/**
 * Property-Based Tests: Meilisearch Index Consistency
 * **Validates: Requirements 5.10, 5.11**
 *
 * Properties verified:
 * 1. Only active listings are added to the index
 * 2. Non-active listings are rejected at index time
 * 3. Removing a listing from the index does not throw
 * 4. Updating a non-active listing removes it from the index
 * 5. Updating an active listing keeps it in the index
 */

import * as fc from 'fast-check';
import {
  addToMeilisearchIndex,
  updateMeilisearchIndex,
  removeFromMeilisearchIndex,
  ListingDocument,
} from '../../services/search.service';
import { getListingsIndex } from '../../lib/meilisearch';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeListing(overrides: Partial<ListingDocument> = {}): ListingDocument {
  return {
    id: `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    book_id: 'book-1',
    seller_id: 'seller-1',
    title: 'Test Book',
    author: 'Test Author',
    status: 'active',
    category_id: 'cat-1',
    condition_score: 4,
    final_price: 400,
    original_price: 500,
    delivery_cost: 50,
    images: ['https://example.com/img.jpg'],
    location: { city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

async function getIndexedDocument(id: string): Promise<any | null> {
  try {
    const index = getListingsIndex();
    return await index.getDocument(id);
  } catch {
    return null;
  }
}

async function cleanup(id: string) {
  try {
    await removeFromMeilisearchIndex(id);
  } catch {
    // ignore — document may not exist
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Property: Meilisearch Index Consistency', () => {
  /**
   * Property 1: Only active listings are indexed
   * addToMeilisearchIndex must reject non-active listings silently
   */
  it('should only index listings with status "active"', async () => {
    const nonActiveStatuses = ['pending_approval', 'rejected', 'rescan_required', 'sold', 'inactive'];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...nonActiveStatuses),
        async (status) => {
          const listing = makeListing({ status });

          // Should not throw, but should not index
          await addToMeilisearchIndex(listing);

          const doc = await getIndexedDocument(listing.id);
          // Non-active listings must NOT appear in the index
          expect(doc).toBeNull();
        }
      ),
      { numRuns: 5, timeout: 30000 }
    );
  });

  /**
   * Property 2: Active listings are indexed successfully
   */
  it('should index active listings and make them retrievable', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 100, max: 9999 }),
        fc.integer({ min: 1, max: 5 }),
        async (price, conditionScore) => {
          const listing = makeListing({
            status: 'active',
            final_price: price,
            condition_score: conditionScore,
          });

          try {
            await addToMeilisearchIndex(listing);

            const doc = await getIndexedDocument(listing.id);
            expect(doc).not.toBeNull();
            expect(doc.id).toBe(listing.id);
            expect(doc.status).toBe('active');
            expect(doc.final_price).toBe(price);
            expect(doc.condition_score).toBe(conditionScore);
          } finally {
            await cleanup(listing.id);
          }
        }
      ),
      { numRuns: 5, timeout: 30000 }
    );
  });

  /**
   * Property 3: Updating a listing to non-active removes it from the index
   */
  it('should remove listing from index when status changes from active to non-active', async () => {
    const nonActiveStatuses = ['rejected', 'rescan_required', 'sold'];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...nonActiveStatuses),
        async (newStatus) => {
          const listing = makeListing({ status: 'active' });

          try {
            // First add as active
            await addToMeilisearchIndex(listing);
            const docBefore = await getIndexedDocument(listing.id);
            expect(docBefore).not.toBeNull();

            // Now update to non-active status
            await updateMeilisearchIndex({ ...listing, status: newStatus });

            const docAfter = await getIndexedDocument(listing.id);
            // Must be removed from index
            expect(docAfter).toBeNull();
          } finally {
            await cleanup(listing.id);
          }
        }
      ),
      { numRuns: 3, timeout: 30000 }
    );
  });

  /**
   * Property 4: Updating an active listing keeps it in the index with new data
   */
  it('should update listing data in index when status remains active', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 100, max: 9999 }),
        async (newPrice) => {
          const listing = makeListing({ status: 'active', final_price: 500 });

          try {
            await addToMeilisearchIndex(listing);

            const updated = { ...listing, final_price: newPrice };
            await updateMeilisearchIndex(updated);

            const doc = await getIndexedDocument(listing.id);
            expect(doc).not.toBeNull();
            expect(doc.final_price).toBe(newPrice);
            expect(doc.status).toBe('active');
          } finally {
            await cleanup(listing.id);
          }
        }
      ),
      { numRuns: 5, timeout: 30000 }
    );
  });

  /**
   * Property 5: Removing a listing from the index is idempotent
   * Calling removeFromMeilisearchIndex on a non-existent document must not throw
   */
  it('should not throw when removing a non-existent listing from the index', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (nonExistentId) => {
          // Should not throw even if document doesn't exist
          await expect(removeFromMeilisearchIndex(nonExistentId)).resolves.not.toThrow();
        }
      ),
      { numRuns: 5, timeout: 30000 }
    );
  });
});
