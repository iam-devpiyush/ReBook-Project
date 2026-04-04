export const dynamic = 'force-dynamic';
/**
 * Image Upload API Route
 * 
 * Handles multipart/form-data image uploads for book listings.
 * 
 * Requirements:
 * - 2.4: Images must be uploaded to Supabase Storage
 * - 17.4: Image file type must be JPEG or PNG
 * - 17.5: Image file size must not exceed 5MB
 * - 21.2: Generate unique file names with UUIDs
 * - 21.6: Strip EXIF data for privacy
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/middleware';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Constants
// ============================================================================

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes (Requirement 17.5)
const STORAGE_BUCKET = 'book-images';

// Image sizes for generation (Requirement 21.2)
const IMAGE_SIZES = {
  thumbnail: { width: 200, height: 200 },
  medium: { width: 600, height: 600 },
  full: { width: 1200, height: 1200 },
} as const;

// ============================================================================
// Type Definitions
// ============================================================================

interface UploadedImage {
  imageType: string;
  sizes: {
    thumbnail: string;
    medium: string;
    full: string;
  };
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate image file
 * 
 * Requirements:
 * - 17.4: Image file type must be JPEG or PNG
 * - 17.5: Image file size must not exceed 5MB
 */
function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type (Requirement 17.4)
  if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG and PNG images are allowed.'
    };
  }

  // Check file size (Requirement 17.5)
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 5MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`
    };
  }

  return { valid: true };
}

// ============================================================================
// Image Processing Functions
// ============================================================================

/**
 * Strip EXIF data from image for privacy
 * 
 * Requirement 21.6: Strip EXIF data for privacy
 * 
 * @param buffer - Image buffer
 * @returns Buffer with EXIF data removed
 */
async function stripExifData(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer)
    .rotate() // Auto-rotate based on EXIF orientation
    .withMetadata({ exif: {} }) // Remove EXIF data
    .toBuffer();
}

/**
 * Generate multiple image sizes
 * 
 * Requirement 21.2: Generate multiple sizes (thumbnail, medium, full)
 * 
 * @param buffer - Original image buffer
 * @returns Object with buffers for each size
 */
async function generateImageSizes(buffer: Buffer): Promise<{
  thumbnail: Buffer;
  medium: Buffer;
  full: Buffer;
}> {
  const [thumbnail, medium, full] = await Promise.all([
    sharp(buffer)
      .resize(IMAGE_SIZES.thumbnail.width, IMAGE_SIZES.thumbnail.height, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 85 })
      .toBuffer(),
    
    sharp(buffer)
      .resize(IMAGE_SIZES.medium.width, IMAGE_SIZES.medium.height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 90 })
      .toBuffer(),
    
    sharp(buffer)
      .resize(IMAGE_SIZES.full.width, IMAGE_SIZES.full.height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 95 })
      .toBuffer()
  ]);

  return { thumbnail, medium, full };
}

// ============================================================================
// Upload Functions
// ============================================================================

/**
 * Upload image with multiple sizes to Supabase Storage
 * 
 * Requirements:
 * - 2.4: Upload to Supabase Storage
 * - 21.2: Generate unique file names with UUIDs
 * - 21.6: Strip EXIF data
 * 
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param listingId - Listing ID
 * @param imageType - Type of image
 * @param buffer - Image buffer
 * @param extension - File extension
 * @returns Object with public URLs for each size
 */
async function uploadImageSizes(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  listingId: string,
  imageType: string,
  buffer: Buffer,
  extension: string
): Promise<{ thumbnail: string; medium: string; full: string }> {
  // Generate unique ID for this image (Requirement 21.2)
  const uniqueId = uuidv4().split('-')[0];
  
  // Strip EXIF data (Requirement 21.6)
  const cleanBuffer = await stripExifData(buffer);
  
  // Generate multiple sizes (Requirement 21.2)
  const sizes = await generateImageSizes(cleanBuffer);
  
  // Upload each size
  const uploadPromises = Object.entries(sizes).map(async ([size, sizeBuffer]) => {
    const filePath = `${userId}/${listingId}/${imageType}_${size}_${uniqueId}.${extension}`;
    
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, sizeBuffer, {
        contentType: `image/${extension}`,
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      throw new Error(`Failed to upload ${size} size: ${error.message}`);
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);
    
    return { size, publicUrl };
  });
  
  const results = await Promise.all(uploadPromises);
  
  // Convert array to object
  const urls = results.reduce((acc, { size, publicUrl }) => {
    acc[size as keyof typeof sizes] = publicUrl;
    return acc;
  }, {} as { thumbnail: string; medium: string; full: string });
  
  return urls;
}

// ============================================================================
// API Route Handler
// ============================================================================

/**
 * POST /api/listings/images
 * 
 * Upload book images with multiple sizes
 * 
 * Requirements:
 * - 2.4: Upload to Supabase Storage
 * - 17.4: Validate image file type (JPEG or PNG)
 * - 17.5: Validate image file size (max 5MB)
 * - 21.2: Generate multiple sizes and unique file names
 * - 21.6: Strip EXIF data
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const { user } = authResult;
    
    // Parse multipart/form-data
    const formData = await request.formData();
    const listingId = formData.get('listingId') as string;
    
    if (!listingId) {
      return NextResponse.json(
        { error: 'listingId is required' },
        { status: 400 }
      );
    }
    
    // Get all image files from form data
    const imageFiles: Array<{ imageType: string; file: File }> = [];
    
    for (const [key, value] of formData.entries()) {
      if (value instanceof File && key !== 'listingId') {
        imageFiles.push({
          imageType: key,
          file: value
        });
      }
    }
    
    if (imageFiles.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      );
    }
    
    // Validate all files
    for (const { imageType, file } of imageFiles) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        return NextResponse.json(
          { error: `${imageType}: ${validation.error}` },
          { status: 400 }
        );
      }
    }
    
    // Create Supabase client
    const supabase = createServerClient();
    
    // Upload all images
    const uploadedImages: UploadedImage[] = [];
    
    for (const { imageType, file } of imageFiles) {
      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Get file extension
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      
      // Upload with multiple sizes
      const urls = await uploadImageSizes(
        supabase,
        user.id,
        listingId,
        imageType,
        buffer,
        extension
      );
      
      uploadedImages.push({
        imageType,
        sizes: urls
      });
    }
    
    return NextResponse.json({
      success: true,
      images: uploadedImages
    });
    
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload images',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
