/**
 * Image Upload Utilities for Supabase Storage
 * 
 * Provides functions for uploading, validating, and managing book images.
 * 
 * Requirements:
 * - 2.4: Images must be uploaded to Supabase Storage
 * - 17.4: Image file type must be JPEG or PNG
 * - 17.5: Image file size must not exceed 5MB
 * - 21.1-21.7: Image storage and optimization requirements
 */

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

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

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes (Requirement 17.5)
const STORAGE_BUCKET = 'book-images';

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate image file before upload
 * 
 * Validates:
 * - File type (JPEG or PNG) - Requirement 17.4
 * - File size (max 5MB) - Requirement 17.5
 * 
 * @param file - File to validate
 * @returns Validation result with error message if invalid
 */
export function validateImageFile(file: File): ValidationResult {
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

/**
 * Validate multiple image files
 * 
 * @param files - Array of files to validate
 * @returns Array of validation results
 */
export function validateImageFiles(files: File[]): ValidationResult[] {
  return files.map(file => validateImageFile(file));
}

// ============================================================================
// File Path Generation
// ============================================================================

/**
 * Generate unique file path for storage
 * 
 * Path structure: {userId}/{listingId}/{imageType}_{uuid}.{ext}
 * Example: 550e8400-e29b-41d4-a716-446655440000/listing-123/front_cover_a1b2c3d4.jpg
 * 
 * Uses UUID instead of timestamp for better uniqueness (Requirement 21.1)
 * 
 * @param userId - User ID
 * @param listingId - Listing ID
 * @param imageType - Type of image
 * @param fileName - Original file name
 * @returns Generated file path
 */
export function generateFilePath(
  userId: string,
  listingId: string,
  imageType: ImageType,
  fileName: string
): string {
  const uniqueId = uuidv4().split('-')[0]; // Use first segment of UUID
  const extension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
  return `${userId}/${listingId}/${imageType}_${uniqueId}.${extension}`;
}

/**
 * Generate file paths for multiple images
 * 
 * @param userId - User ID
 * @param listingId - Listing ID
 * @param images - Array of image metadata
 * @returns Array of generated file paths
 */
export function generateFilePaths(
  userId: string,
  listingId: string,
  images: Array<{ imageType: ImageType; fileName: string }>
): string[] {
  return images.map(img => generateFilePath(userId, listingId, img.imageType, img.fileName));
}

// ============================================================================
// Upload Functions
// ============================================================================

/**
 * Upload a single book image to Supabase Storage
 * 
 * Requirements:
 * - 2.4: Upload to Supabase Storage
 * - 21.2: Generate unique file names with UUIDs
 * - 21.6: Strip EXIF data for privacy (handled by API route)
 * 
 * @param supabase - Supabase client instance
 * @param metadata - Image metadata including file
 * @returns Upload result with public URL or error
 */
export async function uploadBookImage(
  supabase: ReturnType<typeof createClient>,
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

    // Generate unique file path
    const filePath = generateFilePath(
      metadata.userId,
      metadata.listingId,
      metadata.imageType,
      metadata.file.name
    );

    // Upload to Supabase Storage (Requirement 2.4)
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
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

    // Get public URL (Requirement 21.3)
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return {
      success: true,
      filePath: data.path,
      publicUrl
    };

  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Upload multiple book images
 * 
 * @param supabase - Supabase client instance
 * @param images - Array of image metadata
 * @returns Array of upload results
 */
export async function uploadMultipleImages(
  supabase: ReturnType<typeof createClient>,
  images: ImageMetadata[]
): Promise<UploadResult[]> {
  const uploadPromises = images.map(image => uploadBookImage(supabase, image));
  return Promise.all(uploadPromises);
}

// ============================================================================
// Retrieval Functions
// ============================================================================

/**
 * Get public URL for an image
 * 
 * @param supabase - Supabase client instance
 * @param filePath - File path in storage
 * @returns Public URL
 */
export function getImageUrl(
  supabase: ReturnType<typeof createClient>,
  filePath: string
): string {
  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

/**
 * List all images for a listing
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID
 * @param listingId - Listing ID
 * @returns Array of file paths
 */
export async function listListingImages(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  listingId: string
): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
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
 * 
 * @param supabase - Supabase client instance
 * @param filePath - File path to delete
 * @returns True if successful, false otherwise
 */
export async function deleteBookImage(
  supabase: ReturnType<typeof createClient>,
  filePath: string
): Promise<boolean> {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([filePath]);

  if (error) {
    console.error('Failed to delete image:', error);
    return false;
  }

  return true;
}

/**
 * Delete all images for a listing
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID
 * @param listingId - Listing ID
 * @returns True if successful, false otherwise
 */
export async function deleteListingImages(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  listingId: string
): Promise<boolean> {
  // List all images first
  const images = await listListingImages(supabase, userId, listingId);
  
  if (images.length === 0) {
    return true;
  }

  // Delete all images
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove(images);

  if (error) {
    console.error('Failed to delete listing images:', error);
    return false;
  }

  return true;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if user owns the image (based on file path)
 * 
 * @param userId - User ID
 * @param filePath - File path to check
 * @returns True if user owns the image
 */
export function userOwnsImage(userId: string, filePath: string): boolean {
  return filePath.startsWith(`${userId}/`);
}

/**
 * Extract metadata from file path
 * 
 * @param filePath - File path to parse
 * @returns Parsed metadata or null if invalid
 */
export function parseFilePath(filePath: string): {
  userId: string;
  listingId: string;
  imageType: string;
  uniqueId: string;
} | null {
  const parts = filePath.split('/');
  if (parts.length !== 3) return null;

  const [userId, listingId, fileName] = parts;
  
  // Match pattern: {imageType}_{uniqueId}.{ext}
  // imageType can contain underscores (e.g., front_cover, back_cover)
  const match = fileName.match(/^(.+)_([a-f0-9]+)\.(jpg|jpeg|png)$/);
  if (!match) return null;

  const imageType = match[1];
  const uniqueId = match[2];

  return { userId, listingId, imageType, uniqueId };
}
