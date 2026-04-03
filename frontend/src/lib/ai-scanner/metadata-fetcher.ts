/**
 * Book Metadata Fetching Service
 *
 * Price priority:
 * 1. MRP printed on cover (read by Gemini Vision — most accurate)
 * 2. Google Books retailPrice/listPrice in INR (country=IN)
 * 3. Google Books title+author search (when ISBN lookup has no price)
 * 4. Open Library (metadata only, no price)
 * 5. null — user must enter manually (never guess)
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
    pageCount?: number;
  };
  saleInfo?: {
    saleability?: string;
    listPrice?: { amount: number; currencyCode: string };
    retailPrice?: { amount: number; currencyCode: string };
  };
}

interface GoogleBooksResponse {
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

// ─── price extraction ─────────────────────────────────────────────────────────

function extractPriceFromSaleInfo(
  saleInfo: GoogleBooksItem['saleInfo'] | undefined
): { price: number; source: string } | null {
  if (!saleInfo) return null;

  const entry = saleInfo.retailPrice ?? saleInfo.listPrice;
  if (!entry?.amount || entry.amount <= 0) return null;

  if (entry.currencyCode === 'INR') {
    return { price: Math.round(entry.amount), source: 'Google Books (INR)' };
  }
  if (entry.currencyCode === 'USD') {
    return { price: Math.round(entry.amount * USD_TO_INR), source: 'Google Books (USD→INR)' };
  }
  return null;
}

// ─── Gemini price lookup ──────────────────────────────────────────────────────

/**
 * Use Gemini to look up the MRP of a book.
 * Asks 3 times and takes the median to reduce hallucination inconsistency.
 * Only returns a price if Gemini is consistently confident.
 */
export async function fetchPriceViaGemini(
  title: string,
  author: string,
  isbn: string | null
): Promise<{ price: number; source: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Ask specifically about the Indian edition MRP
    const prompt = `What is the MRP (Maximum Retail Price) printed on the back cover of "${title}" by ${author}${isbn ? ` (ISBN: ${isbn})` : ''}, Indian Edition?

Rules:
- Only provide the price if you are highly confident it is the exact MRP printed on the Indian edition
- This should be the price as printed on the physical book, not an online price
- Reply ONLY with JSON (no markdown): {"price_inr": <integer or null>, "confidence": "high/medium/low"}
- Use null if you have any doubt`;

    // Ask 3 times and require at least 2 consistent answers
    const results: number[] = [];
    for (let i = 0; i < 3; i++) {
      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim().replace(/```json|```/g, '');
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) continue;
        const parsed = JSON.parse(match[0]);
        // Only accept high confidence answers
        if (parsed.price_inr && parsed.confidence === 'high') {
          const price = Math.round(Number(parsed.price_inr));
          if (price >= 100 && price <= 5000) results.push(price);
        }
      } catch { /* ignore */ }
    }

    if (results.length < 2) return null; // Need at least 2 consistent high-confidence answers

    // Sort and take median
    results.sort((a, b) => a - b);
    const median = results[Math.floor(results.length / 2)];

    // Check consistency — all results should be within 20% of each other
    const min = results[0];
    const max = results[results.length - 1];
    if (max / min > 1.2) return null; // Too inconsistent — don't trust it

    return {
      price: median,
      source: `Gemini (${results.length}/3 consistent)`,
    };
  } catch {
    return null;
  }
}

function buildMetadataFromItem(
  isbn: string,
  item: GoogleBooksItem,
  priceOverride?: { price: number; source: string } | null
): BookMetadata {
  const v = item.volumeInfo;
  let publicationYear: number | null = null;
  if (v.publishedDate) {
    const m = v.publishedDate.match(/^\d{4}/);
    if (m) publicationYear = parseInt(m[0]);
  }

  const priceData = priceOverride ?? extractPriceFromSaleInfo(item.saleInfo);

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
    original_price: priceData?.price ?? null,
    price_source: priceData?.source ?? null,
  };
}

// ─── Google Books by ISBN ─────────────────────────────────────────────────────

async function fetchByISBN(isbn: string): Promise<BookMetadata | null> {
  try {
    const res = await fetch(`${GOOGLE_BOOKS_URL}?q=isbn:${isbn}&country=IN`);
    if (!res.ok) return null;
    const data: GoogleBooksResponse = await res.json();
    if (!data.items?.length) return null;
    return buildMetadataFromItem(isbn, data.items[0]);
  } catch {
    return null;
  }
}

// ─── Google Books by title+author (price fallback) ────────────────────────────

/**
 * When ISBN lookup returns no price, search by title+author to find
 * another edition that has pricing data.
 */
async function fetchPriceByTitleAuthor(
  title: string,
  author: string
): Promise<{ price: number; source: string } | null> {
  try {
    const q = encodeURIComponent(`intitle:${title} inauthor:${author}`);
    const res = await fetch(`${GOOGLE_BOOKS_URL}?q=${q}&country=IN&maxResults=5`);
    if (!res.ok) return null;
    const data: GoogleBooksResponse = await res.json();
    if (!data.items?.length) return null;

    // Find first item that has a real INR price
    for (const item of data.items) {
      const p = extractPriceFromSaleInfo(item.saleInfo);
      if (p) return p;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Open Library ─────────────────────────────────────────────────────────────

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
      // Open Library has no pricing — leave null, user fills in
      original_price: null,
      price_source: null,
    };
  } catch {
    return null;
  }
}

// ─── main export ──────────────────────────────────────────────────────────────

/**
 * Fetch book metadata for a given ISBN.
 *
 * Price strategy (in order):
 * 1. Google Books INR retail/list price (rarely available for Indian books)
 * 2. Title+author search across Google Books editions
 * 3. Gemini knowledge base — most reliable for Indian book MRPs
 * 4. null — user must enter manually
 */
export async function fetchBookMetadata(isbn: string): Promise<BookMetadata | null> {
  if (!isbn?.trim()) return null;
  const cleanISBN = isbn.trim().replace(/[^0-9X]/gi, '');

  // Step 1: ISBN lookup on Google Books (for metadata + cover image)
  const googleResult = await fetchByISBN(cleanISBN);

  // Step 2: Open Library fallback for metadata if Google Books fails
  const baseResult = googleResult ?? await fetchFromOpenLibrary(cleanISBN);

  if (!baseResult) return null;

  // Upgrade cover image resolution if from Google Books
  if (baseResult.cover_image) {
    baseResult.cover_image = baseResult.cover_image
      .replace('zoom=1', 'zoom=3')
      .replace('&edge=curl', '')
      .replace('http://', 'https://');
  }

  // Step 3: Try Google Books title+author price search
  if (!baseResult.original_price && baseResult.title && baseResult.author) {
    const priceData = await fetchPriceByTitleAuthor(baseResult.title, baseResult.author);
    if (priceData) {
      baseResult.original_price = priceData.price;
      baseResult.price_source = priceData.source;
    }
  }

  // Step 4: Gemini price lookup — most reliable for Indian books
  // Always try this if we don't have a price yet
  if (!baseResult.original_price) {
    const geminiPrice = await fetchPriceViaGemini(
      baseResult.title,
      baseResult.author,
      cleanISBN
    );
    if (geminiPrice) {
      baseResult.original_price = geminiPrice.price;
      baseResult.price_source = geminiPrice.source;
    }
  }

  return baseResult;
}

export function validateBookMetadata(metadata: BookMetadata): boolean {
  return !!(metadata.isbn && metadata.title && metadata.author);
}
