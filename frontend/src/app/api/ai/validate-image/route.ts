export const dynamic = 'force-dynamic';
/**
 * POST /api/ai/validate-image
 *
 * Validates an uploaded book image:
 * 1. Checks MIME type (JPEG/PNG/WebP only) and size (≤5MB)
 * 2. Uses Gemini Vision to verify the image matches the expected step
 *    (front_cover, back_cover, spine, pages)
 *
 * Returns { valid: boolean, reason: string, api_unavailable?: boolean }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { validateBookImage } from '@/lib/ai-scanner/gemini';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function parseMimeFromDataUrl(dataUrl: string): string | null {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  return match ? match[1] : null;
}

function getBase64SizeBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? '';
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) return authResult.response;

  let body: { image_url?: string; image_type?: string; dataUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Support both calling conventions:
  // - BookImageUploader sends { image_url: dataUrl, image_type }
  // - Direct calls may send { dataUrl }
  const imageUrl = body.image_url ?? body.dataUrl;
  const imageType = body.image_type ?? 'front_cover';

  if (!imageUrl) {
    return NextResponse.json({ error: 'image_url is required' }, { status: 400 });
  }

  // ── Step 1: Fast MIME + size check ──────────────────────────────────────────
  if (imageUrl.startsWith('data:')) {
    const mimeType = parseMimeFromDataUrl(imageUrl);
    if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json({
        valid: false,
        reason: `Unsupported file type. Please upload a JPEG, PNG, or WebP image.`,
      });
    }
    const sizeBytes = getBase64SizeBytes(imageUrl);
    if (sizeBytes > MAX_SIZE_BYTES) {
      return NextResponse.json({
        valid: false,
        reason: `Image is too large (${(sizeBytes / 1024 / 1024).toFixed(1)} MB). Maximum size is 5 MB.`,
      });
    }
  }

  // ── Step 2: Gemini Vision content validation ─────────────────────────────────
  const result = await validateBookImage(imageUrl, imageType);

  return NextResponse.json({
    valid: result.valid,
    reason: result.reason,
    api_unavailable: result.api_unavailable ?? false,
  });
}
