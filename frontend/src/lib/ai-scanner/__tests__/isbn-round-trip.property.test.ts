/**
 * Property-Based Test: ISBN Round-Trip
 *
 * **Validates: Requirements 2.7**
 *
 * FOR ALL valid ISBN strings, parsing then printing then parsing SHALL produce
 * an equivalent ISBN value (round-trip property).
 *
 * Formally: parse(print(parse(isbn))) deepEquals parse(isbn)
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseISBN, printISBN } from '../isbn';

// ─── generators ───────────────────────────────────────────────────────────────

/**
 * Generate a valid ISBN-10 string with correct mod-11 checksum.
 */
const validISBN10 = fc
  .array(fc.integer({ min: 0, max: 9 }), { minLength: 9, maxLength: 9 })
  .map((digits) => {
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i);
    const check = (11 - (sum % 11)) % 11;
    return digits.join('') + (check === 10 ? 'X' : check.toString());
  });

/**
 * Generate a valid ISBN-13 string with correct mod-10 checksum.
 */
const validISBN13 = fc
  .tuple(
    fc.constantFrom('978', '979'),
    fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 9, maxLength: 9 })
  )
  .map(([prefix, digits]) => {
    const all = [...prefix.split('').map(Number), ...digits];
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += all[i] * (i % 2 === 0 ? 1 : 3);
    const check = (10 - (sum % 10)) % 10;
    return prefix + digits.join('') + check;
  });

/**
 * Generate a valid ISBN (either ISBN-10 or ISBN-13) optionally decorated with
 * hyphens or spaces to exercise the parser's normalisation logic.
 */
const validISBNWithFormatting = fc.oneof(validISBN10, validISBN13).chain((isbn) =>
  fc.constantFrom(
    isbn,                                          // bare digits
    isbn.split('').join('-'),                      // every digit hyphenated
    isbn.split('').join(' '),                      // every digit spaced
    `${isbn.slice(0, 3)}-${isbn.slice(3)}`        // prefix hyphen only
  )
);

/**
 * Generate an ISBN-10 with a deliberately wrong check digit.
 */
const invalidISBN10 = fc
  .array(fc.integer({ min: 0, max: 9 }), { minLength: 9, maxLength: 9 })
  .chain((digits) => {
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i);
    const correct = (11 - (sum % 11)) % 11;
    // Pick a wrong check digit (different from the correct one)
    const wrong = fc.integer({ min: 0, max: 9 }).filter((d) => d !== correct);
    return wrong.map((d) => digits.join('') + d.toString());
  });

/**
 * Generate an ISBN-13 with a deliberately wrong check digit.
 */
const invalidISBN13 = fc
  .tuple(
    fc.constantFrom('978', '979'),
    fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 9, maxLength: 9 })
  )
  .chain(([prefix, digits]) => {
    const all = [...prefix.split('').map(Number), ...digits];
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += all[i] * (i % 2 === 0 ? 1 : 3);
    const correct = (10 - (sum % 10)) % 10;
    const wrong = fc.integer({ min: 0, max: 9 }).filter((d) => d !== correct);
    return wrong.map((d) => prefix + digits.join('') + d.toString());
  });

// ─── properties ───────────────────────────────────────────────────────────────

describe('Property Test: ISBN Round-Trip', () => {
  /**
   * Core round-trip property.
   *
   * parse(print(parse(isbn))) deepEquals parse(isbn)
   *
   * **Validates: Requirements 2.7**
   */
  it('round-trip: parse(print(parse(isbn))) equals parse(isbn) for all valid ISBNs', () => {
    fc.assert(
      fc.property(validISBNWithFormatting, (isbn) => {
        const first = parseISBN(isbn);
        // A valid ISBN must parse to a non-null canonical string
        expect(first).not.toBeNull();

        const printed = printISBN(first!);
        const second = parseISBN(printed);

        // The second parse must equal the first parse
        expect(second).toEqual(first);
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * printISBN produces a string that parseISBN accepts (idempotency of print).
   *
   * **Validates: Requirements 2.7**
   */
  it('printISBN output is always parseable for valid ISBNs', () => {
    fc.assert(
      fc.property(fc.oneof(validISBN10, validISBN13), (isbn) => {
        const canonical = parseISBN(isbn);
        expect(canonical).not.toBeNull();

        const printed = printISBN(canonical!);
        expect(parseISBN(printed)).not.toBeNull();
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * parseISBN returns null for ISBNs with wrong checksums.
   *
   * **Validates: Requirements 2.7**
   */
  it('parseISBN returns null for invalid ISBN-10 (wrong checksum)', () => {
    fc.assert(
      fc.property(invalidISBN10, (isbn) => {
        expect(parseISBN(isbn)).toBeNull();
      }),
      { numRuns: 500 }
    );
  });

  it('parseISBN returns null for invalid ISBN-13 (wrong checksum)', () => {
    fc.assert(
      fc.property(invalidISBN13, (isbn) => {
        expect(parseISBN(isbn)).toBeNull();
      }),
      { numRuns: 500 }
    );
  });
});
