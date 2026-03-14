/**
 * Book Metadata Fetching Service
 * 
 * Fetches book metadata from external book database APIs (Google Books API, Open Library).
 * 
 * Requirements:
 * - 2.7: Fetch book metadata from external book database API
 * - 2.12: Handle API failures gracefully
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface BookMetadata {
  isbn: string;
  title: string;
  author: string;
  publisher: string | null;
  edition: string | null;
  publication_year: number | null;
  cover_image: string | null;
  description: string | null;
  subject: string | null;
}

interface GoogleBooksVolumeInfo {
  title?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  categories?: string[];
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
  };
}

interface GoogleBooksResponse {
  items?: Array<{
    volumeInfo: GoogleBooksVolumeInfo;
  }>;
}

interface OpenLibraryResponse {
  [key: string]: {
    title?: string;
    authors?: Array<{ name: string }>;
    publishers?: string[];
    publish_date?: string;
    subjects?: string[];
    cover?: {
      large?: string;
      medium?: string;
      small?: string;
    };
  };
}

// ============================================================================
// API Configuration
// ============================================================================

const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes';
const OPEN_LIBRARY_API_URL = 'https://openlibrary.org/api/books';

// ============================================================================
// Metadata Fetching Functions
// ============================================================================

/**
 * Fetch book metadata from Google Books API
 * 
 * @param isbn - ISBN-10 or ISBN-13
 * @returns Book metadata or null
 */
async function fetchFromGoogleBooks(isbn: string): Promise<BookMetadata | null> {
  try {
    const url = `${GOOGLE_BOOKS_API_URL}?q=isbn:${isbn}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Google Books API error: ${response.status}`);
      return null;
    }
    
    const data: GoogleBooksResponse = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.log(`No results found in Google Books for ISBN: ${isbn}`);
      return null;
    }
    
    const volumeInfo = data.items[0].volumeInfo;
    
    // Extract publication year from publishedDate
    let publicationYear: number | null = null;
    if (volumeInfo.publishedDate) {
      const yearMatch = volumeInfo.publishedDate.match(/^\d{4}/);
      if (yearMatch) {
        publicationYear = parseInt(yearMatch[0]);
      }
    }
    
    return {
      isbn,
      title: volumeInfo.title || 'Unknown Title',
      author: volumeInfo.authors?.join(', ') || 'Unknown Author',
      publisher: volumeInfo.publisher || null,
      edition: null, // Google Books doesn't provide edition info
      publication_year: publicationYear,
      cover_image: volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail || null,
      description: volumeInfo.description || null,
      subject: volumeInfo.categories?.join(', ') || null
    };
    
  } catch (error) {
    console.error('Google Books API fetch error:', error);
    return null;
  }
}

/**
 * Fetch book metadata from Open Library API
 * 
 * @param isbn - ISBN-10 or ISBN-13
 * @returns Book metadata or null
 */
async function fetchFromOpenLibrary(isbn: string): Promise<BookMetadata | null> {
  try {
    const url = `${OPEN_LIBRARY_API_URL}?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Open Library API error: ${response.status}`);
      return null;
    }
    
    const data: OpenLibraryResponse = await response.json();
    const bookKey = `ISBN:${isbn}`;
    
    if (!data[bookKey]) {
      console.log(`No results found in Open Library for ISBN: ${isbn}`);
      return null;
    }
    
    const bookData = data[bookKey];
    
    // Extract publication year from publish_date
    let publicationYear: number | null = null;
    if (bookData.publish_date) {
      const yearMatch = bookData.publish_date.match(/\d{4}/);
      if (yearMatch) {
        publicationYear = parseInt(yearMatch[0]);
      }
    }
    
    return {
      isbn,
      title: bookData.title || 'Unknown Title',
      author: bookData.authors?.map(a => a.name).join(', ') || 'Unknown Author',
      publisher: bookData.publishers?.[0] || null,
      edition: null, // Open Library doesn't provide edition info in this endpoint
      publication_year: publicationYear,
      cover_image: bookData.cover?.large || bookData.cover?.medium || bookData.cover?.small || null,
      description: null, // Not available in this endpoint
      subject: bookData.subjects?.join(', ') || null
    };
    
  } catch (error) {
    console.error('Open Library API fetch error:', error);
    return null;
  }
}

/**
 * Fetch book metadata from external book database API
 * 
 * Tries Google Books API first, then falls back to Open Library.
 * 
 * Requirements:
 * - 2.7: Fetch book metadata from external book database API
 * - 2.12: Handle API failures gracefully
 * 
 * @param isbn - ISBN-10 or ISBN-13
 * @returns Book metadata or null if not found
 */
export async function fetchBookMetadata(isbn: string): Promise<BookMetadata | null> {
  if (!isbn || !isbn.trim()) {
    console.error('ISBN is required for metadata fetching');
    return null;
  }
  
  // Clean ISBN (remove whitespace)
  const cleanedISBN = isbn.trim();
  
  console.log(`Fetching metadata for ISBN: ${cleanedISBN}`);
  
  // Try Google Books API first
  const googleResult = await fetchFromGoogleBooks(cleanedISBN);
  if (googleResult) {
    console.log('Metadata fetched from Google Books');
    return googleResult;
  }
  
  // Fallback to Open Library
  console.log('Google Books failed, trying Open Library...');
  const openLibraryResult = await fetchFromOpenLibrary(cleanedISBN);
  if (openLibraryResult) {
    console.log('Metadata fetched from Open Library');
    return openLibraryResult;
  }
  
  // Both APIs failed
  console.error('Failed to fetch metadata from all sources');
  return null;
}

/**
 * Validate book metadata
 * 
 * @param metadata - Book metadata to validate
 * @returns True if metadata has required fields
 */
export function validateBookMetadata(metadata: BookMetadata): boolean {
  return !!(
    metadata.isbn &&
    metadata.title &&
    metadata.author
  );
}
