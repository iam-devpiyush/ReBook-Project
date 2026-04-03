/**
 * Gemini Vision Service
 *
 * Two jobs:
 * 1. validateBookImage — checks if an uploaded image matches the expected type
 *    (front cover, back cover, spine, pages) and is a real book photo.
 * 2. extractBookData — extracts ISBN, title, author, publisher, year, price
 *    directly from the front + back cover images.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const GEMINI_MODEL = 'gemini-2.5-flash';

// ─── helpers ─────────────────────────────────────────────────────────────────

function imageToGenerativePart(base64Data: string, mimeType: string) {
  return { inlineData: { data: base64Data, mimeType } };
}

/** Convert a data-URL or https URL to a base64 inline part for Gemini */
async function urlToPart(imageUrl: string) {
  if (imageUrl.startsWith('data:')) {
    const mimeType = (imageUrl.match(/data:([^;]+);/) || [])[1] || 'image/jpeg';
    // Resize large images to max 800px to avoid payload size issues
    const resized = await resizeDataUrl(imageUrl, 800);
    const resizedBase64 = resized.split(',')[1];
    return imageToGenerativePart(resizedBase64, mimeType);
  }
  // Remote URL — fetch and convert
  const res = await fetch(imageUrl);
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const mimeType = res.headers.get('content-type') || 'image/jpeg';
  return imageToGenerativePart(base64, mimeType);
}

/**
 * Resize a data URL to max width/height using Canvas (browser) or return as-is (server).
 * This prevents large image payloads from hitting Gemini API limits.
 */
async function resizeDataUrl(dataUrl: string, maxSize: number): Promise<string> {
  if (typeof window === 'undefined') {
    try {
      const base64 = dataUrl.split(',')[1];
      const buffer = Buffer.from(base64, 'base64');
      const sharp = (await import('sharp')).default;
      const resized = await sharp(buffer)
        .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      return `data:image/jpeg;base64,${resized.toString('base64')}`;
    } catch {
      return dataUrl;
    }
  }
  return dataUrl;
}

// ─── types ────────────────────────────────────────────────────────────────────

export interface ImageValidationResult {
  valid: boolean;
  api_unavailable?: boolean;
  reason: string;
}

export interface GeminiBookData {
  isbn: string | null;
  title: string | null;
  author: string | null;
  publisher: string | null;
  publication_year: number | null;
  edition: string | null;
  subject: string | null;
  original_price_inr: number | null;
  price_source: string | null;
  cover_image_url: string | null; // not extracted by Gemini, kept for compat
}

// ─── image validation ─────────────────────────────────────────────────────────

const IMAGE_TYPE_PROMPTS: Record<string, string> = {
  front_cover:
    'Is this image a clear photo of the FRONT COVER of a physical book? ' +
    'It should show the book title and/or author on the cover. ' +
    'Reply with JSON: {"valid": true/false, "reason": "short reason"}',
  back_cover:
    'Is this image a clear photo of the BACK COVER of a physical book? ' +
    'It may show a synopsis, barcode, or ISBN. ' +
    'Reply with JSON: {"valid": true/false, "reason": "short reason"}',
  spine:
    'Is this image a clear photo of the SPINE of a physical book (the narrow side)? ' +
    'Reply with JSON: {"valid": true/false, "reason": "short reason"}',
  pages:
    'Is this image a clear photo of the INSIDE PAGES of a physical book (open pages showing text)? ' +
    'Reply with JSON: {"valid": true/false, "reason": "short reason"}',
};

export async function validateBookImage(
  imageUrl: string,
  imageType: string
): Promise<ImageValidationResult> {
  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const part = await urlToPart(imageUrl);
    const prompt = IMAGE_TYPE_PROMPTS[imageType] || IMAGE_TYPE_PROMPTS.front_cover;

    const result = await model.generateContent([prompt, part]);
    const text = result.response.text().trim();

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        valid: Boolean(parsed.valid),
        reason: parsed.reason || (parsed.valid ? 'Image looks good' : 'Image does not match expected type'),
      };
    }

    // Fallback: look for true/false in text
    const isValid = /\btrue\b/i.test(text) && !/\bfalse\b/i.test(text);
    return { valid: isValid, reason: isValid ? 'Image looks good' : 'Could not verify image type' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Log the FULL error so we can diagnose
    console.error('[Gemini validation] FULL ERROR:', msg);
    
    if (msg.includes('limit: 0') || msg.includes('RESOURCE_EXHAUSTED')) {
      return { valid: false, api_unavailable: true, reason: 'AI validation quota exceeded. Please enable billing at console.cloud.google.com/billing' };
    }
    if (msg.includes('429') && msg.includes('retryDelay')) {
      return { valid: false, api_unavailable: true, reason: 'AI validation is temporarily rate-limited. Please wait a moment and try again.' };
    }
    console.error('[Gemini validation] unexpected error:', msg.slice(0, 200));
    return { valid: false, api_unavailable: true, reason: `AI validation error: ${msg.slice(0, 100)}` };
  }
}

// ─── book data extraction ─────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `
You are a book data extraction assistant. Look carefully at these book cover images and extract all available information.

Return ONLY a JSON object with these fields (use null for anything not visible):
{
  "isbn": "13-digit ISBN without hyphens, found on barcode on back cover, or null",
  "title": "exact book title as printed on front cover, or null",
  "author": "author name(s) as printed, or null",
  "publisher": "publisher name, or null",
  "publication_year": year as integer or null,
  "edition": "edition string e.g. '8th Edition' or null",
  "subject": "subject/genre or null",
  "original_price_inr": <integer or null>,
  "price_source": "cover_price" or null
}

CRITICAL RULES for original_price_inr:
- ONLY extract the price if you can LITERALLY SEE it printed on the book in the image
- Look for ₹ symbol followed by numbers on the back cover
- Look for text like "MRP", "Price:", "Rs." near a number
- Indian edition books have MRP printed near the ISBN barcode on the back cover
- If you cannot see a price printed in the image, set original_price_inr to null
- DO NOT guess or recall the price from memory — only extract what is visually present
- The price you extract must be exactly what is printed, not an approximation
`;

export async function extractBookDataFromImages(
  frontCoverUrl: string,
  backCoverUrl: string
): Promise<GeminiBookData> {
  const empty: GeminiBookData = {
    isbn: null, title: null, author: null, publisher: null,
    publication_year: null, edition: null, subject: null,
    original_price_inr: null, price_source: null, cover_image_url: null,
  };

  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const [frontPart, backPart] = await Promise.all([
      urlToPart(frontCoverUrl),
      urlToPart(backCoverUrl),
    ]);

    const result = await model.generateContent([EXTRACTION_PROMPT, frontPart, backPart]);
    const text = result.response.text().trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return empty;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      isbn: parsed.isbn || null,
      title: parsed.title || null,
      author: parsed.author || null,
      publisher: parsed.publisher || null,
      publication_year: parsed.publication_year ? Number(parsed.publication_year) : null,
      edition: parsed.edition || null,
      subject: parsed.subject || null,
      original_price_inr: parsed.original_price_inr ? Number(parsed.original_price_inr) : null,
      price_source: parsed.price_source || null,
      cover_image_url: null,
    };
  } catch (err) {
    console.error('Gemini extraction error:', err);
    return empty;
  }
}
