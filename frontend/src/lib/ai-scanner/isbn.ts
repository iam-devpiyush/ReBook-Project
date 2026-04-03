/**
 * ISBN Parse and Print Utilities
 *
 * Requirements:
 * - 2.6: Extract ISBN-10 or ISBN-13 from barcode
 * - 2.7: Round-trip property: parse(print(parse(isbn))) === parse(isbn)
 */

// ─── validation helpers ───────────────────────────────────────────────────────

function validateISBN10(isbn: string): boolean {
  if (isbn.length !== 10) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const digit = parseInt(isbn[i]);
    if (isNaN(digit)) return false;
    sum += digit * (10 - i);
  }
  const lastChar = isbn[9];
  const lastDigit = lastChar === 'X' ? 10 : parseInt(lastChar);
  if (isNaN(lastDigit)) return false;
  sum += lastDigit;
  return sum % 11 === 0;
}

function validateISBN13(isbn: string): boolean {
  if (isbn.length !== 13) return false;
  if (!isbn.startsWith('978') && !isbn.startsWith('979')) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(isbn[i]);
    if (isNaN(digit)) return false;
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = parseInt(isbn[12]);
  if (isNaN(checkDigit)) return false;
  return checkDigit === (10 - (sum % 10)) % 10;
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Parse an ISBN string (with or without hyphens/spaces) into its canonical
 * hyphen-free form. Returns null if the string is not a valid ISBN-10 or
 * ISBN-13 (including checksum validation).
 *
 * Requirements: 2.6, 2.7
 */
export function parseISBN(raw: string): string | null {
  const cleaned = raw.replace(/[\s-]/g, '').toUpperCase();
  if (cleaned.length === 10 && validateISBN10(cleaned)) return cleaned;
  if (cleaned.length === 13 && validateISBN13(cleaned)) return cleaned;
  return null;
}

/**
 * Print a canonical ISBN string (already parsed / hyphen-free) back as a
 * hyphen-free string. This is the identity function on canonical ISBNs and
 * exists to satisfy the Pretty_Printer contract in Requirement 2.6.
 *
 * Requirements: 2.6, 2.7
 */
export function printISBN(isbn: string): string {
  return isbn;
}
