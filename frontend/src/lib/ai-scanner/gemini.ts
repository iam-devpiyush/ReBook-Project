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

// Models in priority order — rotate on 429/rate limit errors
const GEMINI_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

/** Call a Gemini model with automatic fallback on rate limit errors */
async function withModelFallback<T>(
  fn: (modelName: string) => Promise<T>
): Promise<T> {
  let lastError: unknown;
  for (const modelName of GEMINI_MODELS) {
    try {
      return await fn(modelName);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota');
      if (isRateLimit) {
        console.warn(`[Gemini] ${modelName} rate limited, trying next model...`);
        lastError = err;
        continue;
      }
      // Non-rate-limit error — don't retry with different model
      throw err;
    }
  }
  throw lastError;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function imageToGenerativePart(base64Data: string, mimeType: string) {
  return { inlineData: { data: base64Data, mimeType } };
}

/** Convert a data-URL or https URL to a base64 inline part for Gemini */
async function urlToPart(imageUrl: string, maxSize = 800) {
  if (imageUrl.startsWith('data:')) {
    const mimeType = (imageUrl.match(/data:([^;]+);/) || [])[1] || 'image/jpeg';
    const resized = await resizeDataUrl(imageUrl, maxSize);
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
    'Does this image show the FRONT COVER of a physical book? ' +
    'The front cover must be visible with the title, author name, and cover art clearly shown. ' +
    'Return {"valid": true, "reason": "short reason"} ONLY if the image shows the front cover of a book. ' +
    'Return {"valid": false, "reason": "short reason"} if the image shows the back cover, spine, inside pages, or is not a book at all.',
  back_cover:
    'Does this image show the BACK COVER of a physical book? ' +
    'The back cover must be visible with back-cover text, barcode, or publisher info clearly shown. ' +
    'Return {"valid": true, "reason": "short reason"} ONLY if the image shows the back cover of a book. ' +
    'Return {"valid": false, "reason": "short reason"} if the image shows the front cover, spine, inside pages, or is not a book at all.',
  spine:
    'Does this image show the SPINE of a physical book? ' +
    'The spine must be visible — the narrow side of the book with the title and/or author text running along it. ' +
    'Return {"valid": true, "reason": "short reason"} ONLY if the image shows the spine of a book. ' +
    'Return {"valid": false, "reason": "short reason"} if the image shows the front cover, back cover, inside pages, or is not a book at all.',
  pages:
    'Does this image show the INSIDE PAGES of a physical book? ' +
    'The inside pages must be visible — an open book with printed text or illustrations on the pages. ' +
    'Return {"valid": true, "reason": "short reason"} ONLY if the image shows the inside pages of a book. ' +
    'Return {"valid": false, "reason": "short reason"} if the image shows the cover, spine, or is not a book at all.',
};

export async function validateBookImage(
  imageUrl: string,
  imageType: string
): Promise<ImageValidationResult> {
  try {
    const part = await urlToPart(imageUrl);
    const prompt = IMAGE_TYPE_PROMPTS[imageType] || IMAGE_TYPE_PROMPTS.front_cover;

    const text = await withModelFallback(async (modelName) => {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([prompt, part]);
      return result.response.text().trim();
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        valid: Boolean(parsed.valid),
        reason: parsed.reason || (parsed.valid ? 'Image looks good' : 'Image does not match expected type'),
      };
    }

    const isValid = /\btrue\b/i.test(text) && !/\bfalse\b/i.test(text);
    return { valid: isValid, reason: isValid ? 'Image looks good' : 'Could not verify image type' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
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
You are a book data extraction assistant. Look carefully at BOTH book cover images and extract all available information.

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

RULES for original_price_inr — look VERY carefully at the back cover image:
- Scan the ENTIRE back cover image for any price information
- Look for ₹ symbol followed by numbers (e.g. ₹499, ₹ 499, ₹499.00)
- Look for "MRP", "MRP:", "MRP ₹", "Rs.", "Rs", "Price:", "Price ₹" near a number
- Look near the ISBN barcode area — Indian books always print MRP near the barcode
- Look at the bottom of the back cover — price stickers or printed prices are common there
- Look for text like "Printed in India" followed by a price
- The price may be small text — look carefully at all text on the back cover
- If you find a price, extract just the integer value (e.g. ₹499.00 → 499)
- If multiple prices are visible, use the one labeled MRP or the highest one
- Only set to null if you genuinely cannot find any price after careful inspection
- Set price_source to "cover_price" whenever you find a price
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
    // Use higher resolution for back cover — price text is often small and needs detail
    const [frontPart, backPart] = await Promise.all([
      urlToPart(frontCoverUrl, 1200),
      urlToPart(backCoverUrl, 1600),
    ]);

    const text = await withModelFallback(async (modelName) => {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([EXTRACTION_PROMPT, frontPart, backPart]);
      return result.response.text().trim();
    });

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
