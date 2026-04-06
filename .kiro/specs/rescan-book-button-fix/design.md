# Rescan Book Button Fix - Bugfix Design

## Overview

At Step 3 of the listing creation flow, when the AI scan completes but fails to detect the
original price (MRP), a warning banner is shown with a "Rescan Book" button. This button
incorrectly calls `setStep(1)`, navigating the user back to the image upload screen and
discarding all uploaded images. The fix is a single-line change: replace `setStep(1)` with
`handleImagesComplete(uploadedImages!)` so the button re-triggers the full scan pipeline using
the already-uploaded images — exactly as the "Rescan (same images)" button on the Step 2 error
screen already does.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — the user is at Step 3, the scan
  returned no MRP, and the user clicks "Rescan Book" in the price-not-found warning banner.
- **Property (P)**: The desired behavior — clicking "Rescan Book" calls
  `handleImagesComplete(uploadedImages!)`, re-triggering the scan pipeline without discarding images.
- **Preservation**: Existing behaviors that must remain unchanged — the Step 2 "Rescan (same
  images)" button, the Step 2 "Upload new images" button, the Step 3 bottom "Rescan" button, and
  the normal happy-path flow through Steps 3 and 4.
- **handleImagesComplete**: The async function in `CreateListingForm.tsx` that sets `uploadedImages`,
  transitions to Step 2, uploads images to Supabase Storage, and runs the AI scan pipeline.
- **uploadedImages**: The `useState<UploadedImages | null>(null)` state that holds the 4 uploaded
  image data URLs (front_cover, back_cover, spine, pages).
- **setStep**: The state setter that directly changes the current step without triggering any scan.

## Bug Details

### Bug Condition

The bug manifests when the user reaches Step 3 and the scan result has no `original_price`. The
price-not-found warning banner renders a "Rescan Book" button whose `onClick` calls `setStep(1)`
instead of `handleImagesComplete(uploadedImages!)`. This navigates back to the upload screen and
clears the uploaded images state implicitly by re-mounting the uploader.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input = { currentStep: number, originalPrice: number | null, buttonClicked: string }
  OUTPUT: boolean

  RETURN input.currentStep === 3
         AND input.originalPrice IS null OR undefined
         AND input.buttonClicked === "Rescan Book"
END FUNCTION
```

### Examples

- User uploads 4 photos → scan runs → Step 3 shows "Original price not found" → user clicks
  "Rescan Book" → **bug**: navigates to Step 1, images discarded; **expected**: scan re-runs
  from Step 2 with same images.
- User uploads 4 photos → scan runs → Step 3 shows "Original price not found" → user clicks
  "Rescan Book" a second time → **bug**: same incorrect navigation; **expected**: same correct
  re-scan behavior.
- User uploads 4 photos → scan fails entirely at Step 2 → user clicks "Rescan (same images)" →
  **no bug here**: this button already calls `handleImagesComplete(uploadedImages)` correctly.
- User uploads 4 photos → scan runs → Step 3 shows price found → "Rescan Book" banner is not
  shown → no interaction possible, unaffected.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- The Step 2 "Rescan (same images)" button must continue to call `handleImagesComplete(uploadedImages)`.
- The Step 2 "Upload new images" button must continue to call `setStep(1)`.
- The Step 3 bottom "Rescan" button must continue to call `setStep(1)` (intentional — for uploading new images).
- The normal flow (scan finds MRP → Step 3 → Step 4 → submit) must remain completely unaffected.
- The price-not-found warning banner must continue to appear only when `scanResult.original_price` is falsy.

**Scope:**
All inputs where the bug condition does NOT hold are completely unaffected by this fix. This
includes:
- Any interaction that does not involve clicking "Rescan Book" in the Step 3 price-not-found banner
- The Step 2 scan error screen buttons
- The Step 3 bottom "Rescan" button
- The full happy-path flow through Steps 3 and 4

## Hypothesized Root Cause

1. **Copy-paste error**: The "Rescan Book" button was likely written by copying the Step 3 bottom
   "Rescan" button (which intentionally calls `setStep(1)` to allow new image uploads) without
   updating the `onClick` handler to match the intended behavior.

2. **Incorrect handler**: The correct handler `handleImagesComplete(uploadedImages!)` was already
   implemented and used on the Step 2 error screen's "Rescan (same images)" button, but was not
   applied to the Step 3 banner button.

3. **No null guard needed**: `uploadedImages` is guaranteed to be non-null at Step 3 because
   `handleImagesComplete` sets it before transitioning to Step 2, and Step 3 is only reachable
   after a successful scan transition from Step 2. The non-null assertion `!` is safe.

## Correctness Properties

Property 1: Bug Condition - Rescan Book Re-triggers Scan Pipeline

_For any_ state where the bug condition holds (user is at Step 3, `original_price` is null, and
"Rescan Book" is clicked), the fixed button SHALL call `handleImagesComplete(uploadedImages!)`
which transitions to Step 2 and re-runs the full scan pipeline without discarding the uploaded
images.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Other Buttons and Flows Are Unaffected

_For any_ interaction where the bug condition does NOT hold (any button other than the Step 3
"Rescan Book" banner button, or any state where `original_price` is present), the fixed code
SHALL produce exactly the same behavior as the original code, preserving all existing button
handlers and flow transitions.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

**File**: `frontend/src/components/listings/CreateListingForm.tsx`

**Location**: The price-not-found warning banner inside the `{step === 3 && scanResult && (...)}` block

**Specific Change**:

```tsx
// BEFORE (buggy):
<button onClick={() => setStep(1)}
  className="mt-3 px-4 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700">
  Rescan Book
