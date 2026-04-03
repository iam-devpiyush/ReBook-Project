# Requirements Document: Image-Based Book Detail Extraction

## Introduction

This feature enables sellers on the Second-Hand Academic Book Marketplace to photograph their books and have the system automatically extract structured book details (title, author, ISBN, condition, etc.) from those images using AI vision and OCR. The extracted data pre-fills the listing creation form, reducing manual data entry and improving listing accuracy.

The existing codebase already has scaffolding for an AI scanner (Tasks 13 and 14): ISBN detection via Tesseract.js OCR, metadata fetching from Google Books / Open Library, a condition analyzer, a `/api/ai/scan` endpoint, and frontend components (`EnhancedAIScannerComponent`, `CameraCapture`, `QRCodeGenerator`). However, the end-to-end flow — from image capture through extraction to form pre-fill — is not yet wired together and working in production. This spec covers making that full pipeline functional and reliable.

## Glossary

- **System**: The Second-Hand Academic Book Marketplace platform (Next.js frontend + Supabase backend)
- **Seller**: An authenticated user who creates book listings
- **Image_Upload_Service**: The service responsible for accepting image files from the seller, validating them, and storing them in Supabase Storage
- **AI_Scan_Service**: The backend service (Next.js API route `/api/ai/scan`) that orchestrates ISBN detection, metadata fetching, and condition analysis for a set of uploaded images
- **ISBN_Detector**: The OCR-based component (Tesseract.js) that extracts ISBN strings from book cover images
- **Metadata_Fetcher**: The component that queries Google Books API (primary) and Open Library API (fallback) to retrieve structured book data for a given ISBN
- **Condition_Analyzer**: The component that evaluates uploaded images and assigns condition scores (1–5) for cover damage, page quality, binding quality, markings, and discoloration
- **Listing_Form**: The frontend form used by sellers to create or edit a book listing
- **Scan_Session**: A single end-to-end scanning attempt, identified by a UUID, covering image upload through result delivery
- **Extracted_Book_Data**: The structured output of a Scan_Session: title, author, ISBN, publisher, edition, publication year, and condition score
- **Condition_Score**: An integer from 1 to 5 representing overall book condition (5 = Like New, 1 = Poor)
- **Supabase_Realtime**: The Supabase service used to broadcast Scan_Session progress updates to the frontend
- **Supabase_Storage**: The Supabase file storage service where uploaded book images are persisted
- **Pretty_Printer**: A formatting component that serializes Extracted_Book_Data back into a canonical JSON representation

## Requirements

### Requirement 1: Image Upload

**User Story:** As a seller, I want to upload photos of my book (front cover, back cover, spine, and pages), so that the system has the visual data it needs to extract book details automatically.

#### Acceptance Criteria

1. WHEN a seller submits images for a Scan_Session, THE Image_Upload_Service SHALL accept JPEG and PNG files only
2. WHEN a seller submits an image file, THE Image_Upload_Service SHALL reject files exceeding 5 MB and return a descriptive error message
3. WHEN valid images are submitted, THE Image_Upload_Service SHALL store each image in Supabase_Storage under a path scoped to the authenticated seller's user ID and the Scan_Session ID
4. WHEN all images are stored, THE Image_Upload_Service SHALL return a set of public URLs for the uploaded images
5. WHEN an image upload fails, THE Image_Upload_Service SHALL return an error message identifying which image failed and the reason
6. THE Image_Upload_Service SHALL require the seller to provide at least a front cover image before a Scan_Session can proceed
7. WHEN a seller provides all four image types (front cover, back cover, spine, pages), THE Image_Upload_Service SHALL associate each URL with its corresponding image type in the Scan_Session record

### Requirement 2: ISBN Detection from Images

**User Story:** As a seller, I want the system to automatically detect the ISBN from my book's cover or back cover photo, so that I don't have to type it in manually.

#### Acceptance Criteria

