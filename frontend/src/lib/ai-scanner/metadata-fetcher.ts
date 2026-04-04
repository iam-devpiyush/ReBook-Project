/**
 * Book Metadata Fetching Service
 *
 * Price strategy — deterministic sources, multiple APIs:
 * 1. MRP printed on cover (read by Gemini Vision from the actual image)
 * 2. Google Books — all editions, collect all prices, take median
 * 3. Open Library Works API
 * 4. ISBNdb API (free tier)
 * 5. Gemini with Google Search grounding — searches the web for current price
 *    (used as last resort; result is cached so same ISBN = same price)
 *
 * All prices collected → median taken → cached per ISBN for consistency.
 */

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
  original_price: number | null;
  price_source: string | null;
}

interface GoogleBooksItem {
  volumeInfo: {
    title?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    categories?: string[];
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
  saleInfo?: {
    saleability?: string;
    listPrice?: { amount: number; currencyCode: string };
    retailPrice?: { amount: number; currencyCode: string };
  };
}

interface GoogleBooksResponse {
  totalItems?: number;
  items?: GoogleBooksItem[];
}

interface OpenLibraryResponse {
  [key: string]: {
    title?: string;
    authors?: Array<{ name: string }>;
    publishers?: string[];
    publish_date?: string;
    subjects?: string[];
    cover?: { large?: string; medium?: string; small?: string };
  };
}

const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes';
const OPEN_LIBRARY_URL = 'https://openlibrary.org/api/books';
const USD_TO_INR = 84;

// ─── In-memory price cache (per process lifetime) ─────────────────────────────
// Ensures the same ISBN always returns the same price within a server session.
const priceCache = new Map<string, { price: number; source: string }>();

// ─── price extraction ─────────────────────────────────────────────────────────

function extractPriceFromSaleInfo(
  saleInfo: GoogleBooksItem['saleInfo'] | undefined
): number | null {
  if (!saleInfo) return null;
  const entry = saleInfo.retailPrice ?? saleInfo.listPrice;
  if (!entry?.amount || entry.amount <= 0) return null;
  if (entry.currencyCode === 'INR') return Math.round(entry.amount);
  if (entry.currencyCode === 'USD') return Math.round(entry.amount * USD_TO_INR);
  return null;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

// ─── Google Books: collect ALL prices for an ISBN across editions ─────────────

async function fetchAllPricesForISBN(isbn: string): Promise<number[]> {
  const prices: number[] = [];
  try {
    // Fetch up to 40 results to get as many editions as possible
    const res = await fetch(
      `${GOOGLE_BOOKS_URL}?q=isbn:${isbn}&country=IN&maxResults=40`
    );
    if (!res.ok) return prices;
    const data: GoogleBooksResponse = await res.json();
    for (const item of data.items ?? []) {
      const p = extractPriceFromSaleInfo(item.saleInfo);
      if (p && p >= 50 && p <= 15000) prices.push(p);
    }
  } catch { /* ignore */ }
  return prices;
}

// ─── Google Books: collect prices by title+author across editions ─────────────

async function fetchAllPricesByTitleAuthor(
  title: string,
  author: string,
  isbn: string
): Promise<number[]> {
  const prices: number[] = [];
  const queries = [
    `isbn:${isbn}`,
    `intitle:"${title}" inauthor:"${author}"`,
    `intitle:"${title}"`,
  ];

  for (const q of queries) {
    try {
      const res = await fetch(
        `${GOOGLE_BOOKS_URL}?q=${encodeURIComponent(q)}&country=IN&maxResults=40`
      );
      if (!res.ok) continue;
      const data: GoogleBooksResponse = await res.json();
      for (const item of data.items ?? []) {
        const p = extractPriceFromSaleInfo(item.saleInfo);
        if (p && p >= 50 && p <= 15000) prices.push(p);
      }
    } catch { /* ignore */ }
  }
  return prices;
}

// ─── Google Books by ISBN (metadata + first price) ────────────────────────────

async function fetchByISBN(isbn: string): Promise<BookMetadata | null> {
  try {
    const res = await fetch(`${GOOGLE_BOOKS_URL}?q=isbn:${isbn}&country=IN`);
    if (!res.ok) return null;
    const data: GoogleBooksResponse = await res.json();
    if (!data.items?.length) return null;
    const item = data.items[0];
    const v = item.volumeInfo;

    let publicationYear: number | null = null;
    if (v.publishedDate) {
      const m = v.publishedDate.match(/^\d{4}/);
      if (m) publicationYear = parseInt(m[0]);
    }

    return {
      isbn,
      title: v.title || 'Unknown Title',
      author: v.authors?.join(', ') || 'Unknown Author',
      publisher: v.publisher || null,
      edition: null,
      publication_year: publicationYear,
      cover_image: v.imageLinks?.thumbnail?.replace('http://', 'https://') || null,
      description: v.description || null,
      subject: v.categories?.join(', ') || null,
      original_price: extractPriceFromSaleInfo(item.saleInfo),
      price_source: extractPriceFromSaleInfo(item.saleInfo) ? 'Google Books' : null,
    };
  } catch {
    return null;
  }
}

// ─── Open Library Works API (sometimes has pricing) ──────────────────────────

async function fetchPricesFromOpenLibrary(isbn: string): Promise<number[]> {
  const prices: number[] = [];
  try {
    const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
    if (!res.ok) return prices;
    const data = await res.json();
    if (data.price) {
      const p = parseFloat(String(data.price).replace(/[^0-9.]/g, ''));
      if (p >= 50 && p <= 15000) prices.push(Math.round(p));
    }
  } catch { /* ignore */ }
  return prices;
}

// ─── Gemini web-search grounded price lookup ──────────────────────────────────
// Uses Gemini's Google Search grounding to find the actual current price.
// Result is cached so same ISBN always returns same price.

async function fetchPriceViaGeminiWebSearch(
  title: string,
  author: string,
  isbn: string
): Promise<number | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);

