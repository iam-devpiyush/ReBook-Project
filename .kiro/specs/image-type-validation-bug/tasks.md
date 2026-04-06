# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Type-Mismatched Book Image Is Accepted (Bug)
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate that `validateBookImage` accepts mismatched book images
  - **Scoped PBT Approach**: Scope the property to the four concrete mismatched cases for reproducibility
  - Mock the Gemini API to return a realistic "valid: true" response (simulating current prompt behavior)
  - Test case 1 — Spine-as-Pages: call `validateBookImage(spineImageUrl, "pages")`, assert `result.valid === false`
  - Test case 2 — Front-Cover-as-Back-Cover: call `validateBookImage(frontCoverUrl, "back_cover")`, assert `result.valid === false`
  - Test case 3 — Pages-as-Spine: call `validateBookImage(pagesImageUrl, "spine")`, assert `result.valid === false`
  - Test case 4 — Back-Cover-as-Front-Cover: call `validateBookImage(backCoverUrl, "front_cover")`, assert `result.valid === false`
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: All four tests FAIL (returns `valid: true` instead of `valid: false`) — this proves the bug exists
  - Document counterexamples found (e.g., "validateBookImage(spineUrl, 'pages') returned valid: true")
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Correct Image Type Continues to Be Accepted / Non-Book Rejected
  - **IMPORTANT**: Follow observation-first methodology — observe UNFIXED code behavior first
  - Observe: `validateBookImage(frontCoverUrl, "front_cover")` returns `valid: true` on unfixed code
  - Observe: `validateBookImage(backCoverUrl, "back_cover")` returns `valid: true` on unfixed code
  - Observe: `validateBookImage(spineUrl, "spine")` returns `valid: true` on unfixed code
  - Observe: `validateBookImage(pagesUrl, "pages")` returns `valid: true` on unfixed code
  - Observe: `validateBookImage(foodPhotoUrl, anyImageType)` returns `valid: false` on unfixed code
  - Observe: when Gemini throws a 429 error, function returns `{ valid: false, api_unavailable: true }` on unfixed code
  - Write property-based test: for all four correct-type pairings, result is `valid: true`
  - Write property-based test: for any non-book image across all four `imageType` values, result is `valid: false`
  - Write test: mock Gemini to throw 429 / RESOURCE_EXHAUSTED and assert `api_unavailable: true` is returned
  - Run all tests on UNFIXED code
  - **EXPECTED OUTCOME**: All preservation tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix IMAGE_TYPE_PROMPTS in gemini.ts

  - [x] 3.1 Rewrite all four prompts in `IMAGE_TYPE_PROMPTS` to enforce type-specific matching
    - **front_cover**: Require the image to show the front cover (title, author, cover art visible); return `valid: false` if it shows the back cover, spine, or inside pages
    - **back_cover**: Require the image to show the back cover (back-cover text, barcode, or publisher info visible); return `valid: false` if it shows the front cover, spine, or inside pages
    - **spine**: Require the image to show the spine (narrow side with title/author text running along it); return `valid: false` if it shows the front cover, back cover, or inside pages
    - **pages**: Require the image to show the inside pages (open book with printed text or illustrations on the pages); return `valid: false` if it shows the cover or spine
    - Each prompt must retain the instruction to return `valid: false` for non-book images
    - Each prompt must retain the JSON response format: `{"valid": true/false, "reason": "short reason"}`
    - Remove the phrase "any part of a book" and the overly permissive fallback "Only return false if this is clearly NOT a book at all" from all prompts
    - _Bug_Condition: isBugCondition(input) where actualImageContent != imageType AND IMAGE_TYPE_PROMPTS[imageType] does NOT require image to match imageType_
    - _Expected_Behavior: validateBookImage returns `{ valid: false }` with a type-mismatch reason for all inputs where isBugCondition is true_
    - _Preservation: correct-type images still return `valid: true`; non-book images still return `valid: false`; API error handling is unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Type-Mismatched Book Image Is Rejected
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - Run all four mismatched-type test cases against the fixed code
    - **EXPECTED OUTCOME**: All four tests PASS (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Correct Image Type Continues to Be Accepted / Non-Book Rejected
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run all preservation property tests from step 2 against the fixed code
    - **EXPECTED OUTCOME**: All preservation tests PASS (confirms no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite for `frontend/src/lib/ai-scanner/gemini.ts`
  - Confirm both the bug condition exploration test and all preservation tests pass
  - Ensure all tests pass; ask the user if any questions arise
