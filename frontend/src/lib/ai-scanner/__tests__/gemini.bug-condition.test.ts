/**
 * Bug Condition Exploration Test: Type-Mismatched Book Image Is Accepted (Bug)
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 *
 * CRITICAL: These tests are EXPECTED TO FAIL on unfixed code.
 * Failure confirms the bug exists — the prompts in IMAGE_TYPE_PROMPTS do not
 * enforce type-specific matching, so any book image passes for any step.
 *
 * The tests encode the EXPECTED (correct) behavior. They will pass after the fix.
 *
 * Bug Condition: validateBookImage accepts a mismatched book image because all
 * four IMAGE_TYPE_PROMPTS only ask "is this a book?" and never verify the
 * specific type required for the current step.
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

// ─── Mock GoogleGenerativeAI before importing the module under test ───────────

vi.mock('@google/generative-ai', () => {
  const mockGenerateContent = vi.fn().mockResolvedValue({
    response: {
      text: () => JSON.stringify({ valid: false, reason: 'Type mismatch detected' }),
    },
  });

  const mockGetGenerativeModel = vi.fn().mockReturnValue({
    generateContent: mockGenerateContent,
  });

  class MockGoogleGenerativeAI {
    getGenerativeModel = mockGetGenerativeModel;
  }

  return {
    GoogleGenerativeAI: MockGoogleGenerativeAI,
  };
});

// Mock fetch for remote URL handling (urlToPart uses fetch for https:// URLs)
global.fetch = vi.fn().mockResolvedValue({
  arrayBuffer: () => Promise.resolve(Buffer.from('fake-image-data').buffer),
  headers: {
    get: () => 'image/jpeg',
  },
});

// ─── Import after mocks are set up ────────────────────────────────────────────

import { validateBookImage } from '../gemini';

// ─── Realistic fake image URLs for each image type ────────────────────────────

const spineImageUrl = 'https://example.com/book-spine-photo.jpg';
const frontCoverUrl = 'https://example.com/book-front-cover-photo.jpg';
const pagesImageUrl = 'https://example.com/book-inside-pages-photo.jpg';
const backCoverUrl = 'https://example.com/book-back-cover-photo.jpg';

// ─── Scoped PBT: four concrete mismatched cases ───────────────────────────────

describe('Bug Condition Exploration: Type-Mismatched Book Image Is Accepted', () => {


  /**
   * Test case 1 — Spine-as-Pages
   *
   * A spine photo is uploaded during the "Inside Pages" step.
   * The buggy prompt accepts it because it only checks "is this a book?".
   *
   * EXPECTED ON UNFIXED CODE: FAIL (returns valid: true instead of valid: false)
   * Counterexample: validateBookImage(spineUrl, 'pages') returned valid: true
   *
   * **Validates: Requirement 1.1**
   */
  it('Test case 1 — Spine-as-Pages: spine image uploaded for "pages" step should be rejected', async () => {
    const result = await validateBookImage(spineImageUrl, 'pages');

    // This assertion FAILS on unfixed code — the buggy prompt returns valid: true
    // because it only asks "is this a book?" and never checks if it shows inside pages.
    expect(result.valid).toBe(false);
  });

  /**
   * Test case 2 — Front-Cover-as-Back-Cover
   *
   * A front cover photo is uploaded during the "Back Cover" step.
   * The buggy prompt accepts it because it only checks "is this a book?".
   *
   * EXPECTED ON UNFIXED CODE: FAIL (returns valid: true instead of valid: false)
   * Counterexample: validateBookImage(frontCoverUrl, 'back_cover') returned valid: true
   *
   * **Validates: Requirement 1.2**
   */
  it('Test case 2 — Front-Cover-as-Back-Cover: front cover image uploaded for "back_cover" step should be rejected', async () => {
    const result = await validateBookImage(frontCoverUrl, 'back_cover');

    // This assertion FAILS on unfixed code — the buggy prompt returns valid: true
    // because it only asks "is this a book?" and never checks if it shows the back cover.
    expect(result.valid).toBe(false);
  });

  /**
   * Test case 3 — Pages-as-Spine
   *
   * An inside pages photo is uploaded during the "Spine" step.
   * The buggy prompt accepts it because it only checks "is this a book?".
   *
   * EXPECTED ON UNFIXED CODE: FAIL (returns valid: true instead of valid: false)
   * Counterexample: validateBookImage(pagesImageUrl, 'spine') returned valid: true
   *
   * **Validates: Requirement 1.3**
   */
  it('Test case 3 — Pages-as-Spine: inside pages image uploaded for "spine" step should be rejected', async () => {
    const result = await validateBookImage(pagesImageUrl, 'spine');

    // This assertion FAILS on unfixed code — the buggy prompt returns valid: true
    // because it only asks "is this a book?" and never checks if it shows the spine.
    expect(result.valid).toBe(false);
  });

  /**
   * Test case 4 — Back-Cover-as-Front-Cover
   *
   * A back cover photo is uploaded during the "Front Cover" step.
   * The buggy prompt accepts it because it only checks "is this a book?".
   *
   * EXPECTED ON UNFIXED CODE: FAIL (returns valid: true instead of valid: false)
   * Counterexample: validateBookImage(backCoverUrl, 'front_cover') returned valid: true
   *
   * **Validates: Requirement 1.4**
   */
  it('Test case 4 — Back-Cover-as-Front-Cover: back cover image uploaded for "front_cover" step should be rejected', async () => {
    const result = await validateBookImage(backCoverUrl, 'front_cover');

    // This assertion FAILS on unfixed code — the buggy prompt returns valid: true
    // because it only asks "is this a book?" and never checks if it shows the front cover.
    expect(result.valid).toBe(false);
  });

  /**
   * Scoped PBT: all four mismatched cases fail together
   *
   * Uses fast-check to enumerate the four concrete mismatched pairings.
   * Each pairing represents a case where the actual image content does not match
   * the imageType parameter — the bug condition.
   *
   * EXPECTED ON UNFIXED CODE: FAIL for all four cases
   *
   * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
   */
  it('Property 1 (Bug Condition): for all four mismatched image/type pairings, validateBookImage should return valid: false', async () => {
    const mismatchedCases = fc.constantFrom(
      { imageUrl: spineImageUrl, imageType: 'pages' as const, description: 'spine-as-pages' },
      { imageUrl: frontCoverUrl, imageType: 'back_cover' as const, description: 'front-cover-as-back-cover' },
      { imageUrl: pagesImageUrl, imageType: 'spine' as const, description: 'pages-as-spine' },
      { imageUrl: backCoverUrl, imageType: 'front_cover' as const, description: 'back-cover-as-front-cover' },
    );

    await fc.assert(
      fc.asyncProperty(mismatchedCases, async ({ imageUrl, imageType, description }) => {
        const result = await validateBookImage(imageUrl, imageType);

        // All four cases FAIL on unfixed code — the buggy prompts return valid: true
        // because they only check "is this a book?" and never verify the specific type.
        expect(result.valid).toBe(false);
      }),
      { numRuns: 4 }
    );
  });
});
