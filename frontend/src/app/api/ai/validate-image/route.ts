/**
 * POST /api/ai/validate-image
 *
 * Validates image file type and size.
 * Accepts { url: string } for remote URLs or { dataUrl: string } for data URLs.
 *
 * Requirements: 1.1, 1.2, 1.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function parseMimeFromDataUrl(dataUrl: string): string | null {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  return match ? match[1] : null;
}

function getBase64SizeBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? '';
  // Each base64 char represents 6 bits; 4 chars = 3 bytes
  const padding = (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
  return Math.floor((base64.length * 3) / 4) - padding;
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) return authResult.response;

  let body: { url?: string; dataUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url, dataUrl } = body ?? {};

  if (!url && !dataUrl) {
    return NextResponse.json({ error: 'url or dataUrl is required' }, { status: 400 });
  }

  // --- Validate data URL ---
  if (dataUrl) {
    const mimeType = parseMimeFromDataUrl(dataUrl);
    if (!mimeType) {
      return NextResponse.json(
        { error: 'Invalid data URL format — could not determine MIME type' },
        { status: 400 }
      );
    }
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported image type "${mimeType}". Only JPEG, PNG, and WebP are accepted.` },
        { status: 400 }
      );
    }
    const sizeBytes = getBase64SizeBytes(dataUrl);
    if (sizeBytes > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Image exceeds the 5 MB size limit (${(sizeBytes / 1024 / 1024).toFixed(2)} MB).` },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: true, mimeType, sizeBytes });
  }

  // --- Validate remote URL via HEAD request ---
  if (url) {
    let headResponse: Response;
    try {
      headResponse = await fetch(url, { method: 'HEAD' });
    } catch (err: any) {
      return NextResponse.json(
        { error: `Image URL is not accessible: ${err?.message ?? 'network error'}` },
        { status: 400 }
      );
    }

    if (!headResponse.ok) {
      return NextResponse.json(
        { error: `Image URL returned HTTP ${headResponse.status} — not accessible.` },
        { status: 400 }
      );
    }

    const contentType = headResponse.headers.get('content-type') ?? '';
    const mimeType = contentType.split(';')[0].trim();
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported image type "${mimeType}" at URL. Only JPEG, PNG, and WebP are accepted.` },
        { status: 400 }
      );
    }

    const contentLength = headResponse.headers.get('content-length');
    if (contentLength) {
      const sizeBytes = parseInt(contentLength, 10);
      if (sizeBytes > MAX_SIZE_BYTES) {
        return NextResponse.json(
          { error: `Image at URL exceeds the 5 MB size limit (${(sizeBytes / 1024 / 1024).toFixed(2)} MB).` },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ success: true, mimeType, url });
  }
}
