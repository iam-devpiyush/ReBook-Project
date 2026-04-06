# Image Type Validation Bug - Bugfix Design

## Overview

The AI image validation step in the book scanning flow accepts any book image for any step,
regardless of whether it matches the required image type. All four prompts in `IMAGE_TYPE_PROMPTS`
are functionally identical — they only ask "is this a book?" and never verify the specific type.

The fix rewrites each prompt to explicitly require the image to match the specific type for that
step (front cover, back cover, spine, or inside pages) and reject it if it shows a different part
of the book.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — an image is uploaded for a specific
  step but the prompt does not enforce type-specific matching, so any book image passes.
- **Property (P)**: The desired behavior — the validation result must reflect whether the image
  matches the required type for the current step, not just whether it is a book.
- **Preservation**: The existing behavior that must remain unchanged — correct images for each step
  continue to be accepted, non-book images continue to be rejected, and API error handling is unaffected.
- **IMAGE_TYPE_PROMPTS**: The `Record<string, string>` object in
  `frontend/src/lib/ai-scanner/gemini.ts` that maps `imageType` values to Gemini prompt strings.
- **validateBookImage**: The exported async function in `gemini.ts` that calls Gemini with the
  appropriate prompt and returns an `ImageValidationResult`.
- **imageType**: The string key passed to `validateBookImage` — one of `front_cover`, `back_cover`,
  `spine`, or `pages`.

## Bug Details

### Bug Condition

The bug manifests when a user uploads an image whose actual content does not match the `imageType`
parameter passed to `validateBookImage`. Because all four prompts only ask "is this a book?", the
function returns `valid: true` for any book image regardless of type mismatch.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input = { imageUrl: string, imageType: string, actualImageContent: string }
  OUTPUT: boolean

  RETURN actualImageContent != imageType
         AND actualImageContent IS a valid book image type
         AND IMAGE_TYPE_PROMPTS[imageType] does NOT require image to match imageType
