# Design Document: Image-Based Book Detail Extraction

## Overview

This feature enables sellers to photograph their books and have the system automatically extract structured book details using Gemini Vision AI. The pipeline covers: guided image capture → AI validation → Gemini extraction → metadata enrichment → condition analysis → listing form pre-fill.

## Architecture

```
Seller Browser
    │
    ├─ BookImageUploader (step-by-step, 4 images)
    │       │ per image: POST /api/ai/validate-image
    │       │            ← Gemini Vision validates image type
    │
    ├─ CreateListingForm (orchestrates full flow)
    │       │ POST /api/ai/scan (all 4 images + scan_id)
    │       │
    │       └─ Scan Result → read-only display + manual fields
    │
    └─ POST /api/listings (submit listing)

Backend
    ├─ /api/ai/validate-image  → gemini.validateBookImage()
    ├─ /api/ai/scan
    │       ├─ gemini.extractBookDataFromImages()  [parallel]
    │       ├─ condition-analyzer.analyzeBookCondition()  [parallel]
    │       ├─ metadata-fetcher.fetchBookMetadata()  (if ISBN found)
    │       ├─ metadata-fetcher.fetchPriceViaGemini()  (price fallback)
    │       └─ Supabase: ai_scans table (insert → update)
    └─ /api/listings  → Supabase: listings + books tables
```

## Component Design

### BookImageUploader (`frontend/src/components/ai-scanner/BookImageUploader.tsx`)

Guided 4-step upload wizard. Each step:
1. Seller uploads image (JPEG/PNG/WebP, max 5 MB)
2. Client resizes to 800px max using Canvas API
3. Calls `POST /api/ai/validate-image` with resized data URL
4. Shows result: ✓ valid → Next enabled | ✗ invalid → reason shown, blocked

Steps: `front_cover` → `back_cover` → `spine` → `pages`

### CreateListingForm (`frontend/src/components/listings/CreateListingForm.tsx`)

4-step form:
- **Step 1**: BookImageUploader collects all 4 images as data URLs
- **Step 2**: Calls `POST /api/ai/scan`, shows spinner, then scan summary
- **Step 3**: Read-only AI results card + manual fields (category, description, location)
- **Step 4**: Pricing breakdown + submit

AI-extracted fields are read-only. User fills only: category, description (optional), city, state, pincode.

## API Contracts

### POST /api/ai/validate-image

**Request:**
```json
{ "image_url": "data:image/jpeg;base64,...", "image_type": "front_cover" }
```

**Response (valid):**
```json
{ "success": true, "valid": true, "reason": "Clear front cover photo" }
```

**Response (invalid):**
```json
{ "success": true, "valid": false, "reason": "This appears to be a back cover, not a front cover" }
```

**Response (API unavailable):**
```json
{ "success": true, "valid": false, "api_unavailable": true, "reason": "AI validation quota exceeded..." }
```

### POST /api/ai/scan

**Request:**
```json
{
  "scan_id": "uuid",
  "images": {
    "front_cover": "data:image/jpeg;base64,...",
    "back_cover": "data:image/jpeg;base64,...",
    "spine": "data:image/jpeg;base64,...",
    "pages": "data:image/jpeg;base64,..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "scan_id": "uuid",
    "detected_isbn": "9781259098635",
    "book_metadata": {
      "isbn": "9781259098635",
      "title": "Engineering Circuit Analysis",
      "author": "William H. Hayt",
      "publisher": "McGraw-Hill",
      "edition": "8th Edition",
      "publication_year": 2012,
      "subject": "Engineering",
      "cover_image": "https://books.google.com/...",
      "description": null,
      "original_price": 899,
      "price_source": "cover_price"
    },
    "condition_analysis": {
      "cover_damage": 4,
      "page_quality": 4,
      "binding_quality": 3,
      "markings": 4,
      "discoloration": 5,
      "overall_score": 4,
      "confidence": 0.7,
      "notes": "Cover in good condition. Pages clean and crisp."
    },
    "original_price": 899,
    "price_source": "cover_price",
    "official_cover_image": "https://books.google.com/...",
    "status": "completed"
  }
}
```

## Data Model

### ai_scans table