</button>

// AFTER (fixed):
<button onClick={() => handleImagesComplete(uploadedImages!)}
  className="mt-3 px-4 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700">
  Rescan Book
</button>
```

**Reference Implementation**: The Step 2 scan error screen already has the correct pattern:
```tsx
<button
  onClick={() => handleImagesComplete(uploadedImages)}
  className="px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700">
  Rescan (same images)
</button>
```

No other changes are required. The `handleImagesComplete` function, `uploadedImages` state, and
all other logic remain unchanged.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate
the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm
the root cause: the "Rescan Book" button calls `setStep(1)` instead of `handleImagesComplete`.

**Test Plan**: Render `CreateListingForm` in a state where Step 3 is active and
`scanResult.original_price` is null. Click the "Rescan Book" button and assert that
`handleImagesComplete` was called (not `setStep(1)`). Run on UNFIXED code to observe failure.

**Test Cases**:
1. **Rescan Book calls handleImagesComplete**: Render at Step 3 with no MRP, click "Rescan Book",
   assert `handleImagesComplete` was invoked with `uploadedImages` (will FAIL on unfixed code).
2. **Rescan Book does not navigate to Step 1**: Render at Step 3 with no MRP, click "Rescan Book",
   assert the component transitions to Step 2 scanning state, not Step 1 (will FAIL on unfixed code).

**Expected Counterexamples**:
- `handleImagesComplete` is never called; instead `step` is set to `1`.
- The component renders the Step 1 image uploader after clicking "Rescan Book".

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed button produces the
expected behavior.

**Pseudocode:**
```
FOR ALL state WHERE isBugCondition(state) DO
  render CreateListingForm at step=3 with original_price=null
  click "Rescan Book"
  ASSERT handleImagesComplete was called with uploadedImages
  ASSERT step transitions to 2 (scanning)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code
produces the same behavior as the original.

**Pseudocode:**
```
FOR ALL interaction WHERE NOT isBugCondition(interaction) DO
  ASSERT fixedCode(interaction) = originalCode(interaction)
END FOR
```

**Testing Approach**: Unit tests covering each preserved button and flow path are sufficient here
because the change is a single-line substitution with no shared logic.

**Test Cases**:
1. **Step 2 "Rescan (same images)" preservation**: Click the Step 2 error screen rescan button,
   assert `handleImagesComplete` is still called.
2. **Step 2 "Upload new images" preservation**: Click the Step 2 error screen upload button,
   assert `setStep(1)` is still called.
3. **Step 3 bottom "Rescan" preservation**: Click the Step 3 bottom rescan button, assert
   `setStep(1)` is still called.
4. **Happy-path preservation**: With a valid MRP, verify the price-not-found banner is not shown
   and the "Calculate Price & Continue" button works correctly.

### Unit Tests

- Test "Rescan Book" button calls `handleImagesComplete(uploadedImages!)` when MRP is missing
- Test "Rescan Book" button is only rendered when `scanResult.original_price` is falsy
- Test Step 2 "Rescan (same images)" button still calls `handleImagesComplete`
- Test Step 2 "Upload new images" button still calls `setStep(1)`
- Test Step 3 bottom "Rescan" button still calls `setStep(1)`

### Property-Based Tests

- For any scan result where `original_price` is null/undefined, clicking "Rescan Book" always
  calls `handleImagesComplete` with the current `uploadedImages`.
- For any scan result where `original_price` is a positive number, the price-not-found banner
  (and its "Rescan Book" button) is never rendered.

### Integration Tests

- Full flow: upload images → scan returns no MRP → click "Rescan Book" → verify Step 2 scanning
  screen appears and scan pipeline is re-triggered with the same images.
- Verify that after clicking "Rescan Book", the uploaded images thumbnails are still visible on
  the Step 2 screen (images were not discarded).
