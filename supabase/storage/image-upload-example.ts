/**
 * Image Upload Utility Example for Supabase Storage
 * 
 * This file provides example code for uploading, retrieving, and managing
 * book images in the Supabase Storage book-images bucket.
 * 
 * Usage: Copy these functions to your actual implementation files
 * (e.g., frontend/src/lib/storage.ts or backend API routes)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================================================
// Type Definitions
// ============================================================================

export type ImageType = 'front_cover' | 'back_cover' | 'spine' | 'pages' | 'detail';

export interface UploadResult {
  success: boolean;
  filePath?: string;
  publicUrl?: string;
  error?: string;
}

export interface ImageMetadata {
  userId: string;
  listingId: string;
  imageType: ImageType;
  file: File;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG and PNG images are allowed.'
    };
  }

  // Check file size (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds 5MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`
    };
  }

  return { valid: true };
}

/**
 * Generate file path for storage
 */
export function generateFilePath(
  userId: string,
  listingId: string,
  imageType: ImageType,
  fileName: string
): string {
  const timestamp = Date.now();
  const extension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
  return `${userId}/${listingId}/${imageType}_${timestamp}.${extension}`;
}

// ============================================================================
// Upload Functions
// ============================================================================

/**
 * Upload a single book image to Supabase Storage
 */
export async function uploadBookImage(
  metadata: ImageMetadata
): Promise<UploadResult> {
  try {
    // Validate file
    const validation = validateImageFile(metadata.file);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Generate file path
    const filePath = generateFilePath(
      metadata.userId,
      metadata.listingId,
      metadata.imageType,
      metadata.file.name
    );

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('book-images')
      .upload(filePath, metadata.file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      return {
        success: false,
        error: `Upload failed: ${error.message}`
      };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('book-images')
      .getPublicUrl(filePath);

    return {
      success: true,
      filePath: data.path,
      publicUrl
    };

  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error}`
    };
  }
}

/**
 * Upload multiple book images
 */
export async function uploadMultipleImages(
  images: ImageMetadata[]
): Promise<UploadResult[]> {
  const uploadPromises = images.map(image => uploadBookImage(image));
  return Promise.all(uploadPromises);
}

// ============================================================================
// Retrieval Functions
// ============================================================================

/**
 * Get public URL for an image
 */
export function getImageUrl(filePath: string): string {
  const { data } = supabase.storage
    .from('book-images')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

/**
 * Get signed URL for an image (with expiration)
 */
export async function getSignedImageUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('book-images')
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    console.error('Failed to create signed URL:', error);
    return null;
  }

  return data.signedUrl;
}

/**
 * List all images for a listing
 */
export async function listListingImages(
  userId: string,
  listingId: string
): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from('book-images')
    .list(`${userId}/${listingId}`, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'asc' }
    });

  if (error) {
    console.error('Failed to list images:', error);
    return [];
  }

  return data.map(file => `${userId}/${listingId}/${file.name}`);
}

// ============================================================================
// Delete Functions
// ============================================================================

/**
 * Delete a single image
 */
export async function deleteBookImage(filePath: string): Promise<boolean> {
  const { error } = await supabase.storage
    .from('book-images')
    .remove([filePath]);

  if (error) {
    console.error('Failed to delete image:', error);
    return false;
  }

  return true;
}

/**
 * Delete all images for a listing
 */
export async function deleteListingImages(
  userId: string,
  listingId: string
): Promise<boolean> {
  // List all images first
  const images = await listListingImages(userId, listingId);
  
  if (images.length === 0) {
    return true;
  }

  // Delete all images
  const { error } = await supabase.storage
    .from('book-images')
    .remove(images);

  if (error) {
    console.error('Failed to delete listing images:', error);
    return false;
  }

  return true;
}

// ============================================================================
// Update Functions
// ============================================================================

/**
 * Replace an existing image
 */
export async function replaceBookImage(
  filePath: string,
  newFile: File
): Promise<UploadResult> {
  try {
    // Validate new file
    const validation = validateImageFile(newFile);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Upload with upsert=true to replace
    const { data, error } = await supabase.storage
      .from('book-images')
      .upload(filePath, newFile, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      return {
        success: false,
        error: `Replace failed: ${error.message}`
      };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('book-images')
      .getPublicUrl(filePath);

    return {
      success: true,
      filePath: data.path,
      publicUrl
    };

  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error}`
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if user owns the image (based on file path)
 */
export function userOwnsImage(userId: string, filePath: string): boolean {
  return filePath.startsWith(`${userId}/`);
}

/**
 * Extract metadata from file path
 */
export function parseFilePath(filePath: string): {
  userId: string;
  listingId: string;
  imageType: string;
  timestamp: number;
} | null {
  const parts = filePath.split('/');
  if (parts.length !== 3) return null;

  const [userId, listingId, fileName] = parts;
  const fileNameParts = fileName.split('_');
  if (fileNameParts.length < 2) return null;

  const imageType = fileNameParts[0];
  const timestampStr = fileNameParts[1].split('.')[0];
  const timestamp = parseInt(timestampStr, 10);

  return { userId, listingId, imageType, timestamp };
}

// ============================================================================
// Example Usage
// ============================================================================

/*
// Example 1: Upload a single image
const result = await uploadBookImage({
  userId: 'user-123',
  listingId: 'listing-456',
  imageType: 'front_cover',
  file: imageFile
});

if (result.success) {
  console.log('Image uploaded:', result.publicUrl);
} else {
  console.error('Upload failed:', result.error);
}

// Example 2: Upload multiple images
const images = [
  { userId: 'user-123', listingId: 'listing-456', imageType: 'front_cover', file: frontCover },
  { userId: 'user-123', listingId: 'listing-456', imageType: 'back_cover', file: backCover },
  { userId: 'user-123', listingId: 'listing-456', imageType: 'spine', file: spine },
  { userId: 'user-123', listingId: 'listing-456', imageType: 'pages', file: pages }
];

const results = await uploadMultipleImages(images);
const allSuccess = results.every(r => r.success);

// Example 3: Get image URL
const imageUrl = getImageUrl('user-123/listing-456/front_cover_1704067200000.jpg');

// Example 4: List all images for a listing
const listingImages = await listListingImages('user-123', 'listing-456');

// Example 5: Delete a listing's images
const deleted = await deleteListingImages('user-123', 'listing-456');
*/
