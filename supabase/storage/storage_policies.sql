-- ============================================================================
-- Supabase Storage Policies for book-images Bucket
-- ============================================================================
-- 
-- This file contains all Row Level Security (RLS) policies for the 
-- book-images storage bucket in Supabase Storage.
--
-- Bucket: book-images
-- Purpose: Store book images uploaded by sellers during listing creation
-- 
-- Policies:
-- 1. Public read access - Anyone can view images
-- 2. Authenticated upload - Only authenticated users can upload
-- 3. Owner update - Users can update their own images
-- 4. Owner delete - Users can delete their own images
--
-- ============================================================================

-- ============================================================================
-- Policy 1: Public Read Access
-- ============================================================================
-- Description: Allow anyone (authenticated or anonymous) to view book images
-- This enables buyers to see book images without authentication
-- ============================================================================

CREATE POLICY "Public read access for book images"
ON storage.objects FOR SELECT
USING (bucket_id = 'book-images');

-- ============================================================================
-- Policy 2: Authenticated Upload
-- ============================================================================
-- Description: Only authenticated users can upload images
-- Users can only upload to their own folder (user_id must match auth.uid())
-- This prevents unauthorized uploads and ensures proper file organization
-- ============================================================================

CREATE POLICY "Authenticated users can upload book images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'book-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- Policy 3: Owner Update
-- ============================================================================
-- Description: Users can only update images in their own folder
-- This allows sellers to replace images if needed
-- ============================================================================

CREATE POLICY "Users can update own book images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'book-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- Policy 4: Owner Delete
-- ============================================================================
-- Description: Users can only delete images in their own folder
-- This allows sellers to remove images from their listings
-- ============================================================================

CREATE POLICY "Users can delete own book images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'book-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these queries to verify policies are applied correctly
-- ============================================================================

-- Check if policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%book images%'
ORDER BY policyname;

-- Check bucket configuration
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'book-images';

-- ============================================================================
-- Notes
-- ============================================================================
-- 
-- 1. File Path Structure:
--    {user_id}/{listing_id}/{image_type}_{timestamp}.{ext}
--    Example: 550e8400-e29b-41d4-a716-446655440000/listing-123/front_cover_1704067200000.jpg
--
-- 2. Security Considerations:
--    - Users can only upload to folders matching their user ID
--    - Public read access allows anyone to view images (required for marketplace)
--    - Update/delete restricted to file owners
--    - File size limit enforced at bucket level (5MB)
--    - MIME type restrictions enforced at bucket level (image/jpeg, image/png)
--
-- 3. Performance:
--    - Policies use indexed columns (bucket_id, auth.uid())
--    - Public read access enables CDN caching
--    - No complex joins or subqueries
--
-- 4. Maintenance:
--    - Review policies quarterly
--    - Monitor storage usage and costs
--    - Implement cleanup for old/unused images
--    - Consider archival strategy for sold listings
--
-- ============================================================================
