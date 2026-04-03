# Implementation Tasks: Image-Based Book Detail Extraction

## Overview

Most of the pipeline is already implemented. These tasks cover the remaining gaps: Supabase Storage upload for images, EXIF stripping, RLS policies, scan-to-listing linkage, and property-based tests.

## Tasks

- [x] 1. Upload images to Supabase Storage before scanning
  - In `CreateListingForm.handleImagesComplete`, upload each data URL to Supabase Storage before calling `/api/ai/scan`
  - Path: `scans/{user_id}/{scan_id}/{image_type}.jpg`
  - Strip EXIF metadata using `sharp` before upload (Requirement 9.5)
  - Return public URLs and pass them to `/api/ai/scan` instead of data URLs
  - Show upload progress in the scanning step UI
  - _Requirements: 1.3, 1.4, 9.1, 9.5_

- [x] 2. Add RLS policies for ai_scans table
  - Add Supabase migration to enable RLS on `ai_scans` table
  - Create policy: sellers can only SELECT/INSERT/UPDATE their own rows (`user_id = auth.uid()`)
  - Create policy: admins can SELECT all rows
  - Verify unauthenticated requests return HTTP 401 (already handled by `requireAuth`)
  - Verify cross-user access returns HTTP 403
  - _Requirements: 9.2, 9.3, 9.4_

- [x] 3. Link completed scan to listing after submission
  - In `CreateListingForm.handleSubmit`, after successful listing creation, update the `ai_scans` record with the returned `listing_id`
  - Add `scan_id` to the listing submission payload so the API can store the association
  - Update `/api/listings` POST route to accept optional `scan_id` and update `ai_scans.listing_id`
  - _Requirements: 8.6_

- [x] 4. Write property test for ISBN round-trip
  - Create `frontend/src/lib/ai-scanner/__tests__/isbn-round-trip.property.test.ts`
  - Generate random valid ISBN-10 and ISBN-13 strings with correct checksums
  - Property: `parse(print(parse(isbn))) === parse(isbn)` for all valid ISBNs
  - Use `fast-check` for property generation
  - _Requirements: 2.7_

- [x] 5. Write property test for condition score validity
  - Create `frontend/src/lib/ai-scanner/__tests__/condition-score.property.test.ts`
  - Generate random image metric inputs (brightness 0-255, variance 0-10000, yellowness 0-1)
  - Property 1: all component scores are integers in [1, 5]
  - Property 2: `overall_score = round(weighted_average)` and is in [1, 5]
  - Property 3: weighted average uses correct weights (page 30%, cover 25%, binding 20%, markings 15%, discolor 10%)
  - _Requirements: 4.2, 4.3, 4.4_

- [x] 6. Write property test for scan status and progress validity
  - Create `frontend/src/lib/ai-scanner/__tests__/scan-session.property.test.ts`
  - Property 1: `scan_status` is always one of `'in_progress' | 'completed' | 'failed'`
  - Property 2: `progress_percentage` is always an integer in [0, 100]
  - Mock the Supabase insert/update calls and verify the values passed
  - _Requirements: 8.4, 8.5_

- [x] 7. Handle scan failure gracefully in UI
  - In `CreateListingForm` Step 2, when scan fails, show error message with "Try Again" button
  - "Try Again" resets to Step 1 (image upload)
  - Ensure `ai_scans` record is updated with `scan_status: 'failed'` and `error_message` on any unhandled exception in `/api/ai/scan`
  - _Requirements: 5.6, 6.7, 7.1, 8.3_

- [x] 8. Validate image file type and size on server
  - In `/api/ai/validate-image`, reject non-JPEG/PNG/WebP content types with HTTP 400
  - In `/api/ai/scan`, validate that image URLs are accessible and not oversized
  - Return descriptive error messages identifying which image failed
  - _Requirements: 1.1, 1.2, 1.5_