1. WHEN a Scan_Session begins, THE ISBN_Detector SHALL attempt to extract an ISBN string from the front cover and back cover images
2. WHEN the ISBN_Detector processes an image, THE ISBN_Detector SHALL recognize both ISBN-10 and ISBN-13 formats, with or without hyphens or spaces
3. WHEN the ISBN_Detector extracts a candidate string, THE ISBN_Detector SHALL validate the checksum before accepting it as a detected ISBN
4. WHEN a valid ISBN is detected, THE AI_Scan_Service SHALL record the detected ISBN in the Scan_Session record
5. IF no valid ISBN is detected from any provided image, THEN THE AI_Scan_Service SHALL set the detected ISBN to null and continue processing without failing the Scan_Session
6. THE Pretty_Printer SHALL serialize a detected ISBN into a canonical hyphen-free string representation
7. FOR ALL valid ISBN strings, parsing then printing then parsing SHALL produce an equivalent ISBN value (round-trip property)

### Requirement 3: Book Metadata Fetching

**User Story:** As a seller, I want the system to look up book details (title, author, publisher, etc.) using the detected ISBN, so that the listing form is pre-filled with accurate information.

#### Acceptance Criteria

1. WHEN a valid ISBN is detected, THE Metadata_Fetcher SHALL query the Google Books API for book details
2. IF the Google Books API returns no result for the ISBN, THEN THE Metadata_Fetcher SHALL query the Open Library API as a fallback
3. WHEN metadata is successfully retrieved, THE Metadata_Fetcher SHALL extract title, author, publisher, edition, publication year, and subject
4. WHEN metadata is retrieved, THE AI_Scan_Service SHALL store the fetched metadata in the Scan_Session record as a JSON object
5. IF both the Google Books API and the Open Library API fail to return results, THEN THE AI_Scan_Service SHALL set fetched metadata to null and continue without failing the Scan_Session
6. IF an external metadata API is unavailable or returns an error, THEN THE Metadata_Fetcher SHALL log the error and attempt the fallback API before returning null
7. WHEN the same ISBN is queried multiple times within a single deployment, THE Metadata_Fetcher SHALL return consistent field structure across all responses

### Requirement 4: Condition Analysis

**User Story:** As a seller, I want the system to assess my book's condition from the photos, so that I get an objective condition score without having to judge it myself.

#### Acceptance Criteria

1. WHEN images are provided for a Scan_Session, THE Condition_Analyzer SHALL evaluate cover damage, page quality, binding quality, markings, and discoloration
2. WHEN evaluating each condition factor, THE Condition_Analyzer SHALL assign a component score that is an integer between 1 and 5 inclusive
3. WHEN all component scores are calculated, THE Condition_Analyzer SHALL compute an overall Condition_Score using a weighted average: page_quality (30%), cover_damage (25%), binding_quality (20%), markings (15%), discoloration (10%)
4. WHEN the overall Condition_Score is computed, THE Condition_Analyzer SHALL round the result to the nearest integer between 1 and 5
5. THE Condition_Analyzer SHALL produce a non-empty human-readable notes string describing the assessed condition
6. WHEN the same set of images is analyzed more than once, THE Condition_Analyzer SHALL return the same component scores and overall Condition_Score (deterministic output)
7. WHEN condition analysis is complete, THE AI_Scan_Service SHALL store the full condition analysis (all component scores, overall score, confidence, notes) in the Scan_Session record

### Requirement 5: Scan Progress Reporting

**User Story:** As a seller, I want to see real-time progress while my images are being analyzed, so that I know the scan is working and how long it will take.

#### Acceptance Criteria

1. WHEN a Scan_Session is initiated, THE AI_Scan_Service SHALL publish a progress update of 0% to the Supabase_Realtime channel for that Scan_Session
2. WHEN ISBN detection completes, THE AI_Scan_Service SHALL publish a progress update of 25%
3. WHEN metadata fetching completes, THE AI_Scan_Service SHALL publish a progress update of 50%
4. WHEN condition analysis completes, THE AI_Scan_Service SHALL publish a progress update of 90%
5. WHEN the Scan_Session record is saved and results are ready, THE AI_Scan_Service SHALL publish a progress update of 100% and set scan_status to "completed"
6. IF any processing step fails unrecoverably, THEN THE AI_Scan_Service SHALL publish a progress update with scan_status "failed" and include an error message
7. WHEN a seller's frontend subscribes to a Scan_Session channel, THE Supabase_Realtime SHALL deliver progress updates to that subscriber within 1 second of publication

### Requirement 6: Listing Form Pre-fill

**User Story:** As a seller, I want the listing creation form to be automatically populated with the extracted book details after scanning, so that I can review and submit my listing quickly without retyping everything.