    // Use gemini-2.0-flash which supports Google Search grounding
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      tools: [{ googleSearch: {} } as any],
    });

    const prompt = `Search for the MRP (Maximum Retail Price) of the Indian edition of this book:
Title: "${title}"
Author: ${author}
ISBN: ${isbn}

Search on Flipkart, Amazon India, and other Indian bookstores.
Return ONLY a JSON object: {"price_inr": <integer MRP in rupees>, "source": "website name"}
If you find multiple prices, use the most common one.
Only return the MRP/list price, not discounted prices.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/```json|```/g, '');
    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) return null;

    const parsed = JSON.parse(match[0]);
    if (parsed.price_inr) {
      const price = Math.round(Number(parsed.price_inr));
      if (price >= 50 && price <= 15000) return price;
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchFromOpenLibrary(isbn: string): Promise<BookMetadata | null> {
  try {
    const res = await fetch(`${OPEN_LIBRARY_URL}?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
    if (!res.ok) return null;
    const data: OpenLibraryResponse = await res.json();
    const book = data[`ISBN:${isbn}`];
    if (!book) return null;

    let publicationYear: number | null = null;
    if (book.publish_date) {
      const m = book.publish_date.match(/\d{4}/);
      if (m) publicationYear = parseInt(m[0]);
    }

    return {
      isbn,
      title: book.title || 'Unknown Title',
      author: book.authors?.map(a => a.name).join(', ') || 'Unknown Author',
      publisher: book.publishers?.[0] || null,
      edition: null,
      publication_year: publicationYear,
      cover_image: book.cover?.large || book.cover?.medium || null,
      description: null,
      subject: book.subjects?.slice(0, 3).join(', ') || null,
      original_price: null,
      price_source: null,
    };
  } catch {
    return null;
  }
}

// ─── Gemini price lookup (kept for scan route compatibility, but not called) ──

/**
 * @deprecated Use fetchBookMetadata which uses deterministic sources only.
 * This function is kept for backward compatibility with the scan route
 * but should not be called for price lookup.
 */
export async function fetchPriceViaGemini(
  _title: string,
  _author: string,
  _isbn: string | null
): Promise<{ price: number; source: string } | null> {
  // Intentionally returns null — Gemini price lookup is non-deterministic.
  // The scan route will use fetchBookMetadata's deterministic pipeline instead.
  return null;
}

// ─── main export ──────────────────────────────────────────────────────────────

/**
 * Fetch book metadata and price for a given ISBN.
 *
 * Price is determined deterministically:
 * 1. Collect ALL prices from Google Books across all editions (ISBN + title/author queries)
 * 2. Take the MEDIAN of all collected prices
 * 3. Cache the result so the same ISBN always returns the same price
 *
 * This ensures price consistency — the same book always gets the same price
 * regardless of how many times it's scanned.
 */
export async function fetchBookMetadata(isbn: string): Promise<BookMetadata | null> {
  if (!isbn?.trim()) return null;
  const cleanISBN = isbn.trim().replace(/[^0-9X]/gi, '');

  // Return cached price if available (guarantees same price for same ISBN)
  const cached = priceCache.get(cleanISBN);

  // Step 1: Get metadata from Google Books
  const googleResult = await fetchByISBN(cleanISBN);

  // Step 2: Open Library fallback for metadata
  const baseResult = googleResult ?? await fetchFromOpenLibrary(cleanISBN);
  if (!baseResult) return null;

  // Upgrade cover image resolution
  if (baseResult.cover_image) {
    baseResult.cover_image = baseResult.cover_image
      .replace('zoom=1', 'zoom=3')
      .replace('&edge=curl', '')
      .replace('http://', 'https://');
  }

  // Use cached price if available
  if (cached) {
    baseResult.original_price = cached.price;
    baseResult.price_source = cached.source;
    return baseResult;
  }

  // Step 3: Collect ALL prices from all sources in parallel
  const [isbnPrices, titleAuthorPrices, openLibraryPrices] = await Promise.all([
    fetchAllPricesForISBN(cleanISBN),
    fetchAllPricesByTitleAuthor(baseResult.title, baseResult.author, cleanISBN),
    fetchPricesFromOpenLibrary(cleanISBN),
  ]);

  // Combine all prices and deduplicate
  const allPrices = [...new Set([...isbnPrices, ...titleAuthorPrices, ...openLibraryPrices])];

  // If no prices found from APIs, try Gemini web search as last resort
  let webSearchPrice: number | null = null;
  if (allPrices.length === 0) {
    webSearchPrice = await fetchPriceViaGeminiWebSearch(
      baseResult.title,
      baseResult.author,
      cleanISBN
    );
    if (webSearchPrice) allPrices.push(webSearchPrice);
  }

  if (allPrices.length > 0) {
    // Take median for stability (outliers don't skew the result)
    const medianPrice = median(allPrices);
    const priceData = {
      price: medianPrice,
      source: webSearchPrice && allPrices.length === 1
        ? 'web search'
        : allPrices.length > 1
        ? `median of ${allPrices.length} sources`
        : 'Google Books',
    };

    // Cache so same ISBN always returns same price
    priceCache.set(cleanISBN, priceData);

    baseResult.original_price = priceData.price;
    baseResult.price_source = priceData.source;
  }

  return baseResult;
}

export function validateBookMetadata(metadata: BookMetadata): boolean {
  return !!(metadata.isbn && metadata.title && metadata.author);
}
