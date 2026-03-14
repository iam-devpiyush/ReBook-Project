/**
 * ISBN Barcode Detection Service
 * 
 * Detects ISBN-10 or ISBN-13 barcodes from book cover images using OCR.
 * 
 * Requirements:
 * - 2.5: Detect ISBN barcodes from cover images
 * - 2.6: Extract ISBN-10 or ISBN-13 from barcode
 */

import Tesseract from 'tesseract.js';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ISBNDetectionResult {
  isbn: string | null;
  confidence: number;
  source: 'front_cover' | 'back_cover';
}

// ============================================================================
// ISBN Validation
// ============================================================================

/**
 * Validate ISBN-10 checksum
 * 
 * @param isbn - ISBN-10 string (10 digits)
 * @returns True if valid ISBN-10
 */
function validateISBN10(isbn: string): boolean {
  if (isbn.length !== 10) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const digit = parseInt(isbn[i]);
    if (isNaN(digit)) return false;
    sum += digit * (10 - i);
  }
  
  // Last digit can be X (representing 10)
  const lastChar = isbn[9];
  const lastDigit = lastChar === 'X' ? 10 : parseInt(lastChar);
  if (isNaN(lastDigit)) return false;
  
  sum += lastDigit;
  return sum % 11 === 0;
}

/**
 * Validate ISBN-13 checksum
 * 
 * @param isbn - ISBN-13 string (13 digits)
 * @returns True if valid ISBN-13
 */
function validateISBN13(isbn: string): boolean {
  if (isbn.length !== 13) return false;
  
  // ISBN-13 must start with 978 or 979
  if (!isbn.startsWith('978') && !isbn.startsWith('979')) {
    return false;
  }
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(isbn[i]);
    if (isNaN(digit)) return false;
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }
  
  const checkDigit = parseInt(isbn[12]);
  if (isNaN(checkDigit)) return false;
  
  const calculatedCheck = (10 - (sum % 10)) % 10;
  return checkDigit === calculatedCheck;
}

/**
 * Extract and validate ISBN from text
 * 
 * @param text - OCR extracted text
 * @returns Valid ISBN or null
 */
function extractISBN(text: string): string | null {
  // Remove all non-alphanumeric characters except hyphens
  const cleaned = text.replace(/[^0-9X-]/gi, '');
  
  // Try to find ISBN-13 pattern (978 or 979 prefix)
  const isbn13Pattern = /(?:978|979)[\d-]{10,17}/gi;
  const isbn13Matches = cleaned.match(isbn13Pattern);
  
  if (isbn13Matches) {
    for (const match of isbn13Matches) {
      const digits = match.replace(/-/g, '');
      if (digits.length === 13 && validateISBN13(digits)) {
        return digits;
      }
    }
  }
  
  // Try to find ISBN-10 pattern
  const isbn10Pattern = /\d{9}[\dX]/gi;
  const isbn10Matches = cleaned.match(isbn10Pattern);
  
  if (isbn10Matches) {
    for (const match of isbn10Matches) {
      const digits = match.replace(/-/g, '');
      if (digits.length === 10 && validateISBN10(digits)) {
        return digits;
      }
    }
  }
  
  return null;
}

// ============================================================================
// ISBN Detection Functions
// ============================================================================

/**
 * Detect ISBN barcode from a single image using OCR
 * 
 * Requirements:
 * - 2.5: Detect ISBN barcodes from cover images
 * - 2.6: Extract ISBN-10 or ISBN-13 from barcode
 * 
 * @param imageUrl - URL of the book cover image
 * @param source - Image source (front_cover or back_cover)
 * @returns ISBN detection result
 */
export async function detectISBNFromImage(
  imageUrl: string,
  source: 'front_cover' | 'back_cover'
): Promise<ISBNDetectionResult> {
  try {
    // Perform OCR on the image
    const result = await Tesseract.recognize(imageUrl, 'eng', {
      logger: (m) => {
        // Optional: log progress
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    
    // Extract ISBN from recognized text
    const isbn = extractISBN(result.data.text);
    
    return {
      isbn,
      confidence: result.data.confidence / 100, // Convert to 0-1 range
      source
    };
    
  } catch (error) {
    console.error(`ISBN detection failed for ${source}:`, error);
    return {
      isbn: null,
      confidence: 0,
      source
    };
  }
}

/**
 * Detect ISBN barcode from front and back cover images
 * 
 * Tries front cover first, then back cover if not found.
 * 
 * Requirements:
 * - 2.5: Detect ISBN barcodes from cover images
 * - 2.6: Extract ISBN-10 or ISBN-13 from barcode
 * 
 * @param frontCoverUrl - URL of front cover image
 * @param backCoverUrl - URL of back cover image
 * @returns ISBN or null if not detected
 */
export async function detectISBNBarcode(
  frontCoverUrl: string,
  backCoverUrl: string
): Promise<string | null> {
  // Try front cover first
  const frontResult = await detectISBNFromImage(frontCoverUrl, 'front_cover');
  
  if (frontResult.isbn && frontResult.confidence > 0.6) {
    console.log(`ISBN detected from front cover: ${frontResult.isbn}`);
    return frontResult.isbn;
  }
  
  // Try back cover if front cover failed
  const backResult = await detectISBNFromImage(backCoverUrl, 'back_cover');
  
  if (backResult.isbn && backResult.confidence > 0.6) {
    console.log(`ISBN detected from back cover: ${backResult.isbn}`);
    return backResult.isbn;
  }
  
  // No ISBN detected
  console.log('ISBN detection failed on both covers');
  return null;
}

/**
 * Validate an ISBN string
 * 
 * @param isbn - ISBN string to validate
 * @returns True if valid ISBN-10 or ISBN-13
 */
export function validateISBN(isbn: string): boolean {
  const cleaned = isbn.replace(/[^0-9X]/gi, '').toUpperCase();
  
  if (cleaned.length === 10) {
    return validateISBN10(cleaned);
  } else if (cleaned.length === 13) {
    return validateISBN13(cleaned);
  }
  
  return false;
}