#### Acceptance Criteria

1. WHEN a Scan_Session reaches 100% with status "completed", THE Listing_Form SHALL automatically populate the title, author, ISBN, publisher, edition, and publication year fields with values from the Extracted_Book_Data
2. WHEN the Condition_Score is available from the Scan_Session, THE Listing_Form SHALL pre-select the corresponding condition option in the form
3. WHEN the Listing_Form is pre-filled, THE Listing_Form SHALL remain fully editable so the seller can correct or override any extracted value
4. WHEN a field in the Extracted_Book_Data is null or missing, THE Listing_Form SHALL leave the corresponding form field empty rather than inserting a placeholder or error string
5. WHEN the seller edits a pre-filled field, THE Listing_Form SHALL retain the seller's edited value and not overwrite it with scan results
6. WHEN a Scan_Session completes with null metadata (ISBN not found), THE Listing_Form SHALL remain empty and allow the seller to enter all details manually
7. WHEN a Scan_Session fails, THE Listing_Form SHALL display a user-facing error message and allow the seller to retry the scan or enter details manually

### Requirement 7: Manual Entry Fallback

**User Story:** As a seller, I want to be able to enter book details manually if the scan doesn't work, so that I can still create a listing even when image recognition fails.

#### Acceptance Criteria

1. WHEN a Scan_Session fails or produces no usable data, THE Listing_Form SHALL present all fields as empty and editable for manual entry
2. WHEN a seller chooses to skip scanning entirely, THE System SHALL allow the seller to proceed directly to the Listing_Form without initiating a Scan_Session
3. WHEN automatic ISBN detection fails, THE Listing_Form SHALL display a manual ISBN input field that the seller can fill in
4. WHEN a seller manually enters an ISBN in the Listing_Form, THE System SHALL validate the ISBN checksum and display an inline error if the format is invalid
5. WHEN a seller manually enters a valid ISBN in the Listing_Form, THE System SHALL offer to fetch metadata for that ISBN on demand and pre-fill the remaining fields if metadata is found
6. IF the on-demand metadata fetch fails, THEN THE System SHALL display an inline error and allow the seller to continue filling in fields manually

### Requirement 8: Scan Session Persistence

**User Story:** As a system administrator, I want all scan attempts and their results to be stored in the database, so that I can audit scan quality and debug failures.

#### Acceptance Criteria

1. WHEN a Scan_Session is initiated, THE AI_Scan_Service SHALL create a record in the ai_scans table with a unique UUID, the seller's user ID, the Scan_Session ID, image URLs, and scan_status "in_progress"
2. WHEN a Scan_Session completes successfully, THE AI_Scan_Service SHALL update the ai_scans record with detected_isbn, fetched_metadata, condition_analysis, scan_status "completed", progress_percentage 100, and a completed_at timestamp
3. WHEN a Scan_Session fails, THE AI_Scan_Service SHALL update the ai_scans record with scan_status "failed", the error_message, and a completed_at timestamp
4. WHEN a Scan_Session record is created, THE System SHALL enforce that progress_percentage is an integer between 0 and 100 inclusive
5. WHEN a Scan_Session record is created, THE System SHALL enforce that scan_status is one of: "in_progress", "completed", "failed"
6. THE System SHALL associate a completed Scan_Session with the resulting listing_id once the seller submits the listing form

### Requirement 9: Image and Scan Data Security

**User Story:** As a seller, I want my uploaded book images to be accessible only to me and authorized parties, so that my data is not exposed to other users.

#### Acceptance Criteria

1. WHEN a seller uploads images, THE Image_Upload_Service SHALL store them under a Supabase_Storage path that includes the seller's user ID, preventing path traversal to other sellers' images
2. WHEN a Scan_Session record is created, THE System SHALL apply Row Level Security policies so that only the owning seller and admins can read the record
3. WHEN an unauthenticated request is made to the image upload or scan endpoints, THE System SHALL return HTTP 401 Unauthorized
4. WHEN an authenticated seller requests a Scan_Session record that belongs to a different seller, THE System SHALL return HTTP 403 Forbidden
5. WHEN images are stored in Supabase_Storage, THE Image_Upload_Service SHALL strip EXIF metadata to prevent unintended location or device data exposure