END FUNCTION
```

### Examples

- User uploads a spine photo during the "Inside Pages" step (`imageType = "pages"`):
  current behavior returns `valid: true` with reason describing the spine; expected is `valid: false`.
- User uploads a front cover photo during the "Back Cover" step (`imageType = "back_cover"`):
  current behavior returns `valid: true`; expected is `valid: false`.
- User uploads inside pages during the "Spine" step (`imageType = "spine"`):
  current behavior returns `valid: true`; expected is `valid: false`.
- User uploads a correct front cover during the "Front Cover" step (`imageType = "front_cover"`):
  behavior is unchanged — returns `valid: true` before and after the fix.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- A correct front cover image uploaded during the "Front Cover" step must continue to be accepted.
- A correct back cover image uploaded during the "Back Cover" step must continue to be accepted.
- A correct spine image uploaded during the "Spine" step must continue to be accepted.
- A correct inside pages image uploaded during the "Inside Pages" step must continue to be accepted.
- A non-book image (food, landscape, etc.) must continue to be rejected for every step.
- When the Gemini API is unavailable or rate-limited, the function must continue to return
  `{ valid: false, api_unavailable: true, reason: "..." }` without crashing.

**Scope:**
All inputs where the uploaded image actually matches the required `imageType` are unaffected by
this fix. This includes all four correct-type scenarios and all non-book-image scenarios.

## Hypothesized Root Cause

1. **Identical prompts across all types**: Every entry in `IMAGE_TYPE_PROMPTS` uses the same
   phrasing — "Is this image a photo of a physical book? It could show the [type], cover, or any
   part of a book." The phrase "any part of a book" explicitly tells Gemini to accept any book
   image, making type-specific rejection impossible.

2. **No type-matching instruction**: None of the prompts instruct Gemini to compare the image
   content against the required type or to return `false` when the image shows a different part
   of the book.

3. **Overly permissive fallback wording**: The instruction "Only return false if this is clearly
   NOT a book at all" further suppresses any type-mismatch rejection.

## Correctness Properties

Property 1: Bug Condition - Type-Mismatched Book Image Is Rejected

_For any_ input where the uploaded image is a valid book photo but does not match the required
`imageType` (isBugCondition returns true), the fixed `validateBookImage` function SHALL return
`{ valid: false }` with a reason indicating that the image does not match the required type for
that step.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Correct Image Type Continues to Be Accepted

_For any_ input where the uploaded image matches the required `imageType` (isBugCondition returns
false and the image is a real book of the correct type), the fixed `validateBookImage` function
SHALL return `{ valid: true }`, preserving acceptance of correctly-typed images across all four
steps.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

Property 3: Preservation - Non-Book Images Continue to Be Rejected

_For any_ input where the uploaded image is not a book at all, the fixed `validateBookImage`
function SHALL return `{ valid: false }` for every `imageType`, preserving the existing non-book
rejection behavior.

**Validates: Requirement 3.5**

## Fix Implementation

### Changes Required

**File**: `frontend/src/lib/ai-scanner/gemini.ts`

**Object**: `IMAGE_TYPE_PROMPTS`

**Specific Changes**:

1. **front_cover prompt**: Rewrite to require the image to show the front cover of a book (title,
   author, cover art visible) and explicitly reject images showing the back cover, spine, or
   inside pages.

2. **back_cover prompt**: Rewrite to require the image to show the back cover of a book (back
   cover text, barcode, or publisher info visible) and explicitly reject images showing the front
   cover, spine, or inside pages.

3. **spine prompt**: Rewrite to require the image to show the spine of a book (narrow side with
   title/author text running along it) and explicitly reject images showing the front cover, back
   cover, or inside pages.

4. **pages prompt**: Rewrite to require the image to show the inside pages of a book (open book
   with printed text or illustrations on the pages) and explicitly reject images showing the
   cover or spine.

5. **Prompt structure**: Each rewritten prompt should follow the pattern:
   - State what the image MUST show for `valid: true`
   - State that images showing other parts of the book should return `valid: false`
   - Keep the instruction to return `valid: false` for non-book images
   - Retain the JSON response format: `{"valid": true/false, "reason": "short reason"}`

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate
the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm
or refute the root cause analysis.

**Test Plan**: Write tests that call `validateBookImage` with a mismatched image type (e.g., a
spine image with `imageType = "pages"`) and assert that `valid === false`. Run these tests on the
UNFIXED code to observe that they fail (i.e., the function incorrectly returns `valid: true`),
confirming the root cause.

**Test Cases**:
1. **Spine-as-Pages Test**: Call `validateBookImage(spineImageUrl, "pages")` — expect `valid: false`
   (will fail on unfixed code, confirming the bug).
2. **Front-Cover-as-Back-Cover Test**: Call `validateBookImage(frontCoverUrl, "back_cover")` —
   expect `valid: false` (will fail on unfixed code).
3. **Pages-as-Spine Test**: Call `validateBookImage(pagesImageUrl, "spine")` — expect `valid: false`
   (will fail on unfixed code).
4. **Back-Cover-as-Front-Cover Test**: Call `validateBookImage(backCoverUrl, "front_cover")` —
   expect `valid: false` (may fail on unfixed code).

**Expected Counterexamples**:
- All four tests return `valid: true` on unfixed code, confirming that the prompts do not enforce
  type-specific matching.
- Possible causes: identical prompt wording, "any part of a book" phrasing, overly permissive
  fallback instruction.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces
the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := validateBookImage_fixed(input.imageUrl, input.imageType)
  ASSERT result.valid === false
  ASSERT result.reason describes a type mismatch
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function
produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT validateBookImage_original(input) = validateBookImage_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code for correct-type images and non-book images, then
write property-based tests capturing that behavior.

**Test Cases**:
1. **Correct-Type Acceptance Preservation**: For each of the four `imageType` values, verify that
   a correctly-typed image continues to return `valid: true` after the fix.
2. **Non-Book Rejection Preservation**: Verify that a non-book image (e.g., food photo) continues
   to return `valid: false` for all four `imageType` values after the fix.
3. **API Error Handling Preservation**: Mock the Gemini API to throw a 429 error and verify the
   function still returns `{ valid: false, api_unavailable: true }` after the fix.

### Unit Tests

- Test each of the four `imageType` values with a mismatched image (fix checking)
- Test each of the four `imageType` values with a correctly-typed image (preservation)
- Test with a non-book image for each step (preservation)
- Test API unavailable / rate-limit error path (preservation)

### Property-Based Tests

- Generate random pairings of (actualImageType, requestedImageType) where they differ and verify
  `valid: false` is returned for all mismatched combinations after the fix.
- Generate random correctly-typed image inputs across all four steps and verify `valid: true` is
  preserved after the fix.
- Generate random non-book image inputs and verify `valid: false` is preserved across all steps.

### Integration Tests

- Full scanning flow: upload a spine image during the "Inside Pages" step and verify the UI
  displays a rejection message and does not advance to the next step.
- Full scanning flow: upload the correct image type for each of the four steps and verify the
  flow completes successfully end-to-end.
- Verify that the rejection reason returned by the fixed prompts is user-friendly and describes
  the expected image type clearly.