```sql
CREATE TABLE ai_scans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  images          TEXT[] NOT NULL,           -- [front_cover, back_cover, spine, pages]
  scan_status     TEXT NOT NULL DEFAULT 'in_progress'
                  CHECK (scan_status IN ('in_progress', 'completed', 'failed')),
  progress_percentage INTEGER NOT NULL DEFAULT 0
                  CHECK (progress_percentage BETWEEN 0 AND 100),
  detected_isbn   TEXT,
  fetched_metadata JSONB,
  condition_analysis JSONB,
  error_message   TEXT,
  listing_id      UUID REFERENCES listings(id),  -- set after listing submitted
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: sellers can only read their own scans
ALTER TABLE ai_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_scans_owner ON ai_scans
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY ai_scans_admin ON ai_scans
  FOR ALL USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));
```

## Gemini Vision Integration

### Model: `gemini-2.5-flash`

### Image Validation Prompts

Each image type has a specific prompt asking Gemini to return `{"valid": bool, "reason": "..."}`.

Image preprocessing:
- Client-side: Canvas resize to 800px max before sending to validate-image API
- Server-side: sharp resize to 800px max before sending to Gemini extraction

### Book Data Extraction Prompt

Sends both front and back cover images simultaneously. Extracts:
- ISBN (from barcode on back cover — 13 digits starting 978/979)
- Title, author, publisher, edition, publication year, subject
- MRP price (only if visually present — ₹ symbol or "MRP" text)

**Critical rule**: Price is only extracted if literally visible in the image. No memory-based guessing.

## Price Extraction Strategy

Priority order:
1. **Gemini Vision reads MRP from back cover image** — most accurate for Indian books
2. **Google Books `saleInfo.retailPrice` with `country=IN`** — real listed price
3. **Google Books title+author search** — finds priced editions
4. **Gemini knowledge base** — 3-attempt median, requires 2/3 high-confidence consistent answers within 20% variance
5. **null** — user must rescan with clearer back cover

## Condition Analysis Algorithm

Uses `sharp` for pixel-level image analysis:

```
brightness = average pixel brightness (0-255)
variance   = pixel brightness variance
yellowness = ratio of yellowish pixels (R>180, G>160, B<120)
```

Component scores (1-5):
- `cover_damage`: based on front+back brightness and variance
- `page_quality`: based on pages brightness
- `binding_quality`: based on spine variance
- `markings`: based on pages variance
- `discoloration`: based on pages yellowness

Overall score (weighted average, rounded to nearest integer):
```
overall = round(
  page_quality × 0.30 +
  cover_damage × 0.25 +
  binding_quality × 0.20 +
  markings × 0.15 +
  discoloration × 0.10
)
```

## Image Storage Flow

Current state: images passed as data URLs (base64) directly to scan API.

Target state (to implement):
1. After BookImageUploader collects all 4 images, upload each to Supabase Storage
2. Path: `scans/{user_id}/{scan_id}/{image_type}.jpg`
3. Strip EXIF metadata using sharp before upload
4. Return public URLs
5. Pass public URLs (not data URLs) to `/api/ai/scan`

This reduces payload size and enables persistent image storage for audit.

## Correctness Properties

### Property 1: ISBN Round-Trip
For all valid ISBN strings, `parse(print(parse(isbn))) === parse(isbn)`.
Validates: Requirement 2.7

### Property 2: Condition Score Validity
For all image sets, `overall_score ∈ {1, 2, 3, 4, 5}` and each component score `∈ {1, 2, 3, 4, 5}`.
Validates: Requirements 4.2, 4.3, 4.4

### Property 3: Weighted Average Correctness
`overall_score = round(cover×0.25 + page×0.30 + binding×0.20 + markings×0.15 + discolor×0.10)`
and result is always clamped to [1, 5].
Validates: Requirement 4.3

### Property 4: Scan Status Validity
`scan_status ∈ {'in_progress', 'completed', 'failed'}` at all times.
Validates: Requirement 8.5

### Property 5: Progress Percentage Bounds
`0 ≤ progress_percentage ≤ 100` at all times.
Validates: Requirement 8.4

## Security Design

- All scan/validate endpoints require authentication (HTTP 401 if unauthenticated)
- ai_scans RLS: sellers can only access their own records (HTTP 403 for cross-user access)
- Images stored under `scans/{user_id}/...` path — user ID in path prevents traversal
- EXIF stripping via sharp before Supabase Storage upload
- Images resized before Gemini API calls — prevents oversized payload attacks

## Environment Variables

```
GEMINI_API_KEY=...   # Google Gemini Vision API key (gemini-2.5-flash)
```
