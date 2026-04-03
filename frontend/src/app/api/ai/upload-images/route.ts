/**
 * POST /api/ai/upload-images
 *
 * Accepts data URLs for each book image, strips EXIF metadata,
 * uploads to Supabase Storage, and returns public URLs.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 9.1, 9.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { uploadScanImage } from '@/lib/ai-scanner/storage';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function parseMimeFromDataUrl(dataUrl: string): string | null {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  return match ? match[1] : null;
}

function getBase64SizeBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? '';
  const padding = (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
  return Math.floor((base64.length * 3) / 4) - padding;
}

function validateDataUrl(dataUrl: string, imageType: string): string | null {
  const mimeType = parseMimeFromDataUrl(dataUrl);
  if (!mimeType) {
    return `${imageType}: invalid data URL format — could not determine MIME type`;
  }
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return `${imageType}: unsupported image type "${mimeType}". Only JPEG, PNG, and WebP are accepted.`;
  }
  const sizeBytes = getBase64SizeBytes(dataUrl);
  if (sizeBytes > MAX_SIZE_BYTES) {
    return `${imageType}: image exceeds the 5 MB size limit (${(sizeBytes / 1024 / 1024).toFixed(2)} MB).`;
  }
  return null;
}

interface UploadRequest {
  scan_id: string;
  images: {
    front_cover: string;
    back_cover: string;
    spine: string;
    pages: string;
  };
}

const IMAGE_TYPES = ['front_cover', 'back_cover', 'spine', 'pages'] as const;

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) return authResult.response;

  const userId = authResult.user.id;

  let body: UploadRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { scan_id, images } = body ?? {};
  if (!scan_id || !images) {
    return NextResponse.json({ error: 'scan_id and images are required' }, { status: 400 });
  }

  const publicUrls: Record<string, string> = {};
  const errors: Record<string, string> = {};

  // Validate each image type/size before uploading (Requirements 1.1, 1.2, 1.5)
  for (const imageType of IMAGE_TYPES) {
    const dataUrl = images[imageType];
    if (!dataUrl) {
      errors[imageType] = `${imageType}: missing image`;
      continue;
    }
    const validationError = validateDataUrl(dataUrl, imageType);
    if (validationError) {
      errors[imageType] = validationError;
    }
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { error: 'One or more images failed validation', details: errors },
      { status: 400 }
    );
  }

  // Upload each image, collecting errors per image type (Requirement 1.5)
  await Promise.all(
    IMAGE_TYPES.map(async (imageType) => {
      const dataUrl = images[imageType];
      if (!dataUrl) {
        errors[imageType] = 'Missing image';
        return;
      }
      try {
        const result = await uploadScanImage(dataUrl, userId, scan_id, imageType);
        publicUrls[imageType] = result.publicUrl;
      } catch (err: any) {
        errors[imageType] = err.message || `Upload failed for ${imageType}`;
      }
    })
  );

  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { error: 'One or more images failed to upload', details: errors },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, public_urls: publicUrls });
}
