/**
 * Image Upload Service — Supabase Storage
 *
 * Accepts a data URL, strips EXIF metadata using sharp (Requirement 9.5),
 * and uploads the image to Supabase Storage at:
 *   scans/{user_id}/{scan_id}/{image_type}.jpg
 *
 * Returns the public URL of the uploaded image (Requirements 1.3, 1.4, 9.1).
 */

import { createClient } from '@supabase/supabase-js';

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'book-images';

/** Service-role client so uploads bypass RLS */
function createStorageClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Convert a data URL to a Buffer and strip EXIF metadata using sharp.
 * Returns a JPEG Buffer with EXIF removed.
 */
async function dataUrlToStrippedBuffer(dataUrl: string): Promise<Buffer> {
  const base64 = dataUrl.split(',')[1];
  if (!base64) throw new Error('Invalid data URL: missing base64 payload');

  const inputBuffer = Buffer.from(base64, 'base64');

  // sharp strips all metadata by default when re-encoding
  const sharp = (await import('sharp')).default;
  const outputBuffer = await sharp(inputBuffer)
    .jpeg({ quality: 85 })
    // withMetadata() is NOT called — this ensures EXIF is stripped (Req 9.5)
    .toBuffer();

  return outputBuffer;
}

export interface UploadImageResult {
  publicUrl: string;
  path: string;
}

/**
 * Upload a single image to Supabase Storage.
 *
 * @param dataUrl   - The image as a data URL (from the browser)
 * @param userId    - Authenticated seller's user ID (scopes the path, Req 9.1)
 * @param scanId    - UUID for this scan session (Req 1.3)
 * @param imageType - One of: front_cover | back_cover | spine | pages
 */
export async function uploadScanImage(
  dataUrl: string,
  userId: string,
  scanId: string,
  imageType: string
): Promise<UploadImageResult> {
  const buffer = await dataUrlToStrippedBuffer(dataUrl);
  const path = `scans/${userId}/${scanId}/${imageType}.jpg`;

  const supabase = createStorageClient();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload ${imageType}: ${error.message}`);
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return { publicUrl: urlData.publicUrl, path };
}
