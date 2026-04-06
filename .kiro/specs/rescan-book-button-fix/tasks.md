# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Rescan Book Re-triggers Scan Pipeline (Bug)
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the "Rescan Book" button calls `setStep(1)` instead of `handleImagesComplete`
  - Create a test file at `frontend/src/components/listings/__tests__/CreateListingForm.rescan.test.tsx`
  - Render `CreateListingForm` with mocked API calls so the component reaches Step 3 with `scanResult.original_price = null` and `uploadedImages` set
  - Test case 1 — Rescan Book calls handleImagesComplete: click "Rescan Book" in the price-not-found banner, assert `handleImagesComplete` was invoked (i.e., the scan API is called again, or the component transitions to Step 2 scanning state)
  - Test case 2 — Rescan Book does not navigate to Step 1: click "Rescan Book", assert the image uploader (Step 1) is NOT rendered and the scanning screen (Step 2) IS rendered
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Both tests FAIL (the component renders Step 1 instead of Step 2) — this proves the bug exists
  - Document counterexamples found (e.g., "After clicking Rescan Book, component shows Step 1 image uploader instead of Step 2 scanning screen")
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2_

- [x] 2. Write preservation tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Other Buttons and Flows Are Unaffected
  - **IMPORTANT**: Follow observation-first methodology — observe UNFIXED code behavior first
  - Observe: Step 2 "Rescan (same images)" button calls `handleImagesComplete(uploadedImages)` on unfixed code
  - Observe: Step 2 "Upload new images" button calls `setStep(1)` on unfixed code
  - Observe: Step 3 bottom "Rescan" button calls `setStep(1)` on unfixed code
  - Observe: When `scanResult.original_price` is a positive number, the price-not-found banner is not rendered on unfixed code
  - Write test: Step 2 "Rescan (same images)" button — assert scan pipeline is re-triggered (Step 2 scanning screen appears)
  - Write test: Step 2 "Upload new images" button — assert Step 1 image uploader appears
  - Write test: Step 3 bottom "Rescan" button — assert Step 1 image uploader appears
  - Write test: With valid MRP, assert price-not-found banner and "Rescan Book" button are not rendered
  - Run all tests on UNFIXED code
  - **EXPECTED OUTCOME**: All preservation tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Apply the fix and verify

  - [x] 3.1 Change `setStep(1)` to `handleImagesComplete(uploadedImages!)` in the "Rescan Book" button
    - **File**: `frontend/src/components/listings/CreateListingForm.tsx`
    - **Location**: Inside the `{!scanResult.original_price && (...)}` price-not-found warning banner at Step 3
    - Change the `onClick` handler of the "Rescan Book" button from `() => setStep(1)` to `() => handleImagesComplete(uploadedImages!)`
    - No other changes are needed — this is a single-line fix
    - _Bug_Condition: isBugCondition where step===3 AND original_price is null AND "Rescan Book" is clicked_
    - _Expected_Behavior: handleImagesComplete(uploadedImages!) is called, transitioning to Step 2 scanning_
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Rescan Book Re-triggers Scan Pipeline
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - Run both bug condition test cases against the fixed code
    - **EXPECTED OUTCOME**: Both tests PASS (confirms bug is fixed)
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Other Buttons and Flows Are Unaffected
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run all preservation tests from task 2 against the fixed code
    - **EXPECTED OUTCOME**: All preservation tests PASS (confirms no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite for `frontend/src/components/listings/CreateListingForm`
  - Confirm both the bug condition exploration tests and all preservation tests pass
  - Ensure all tests pass; ask the user if any questions arise
