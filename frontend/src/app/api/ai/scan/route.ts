import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/middleware';
import { fetchBookMetadata, fetchPriceViaGemini } from '@/lib/ai-scanner/metadata-fetcher';
import { analyzeBookCondition, type ConditionAnalysis } from '@/lib/ai-scanner/condition-analyzer';
import { extractBookDataFromImages } from '@/lib/ai-scanner/gemini';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

async function validateImageUrl(url: string, label: string): Promise<string | null> {
  // Data URLs are validated at upload time; skip HEAD check for them
  if (url.startsWith('data:')) return null;

  let headResponse: Response;
  try {
    headResponse = await fetch(url, { method: 'HEAD' });
  } catch (err: any) {
    return `${label}: image URL is not accessible — ${err?.message ?? 'network error'}`;
  }

  if (!headResponse.ok) {
    return `${label}: image URL returned HTTP ${headResponse.status} — not accessible`;
  }

  const contentLength = headResponse.headers.get('content-length');
  if (contentLength) {
    const sizeBytes = parseInt(contentLength, 10);
    if (sizeBytes > MAX_SIZE_BYTES) {
      return `${label}: image exceeds the 5 MB size limit (${(sizeBytes / 1024 / 1024).toFixed(2)} MB)`;
    }
  }

  return null;
}

interface ScanRequest {
  images: {
    front_cover: string;
    back_cover: string;
    spine: string;
    pages: string;
  };
  scan_id: string;
}

const DEFAULT_CONDITION: ConditionAnalysis = {
  cover_damage: 3, page_quality: 3, binding_quality: 3,
  markings: 3, discoloration: 3, overall_score: 3,
  confidence: 0.5, notes: 'Condition estimated as average.',
};

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) return authResult.response;

  let body: ScanRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { images, scan_id } = body ?? {};
  if (!images || !scan_id) {
    return NextResponse.json({ error: 'images and scan_id are required' }, { status: 400 });
  }
  if (!images.front_cover || !images.back_cover || !images.spine || !images.pages) {
    return NextResponse.json({ error: 'All 4 image types are required' }, { status: 400 });
  }

  // Validate each image URL is accessible and not oversized (Requirements 1.2, 1.5)
  const imageEntries: [string, string][] = [
    ['front_cover', images.front_cover],
    ['back_cover', images.back_cover],
    ['spine', images.spine],
    ['pages', images.pages],
  ];
  const urlErrors: Record<string, string> = {};
  await Promise.all(
    imageEntries.map(async ([label, url]) => {
      const err = await validateImageUrl(url, label);
      if (err) urlErrors[label] = err;
    })
  );
  if (Object.keys(urlErrors).length > 0) {
    return NextResponse.json(
      { error: 'One or more image URLs failed validation', details: urlErrors },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  try {
    await (supabase as any).from('ai_scans').insert({
      id: scan_id,
      user_id: authResult.user.id,
      images: [images.front_cover, images.back_cover, images.spine, images.pages],
      scan_status: 'in_progress',
      progress_percentage: 0,
    });
  } catch { /* non-fatal */ }

  try {
    // Run Gemini extraction + condition analysis in parallel
    // Gemini reads the cover images directly — most accurate for price (reads MRP from cover)
    const [geminiData, conditionAnalysis] = await Promise.all([
      extractBookDataFromImages(images.front_cover, images.back_cover).catch(() => null),
      analyzeBookCondition(images).catch(() => DEFAULT_CONDITION),
    ]);

    // Use Gemini ISBN first, then fall back to Google Books metadata fetch
    const detectedISBN = geminiData?.isbn ?? null;

    // Fetch richer metadata from Google Books if we have an ISBN
    // (Gemini gives us the basics; Google Books adds description, cover image, etc.)
    let bookMetadata = null;
    if (detectedISBN) {
      bookMetadata = await fetchBookMetadata(detectedISBN).catch(() => null);
    }

    // If no ISBN but Gemini extracted title+author, still try to get price via Gemini
    if (!bookMetadata && geminiData?.title && geminiData?.author && !geminiData.original_price_inr) {
      const priceData = await fetchPriceViaGemini(geminiData.title, geminiData.author, null).catch(() => null);
      if (priceData) {
        geminiData.original_price_inr = priceData.price;
      }
    }

    // Merge: prefer Gemini data for price (it reads the cover MRP directly),
    // prefer Google Books for description and cover image
    const originalPrice =
      geminiData?.original_price_inr ??   // MRP from cover (most accurate)
      bookMetadata?.original_price ??      // Google Books real price
      null;                                // never estimate — leave null

    const priceSource =
      geminiData?.original_price_inr
        ? 'cover_price'
        : bookMetadata?.price_source ?? null;

    // Build final metadata — Gemini fields take priority over Google Books
    const finalMetadata = bookMetadata
      ? {
          ...bookMetadata,
          title: geminiData?.title || bookMetadata.title,
          author: geminiData?.author || bookMetadata.author,
          publisher: geminiData?.publisher || bookMetadata.publisher,
          edition: geminiData?.edition || bookMetadata.edition,
          publication_year: geminiData?.publication_year || bookMetadata.publication_year,
          subject: geminiData?.subject || bookMetadata.subject,
          original_price: originalPrice,
          price_source: priceSource,
        }
      : geminiData
      ? {
          isbn: detectedISBN,
          title: geminiData.title,
          author: geminiData.author,
          publisher: geminiData.publisher,
          edition: geminiData.edition,
          publication_year: geminiData.publication_year,
          subject: geminiData.subject,
          cover_image: null,
          description: null,
          original_price: originalPrice,
          price_source: priceSource,
        }
      : null;

    try {
      await (supabase as any).from('ai_scans').update({
        detected_isbn: detectedISBN,
        fetched_metadata: finalMetadata,
        condition_analysis: conditionAnalysis,
        scan_status: 'completed',
        progress_percentage: 100,
        completed_at: new Date().toISOString(),
      }).eq('id', scan_id);
    } catch { /* non-fatal */ }

    return NextResponse.json({
      success: true,
      result: {
        scan_id,
        detected_isbn: detectedISBN,
        book_metadata: finalMetadata,
        condition_analysis: conditionAnalysis,
        original_price: originalPrice,
        price_source: priceSource,
        // Official cover image from internet (used as catalogue image)
        official_cover_image: finalMetadata?.cover_image ?? null,
        status: 'completed',
      },
    });
  } catch (err: any) {
    // Update ai_scans record with failure details (Req 8.3)
    try {
      await (supabase as any).from('ai_scans').update({
        scan_status: 'failed',
        error_message: err?.message || 'Unknown error',
        completed_at: new Date().toISOString(),
      }).eq('id', scan_id);
    } catch { /* non-fatal */ }

    return NextResponse.json(
      { error: err?.message || 'Scan failed' },
      { status: 500 },
    );
  }
}
