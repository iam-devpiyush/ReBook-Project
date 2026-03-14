/**
 * Property-Based Test: ISBN Detection Accuracy
 * 
 * **Validates: Requirements 2.5, 2.6**
 * 
 * This test verifies that the ISBN detection algorithm correctly validates
 * and extracts ISBN-10 and ISBN-13 barcodes.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateISBN } from '../isbn-detection';

// ============================================================================
// ISBN Generators
// ============================================================================

/**
 * Generate a valid ISBN-10 with correct checksum
 */
const validISBN10Generator = fc.tuple(
  fc.integer({ min: 0, max: 9 }),
  fc.integer({ min: 0, max: 9 }),
  fc.integer({ min: 0, max: 9 }),
  fc.integer({ min: 0, max: 9 }),
  fc.integer({ min: 0, max: 9 }),
  fc.integer({ min: 0, max: 9 }),
  fc.integer({ min: 0, max: 9 }),
  fc.integer({ min: 0, max: 9 }),
  fc.integer({ min: 0, max: 9 })
).map(digits => {
  // Calculate checksum
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 11;
  const checkChar = checkDigit === 10 ? 'X' : checkDigit.toString();

  return digits.join('') + checkChar;
});

/**
 * Generate a valid ISBN-13 with correct checksum
 */
const validISBN13Generator = fc.tuple(
  fc.constantFrom('978', '979'), // ISBN-13 prefix
  fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 9, maxLength: 9 })
).map(([prefix, digits]) => {
  // Calculate checksum
  const allDigits = prefix.split('').concat(digits.map(String));
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(allDigits[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;

  return prefix + digits.join('') + checkDigit;
});

/**
 * Generate an invalid ISBN (wrong checksum)
 */
const invalidISBNGenerator = fc.oneof(
  // Invalid ISBN-10 (random 10 digits that don't pass checksum)
  fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 10, maxLength: 10 })
    .filter(digits => {
      // Calculate correct checksum
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        sum += digits[i] * (10 - i);
      }
      const correctCheck = (11 - (sum % 11)) % 11;
      // Ensure the last digit is NOT the correct checksum
      return digits[9] !== correctCheck && !(correctCheck === 10 && digits[9] === 10);
    })
    .map(digits => digits.join('')),

  // Invalid ISBN-13 (random 13 digits that don't pass checksum)
  fc.tuple(
    fc.constantFrom('978', '979'),
    fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 10, maxLength: 10 })
  )
    .filter(([prefix, digits]) => {
      // Calculate correct checksum
      const allDigits = prefix.split('').concat(digits.slice(0, 9).map(String));
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        sum += parseInt(allDigits[i]) * (i % 2 === 0 ? 1 : 3);
      }
      const correctCheck = (10 - (sum % 10)) % 10;
      // Ensure the last digit is NOT the correct checksum
      return digits[9] !== correctCheck;
    })
    .map(([prefix, digits]) => prefix + digits.join(''))
);

// ============================================================================
// Property Tests
// ============================================================================

describe('Property Test: ISBN Detection Accuracy', () => {
  /**
   * Property: All valid ISBN-10 strings should be validated correctly
   * 
   * **Validates: Requirements 2.5, 2.6**
   */
  it('should validate all correctly formatted ISBN-10 strings', () => {
    fc.assert(
      fc.property(validISBN10Generator, (isbn) => {
        // Valid ISBN-10 should pass validation
        expect(validateISBN(isbn)).toBe(true);

        // Should also work with hyphens
        const withHyphens = `${isbn.slice(0, 1)}-${isbn.slice(1, 4)}-${isbn.slice(4, 9)}-${isbn.slice(9)}`;
        expect(validateISBN(withHyphens)).toBe(true);
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * Property: All valid ISBN-13 strings should be validated correctly
   * 
   * **Validates: Requirements 2.5, 2.6**
   */
  it('should validate all correctly formatted ISBN-13 strings', () => {
    fc.assert(
      fc.property(validISBN13Generator, (isbn) => {
        // Valid ISBN-13 should pass validation
        expect(validateISBN(isbn)).toBe(true);

        // Should also work with hyphens
        const withHyphens = `${isbn.slice(0, 3)}-${isbn.slice(3, 4)}-${isbn.slice(4, 9)}-${isbn.slice(9, 12)}-${isbn.slice(12)}`;
        expect(validateISBN(withHyphens)).toBe(true);
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * Property: Invalid ISBNs should be rejected
   * 
   * **Validates: Requirements 2.5, 2.6**
   */
  it('should reject invalid ISBN strings', () => {
    fc.assert(
      fc.property(invalidISBNGenerator, (isbn) => {
        // Invalid ISBN should fail validation
        expect(validateISBN(isbn)).toBe(false);
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * Property: ISBN validation should be case-insensitive for 'X'
   * 
   * **Validates: Requirements 2.5, 2.6**
   */
  it('should handle ISBN-10 with lowercase x as check digit', () => {
    fc.assert(
      fc.property(validISBN10Generator, (isbn) => {
        if (isbn.endsWith('X')) {
          const lowercaseVersion = isbn.slice(0, -1) + 'x';
          expect(validateISBN(lowercaseVersion)).toBe(true);
        }
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * Property: ISBN validation should handle various formatting
   * 
   * **Validates: Requirements 2.5, 2.6**
   */
  it('should validate ISBNs with various formatting (spaces, hyphens)', () => {
    fc.assert(
      fc.property(
        fc.oneof(validISBN10Generator, validISBN13Generator),
        (isbn) => {
          // Original should be valid
          expect(validateISBN(isbn)).toBe(true);

          // With spaces should be valid
          const withSpaces = isbn.split('').join(' ');
          expect(validateISBN(withSpaces)).toBe(true);

          // With mixed formatting should be valid
          const withMixed = isbn.replace(/(\d{3})(\d)/, '$1-$2 ');
          expect(validateISBN(withMixed)).toBe(true);
        }
      ),
      { numRuns: 1000 }
    );
  });

  /**
   * Property: ISBN validation should reject strings that are too short or too long
   * 
   * **Validates: Requirements 2.5, 2.6**
   */
  it('should reject ISBNs with incorrect length', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => {
          const cleaned = s.replace(/[^0-9X]/gi, '');
          return cleaned.length !== 10 && cleaned.length !== 13;
        }),
        (invalidString) => {
          expect(validateISBN(invalidString)).toBe(false);
        }
      ),
      { numRuns: 1000 }
    );
  });

  /**
   * Property: ISBN-13 must start with 978 or 979
   * 
   * **Validates: Requirements 2.5, 2.6**
   */
  it('should reject ISBN-13 that does not start with 978 or 979', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.integer({ min: 100, max: 977 }).filter(n => n !== 978 && n !== 979),
          fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 10, maxLength: 10 })
        ),
        ([prefix, digits]) => {
          const isbn = prefix.toString() + digits.join('');
          expect(validateISBN(isbn)).toBe(false);
        }
      ),
      { numRuns: 1000 }
    );
  });
});
