import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/middleware';
import { fetchBookMetadata, type BookMetadata } from '@/lib/ai-scanner/metadata-fetcher';
import { analyzeBookCondition, type ConditionAnalysis } from '@/lib/ai-scanner/condition-analyzer';

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
  cover_damage: 3,
  page_quality: 3,
  binding_quality: 3,
  markings: 3,
  discoloration: 3,
  overall_score: 3,
  confidence: 0.5,
  notes: 'Condition estimated as average.',
};

export async function POST(request: NextRequest) {
  // Auth check
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

  const supabase = createServerClient();

  // Create scan record — non-fatal if it fails
  try {
    await supabase.from('ai_scans').insert({
      id: scan_id,
      images: [images.front_cover, images.back_cover, images.spine, images.pages],
      scan_status: 'in_progress',
      progress_percentage: 0,
    });
  } catch (e) {
    console.warn('Could not create ai_scans record:', e);
  }

  // Run condition analysis — always succeeds (has internal fallback)
  let conditionAnalysis: ConditionAnalysis = DEFAULT_CONDITION;
  try {
    conditionAnalysis = await analyzeBookCondition(images);
  } catch (e) {
    console.warn('Condition analysis failed, using defaults:', e);
  }

  // Try to detect ISBN from image URL filenames (lightweight)
  let detectedISBN: string | null = null;
  const urlText = `${images.front_cover} ${images.back_cover}`;
  const isbn13Match = urlText.match(/(?:978|979)\d{10}/);
  if (isbn13Match) detectedISBN = isbn13Match[0];

  // Fetch metadata if ISBN found
  let bookMetadata: BookMetadata | null = null;
  if (detectedISBN) {
    try {
      bookMetadata = await fetchBookMetadata(detectedISBN);
    } catch (e) {
      console.warn('Metadata fetch failed:', e);
    }
  }

  // Save result — non-fatal if it fails
  try {
    await supabase.from('ai_scans').update({
      detected_isbn: detectedISBN,
      fetched_metadata: bookMetadata,
      condition_analysis: conditionAnalysis,
      scan_status: 'completed',
      progress_percentage: 100,
      completed_at: new Date().toISOString(),
    }).eq('id', scan_id);
  } catch (e) {
    console.warn('Could not update ai_scans record:', e);
  }

  return NextResponse.json({
    success: true,
    result: {
      scan_id,
      detected_isbn: detectedISBN,
      book_metadata: bookMetadata,
      condition_analysis: conditionAnalysis,
      status: 'completed',
    },
  });
}
