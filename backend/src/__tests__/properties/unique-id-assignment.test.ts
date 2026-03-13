/**
 * Property-Based Test: Unique ID Assignment
 * **Validates: Requirements 20.1**
 * 
 * This test verifies that all database records receive unique UUIDs
 * and that no ID collisions occur when creating multiple records.
 */

import * as fc from 'fast-check';
import { createClient } from '@supabase/supabase-js';

// Supabase client for testing
// Note: In a real environment, these would come from test environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';

const supabase = createClient(supabaseUrl, supabaseKey);

describe('Property: Unique ID Assignment', () => {
  /**
   * Property: All created records must have unique UUIDs
   * 
   * This property verifies that:
   * 1. Each record receives a unique UUID primary key
   * 2. No ID collisions occur across multiple insertions
   * 3. UUIDs are properly formatted (RFC 4122)
   */
  it('should assign unique UUIDs to all database records', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an array of 2-10 category records to insert
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            type: fc.constantFrom('school', 'competitive_exam', 'college', 'general'),
            metadata: fc.constant({})
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (categories) => {
          // Clean up before test
          const testPrefix = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          const categoriesWithPrefix = categories.map(cat => ({
            ...cat,
            name: `${testPrefix}_${cat.name}`
          }));

          try {
            // Insert all categories
            const { data: insertedCategories, error: insertError } = await supabase
              .from('categories')
              .insert(categoriesWithPrefix)
              .select('id, name, type');

            // Verify insertion succeeded
            expect(insertError).toBeNull();
            expect(insertedCategories).not.toBeNull();
            expect(insertedCategories).toHaveLength(categoriesWithPrefix.length);

            // Extract all IDs
            const ids = insertedCategories!.map(cat => cat.id);

            // Property 1: All IDs must be valid UUIDs (RFC 4122 format)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            ids.forEach(id => {
              expect(id).toMatch(uuidRegex);
            });

            // Property 2: All IDs must be unique (no collisions)
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);

            // Property 3: IDs must be different from each other
            for (let i = 0; i < ids.length; i++) {
              for (let j = i + 1; j < ids.length; j++) {
                expect(ids[i]).not.toBe(ids[j]);
              }
            }

            // Clean up: Delete test records
            await supabase
              .from('categories')
              .delete()
              .like('name', `${testPrefix}%`);

          } catch (error) {
            // Clean up on error
            await supabase
              .from('categories')
              .delete()
              .like('name', `${testPrefix}%`);
            
            throw error;
          }
        }
      ),
      {
        numRuns: 100, // Run 100 random test cases
        timeout: 30000, // 30 second timeout for async operations
      }
    );
  });

  /**
   * Property: UUID uniqueness across different tables
   * 
   * This property verifies that UUIDs are unique even across different tables,
   * ensuring the UUID generation mechanism doesn't produce collisions.
   */
  it('should assign unique UUIDs across different tables', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate data for multiple tables
        fc.record({
          categories: fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }),
              type: fc.constantFrom('school', 'competitive_exam', 'college', 'general'),
              metadata: fc.constant({})
            }),
            { minLength: 1, maxLength: 5 }
          ),
          books: fc.array(
            fc.record({
              title: fc.string({ minLength: 1, maxLength: 100 }),
              author: fc.string({ minLength: 1, maxLength: 100 }),
              isbn: fc.option(fc.string({ minLength: 10, maxLength: 13 }), { nil: null })
            }),
            { minLength: 1, maxLength: 5 }
          )
        }),
        async ({ categories, books }) => {
          const testPrefix = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          
          try {
            // Insert categories
            const categoriesWithPrefix = categories.map(cat => ({
              ...cat,
              name: `${testPrefix}_${cat.name}`
            }));

            const { data: insertedCategories, error: catError } = await supabase
              .from('categories')
              .insert(categoriesWithPrefix)
              .select('id');

            expect(catError).toBeNull();
            expect(insertedCategories).not.toBeNull();

            // Insert books (need a valid category_id, so we'll use the first inserted category)
            const booksWithPrefix = books.map(book => ({
              ...book,
              title: `${testPrefix}_${book.title}`,
              category_id: insertedCategories![0].id
            }));

            const { data: insertedBooks, error: bookError } = await supabase
              .from('books')
              .insert(booksWithPrefix)
              .select('id');

            expect(bookError).toBeNull();
            expect(insertedBooks).not.toBeNull();

            // Collect all IDs from both tables
            const categoryIds = insertedCategories!.map(cat => cat.id);
            const bookIds = insertedBooks!.map(book => book.id);
            const allIds = [...categoryIds, ...bookIds];

            // Property: All IDs across tables must be unique
            const uniqueIds = new Set(allIds);
            expect(uniqueIds.size).toBe(allIds.length);

            // Clean up
            await supabase.from('books').delete().like('title', `${testPrefix}%`);
            await supabase.from('categories').delete().like('name', `${testPrefix}%`);

          } catch (error) {
            // Clean up on error
            await supabase.from('books').delete().like('title', `${testPrefix}%`);
            await supabase.from('categories').delete().like('name', `${testPrefix}%`);
            
            throw error;
          }
        }
      ),
      {
        numRuns: 50, // Run 50 random test cases
        timeout: 30000,
      }
    );
  });

  /**
   * Property: Concurrent insertions produce unique IDs
   * 
   * This property verifies that even when multiple records are inserted
   * concurrently, all receive unique UUIDs without collisions.
   */
  it('should assign unique UUIDs even with concurrent insertions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 3, max: 8 }), // Number of concurrent insertions
        async (concurrentCount) => {
          const testPrefix = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          
          try {
            // Create concurrent insertion promises
            const insertionPromises = Array.from({ length: concurrentCount }, (_, index) => {
              return supabase
                .from('categories')
                .insert({
                  name: `${testPrefix}_concurrent_${index}`,
                  type: 'general',
                  metadata: {}
                })
                .select('id');
            });

            // Execute all insertions concurrently
            const results = await Promise.all(insertionPromises);

            // Verify all insertions succeeded
            results.forEach(({ data, error }) => {
              expect(error).toBeNull();
              expect(data).not.toBeNull();
              expect(data).toHaveLength(1);
            });

            // Extract all IDs
            const ids = results.map(({ data }) => data![0].id);

            // Property: All concurrently generated IDs must be unique
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(concurrentCount);

            // Clean up
            await supabase
              .from('categories')
              .delete()
              .like('name', `${testPrefix}%`);

          } catch (error) {
            // Clean up on error
            await supabase
              .from('categories')
              .delete()
              .like('name', `${testPrefix}%`);
            
            throw error;
          }
        }
      ),
      {
        numRuns: 50,
        timeout: 30000,
      }
    );
  });
});
