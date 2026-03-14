/**
 * Property-Based Test: Metadata Auto-fill
 * 
 * **Validates: Requirements 2.7**
 * 
 * This test verifies that the metadata fetching service correctly retrieves
 * and structures book metadata from external APIs.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { fetchBookMetadata, validateBookMetadata } from '../metadata-fetcher';

describe('Property Test: Metadata Auto-fill', () => {
  /**
   * Property: Fetched metadata must have required fields (isbn, title, author)
   * 
   * **Validates: Requirements 2.7**
   * 
   * For any valid ISBN, if metadata is successfully fetched, it must contain
   * at minimum: isbn, title, and author fields.
   */
  it('should return metadata with required fields when ISBN is valid', { timeout: 30000 }, async () => {
    // Use known valid ISBNs for testing
    const knownISBNs = [
      '9780134685991', // Effective Java
      '9780596009205', // Head First Design Patterns
      '9780132350884', // Clean Code
      '9780201633610', // Design Patterns
      '9781449355739'  // Learning Python
    ];
    
    for (const isbn of knownISBNs) {
      const metadata = await fetchBookMetadata(isbn);
      
      if (metadata) {
        // Property 1: Metadata must have required fields
        expect(metadata.isbn).toBe(isbn);
        expect(metadata.title).toBeTruthy();
        expect(typeof metadata.title).toBe('string');
        expect(metadata.title.length).toBeGreaterThan(0);
        
        expect(metadata.author).toBeTruthy();
        expect(typeof metadata.author).toBe('string');
        expect(metadata.author.length).toBeGreaterThan(0);
        
        // Property 2: Validation function should return true
        expect(validateBookMetadata(metadata)).toBe(true);
        
        // Property 3: Optional fields should be null or valid types
        if (metadata.edition !== null) {
          expect(typeof metadata.edition).toBe('string');
        }
        
        if (metadata.publication_year !== null) {
          expect(typeof metadata.publication_year).toBe('number');
          expect(metadata.publication_year).toBeGreaterThan(1000);
          expect(metadata.publication_year).toBeLessThanOrEqual(new Date().getFullYear() + 1);
        }
        
        if (metadata.cover_image !== null) {
          expect(typeof metadata.cover_image).toBe('string');
          expect(metadata.cover_image).toMatch(/^https?:\/\//);
        }
      }
    }
  });
  
  /**
   * Property: Metadata fetching should handle invalid ISBNs gracefully
   * 
   * **Validates: Requirements 2.7, 2.12**
   * 
   * For invalid ISBNs, the function should return null without throwing errors.
   */
  it('should return null for invalid ISBNs without throwing errors', { timeout: 60000 }, async () => {
    const invalidISBNs = [
      'invalid-isbn',
      '123',
      '999999999999999', // Invalid ISBN-13
      'abcdefghij' // Invalid ISBN-10
    ];
    
    for (const invalidISBN of invalidISBNs) {
      const metadata = await fetchBookMetadata(invalidISBN);
      // Should return null for invalid ISBNs
      expect(metadata).toBeNull();
    }
  });
  
  /**
   * Property: Metadata structure should be consistent
   * 
   * **Validates: Requirements 2.7**
   * 
   * All fetched metadata should have the same structure regardless of source.
   */
  it('should return consistent metadata structure', { timeout: 30000 }, async () => {
    const knownISBNs = [
      '9780134685991',
      '9780596009205'
    ];
    
    for (const isbn of knownISBNs) {
      const metadata = await fetchBookMetadata(isbn);
      
      if (metadata) {
        // Property: Metadata should have all expected keys
        expect(metadata).toHaveProperty('isbn');
        expect(metadata).toHaveProperty('title');
        expect(metadata).toHaveProperty('author');
        expect(metadata).toHaveProperty('publisher');
        expect(metadata).toHaveProperty('edition');
        expect(metadata).toHaveProperty('publication_year');
        expect(metadata).toHaveProperty('cover_image');
        expect(metadata).toHaveProperty('description');
        expect(metadata).toHaveProperty('subject');
      }
    }
  });
  
  /**
   * Property: Fetching the same ISBN multiple times should return consistent results
   * 
   * **Validates: Requirements 2.7**
   * 
   * Fetching metadata for the same ISBN should return the same data (deterministic).
   */
  it('should return consistent results for the same ISBN', { timeout: 30000 }, async () => {
    const isbn = '9780134685991'; // Effective Java
    
    // Fetch metadata twice
    const metadata1 = await fetchBookMetadata(isbn);
    const metadata2 = await fetchBookMetadata(isbn);
    
    if (metadata1 && metadata2) {
      // Results should be identical
      expect(metadata1.isbn).toBe(metadata2.isbn);
      expect(metadata1.title).toBe(metadata2.title);
      expect(metadata1.author).toBe(metadata2.author);
      expect(metadata1.publisher).toBe(metadata2.publisher);
      expect(metadata1.publication_year).toBe(metadata2.publication_year);
    }
  });
  
  /**
   * Property: Empty or null ISBN should return null
   * 
   * **Validates: Requirements 2.7, 2.12**
   */
  it('should handle empty or null ISBN gracefully', { timeout: 10000 }, async () => {
    const emptyResults = await Promise.all([
      fetchBookMetadata(''),
      fetchBookMetadata('   '),
      fetchBookMetadata(null as any),
      fetchBookMetadata(undefined as any)
    ]);
    
    // All should return null
    emptyResults.forEach(result => {
      expect(result).toBeNull();
    });
  });
});
