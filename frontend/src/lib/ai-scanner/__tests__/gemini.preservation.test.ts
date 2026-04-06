/**
 * Preservation Property Tests: Correct Image Type Continues to Be Accepted / Non-Book Rejected
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 *
 * These tests MUST PASS on UNFIXED code — they establish the baseline behavior
 * that must be preserved after the fix is applied.
 *
 * Observation-first methodology:
 * - validateBookImage(frontCoverUrl, "front_cover") returns valid: true on unfixed code ✓
 * - validateBookImage(backCoverUrl, "back_cover") returns valid: true on unfixed code ✓
 * - validateBookImage(spineUrl, "spine") returns valid: true on unfixed code ✓
 * - validateBookImage(pagesUrl, "pages") returns valid: true on unfixed code ✓
 * - validateBookImage(foodPhotoUrl, anyImageType) returns valid: false on unfixed code ✓
 * - When Gemini throws 429, function returns { valid: false, api_unavailable: true } ✓
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ─── Mock GoogleGenerativeAI before importing the module under test ───────────
// NOTE: vi.mock factories are hoisted, so we cannot reference variables declared
// outside the factory. Instead we expose the mock via a module-level object that
// is mutated inside beforeEach.

const mockState = {
  generateContent: vi.fn(),
};

vi.mock('@google/generative-ai', () => {
  const mockGenerateContent = (...args: unknown[]) => mockState.generateContent(...args);
  const mockGetGenerativeModel = vi.fn().mockReturnValue({
    generateContent: mockGenerateContent,
  });

  class MockGoogleGenerativeAI {
    getGenerativeModel = mockGetGenerativeModel;
  }
  return { GoogleGenerativeAI: MockGoogleGenerativeAI };
});

// Mock fetch for remote URL handling (urlToPart uses fetch for https:// URLs)
global.fetch = vi.fn().mockResolvedValue({
  arrayBuffer: () => Promise.resolve(Buffer.from('fake-image-data').buffer),
  headers: { get: () => 'image/jpeg' },
});

// ─── Import after mocks are set up ────────────────────────────────────────────

import { validateBookImage } from '../gemini';

// ─── Realistic fake image URLs ────────────────────────────────────────────────

const frontCoverUrl = 'https://example.com/book-front-cover-photo.jpg';
const backCoverUrl = 'https://example.com/book-back-cover-photo.jpg';
const spineUrl = 'https://example.com/book-spine-photo.jpg';
const pagesUrl = 'https://example.com/book-inside-pages-photo.jpg';
const foodPhotoUrl = 'https://example.com/food-photo.jpg';

// ─── Preservation Tests ───────────────────────────────────────────────────────

describe('Preservation: Correct Image Type Continues to Be Accepted', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: Gemini returns valid: true for correct-type images
    mockState.generateContent = vi.fn().mockResolvedValue({
      response: {
        text: () => JSON.stringify({ valid: true, reason: 'Correct image type' }),
      },
    });
    // Reset fetch mock
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      arrayBuffer: () => Promise.resolve(Buffer.from('fake-image-data').buffer),
      headers: { get: () => 'image/jpeg' },
    });
  });

  /**
   * Property 2a: For all four correct-type pairings, result is valid: true
   *
   * Gemini is mocked to return { valid: true, reason: "Correct image type" }
   * for all correct-type images. This confirms the baseline acceptance behavior.
   *
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
   */
  it('Property 2a: for all four correct-type pairings, validateBookImage returns valid: true', async () => {
    const correctTypePairings = fc.constantFrom(
      { imageUrl: frontCoverUrl, imageType: 'front_cover' as const, description: 'front-cover-as-front-cover' },
      { imageUrl: backCoverUrl, imageType: 'back_cover' as const, description: 'back-cover-as-back-cover' },
      { imageUrl: spineUrl, imageType: 'spine' as const, description: 'spine-as-spine' },
      { imageUrl: pagesUrl, imageType: 'pages' as const, description: 'pages-as-pages' },
    );

    await fc.assert(
      fc.asyncProperty(correctTypePairings, async ({ imageUrl, imageType }) => {
        const result = await validateBookImage(imageUrl, imageType);
        expect(result.valid).toBe(true);
      }),
      { numRuns: 4 }
    );
  });

  /**
   * Individual unit tests for each correct-type pairing (Requirements 3.1–3.4)
   */

  it('Req 3.1: correct front cover image for "front_cover" step returns valid: true', async () => {
    const result = await validateBookImage(frontCoverUrl, 'front_cover');
    expect(result.valid).toBe(true);
  });

  it('Req 3.2: correct back cover image for "back_cover" step returns valid: true', async () => {
    const result = await validateBookImage(backCoverUrl, 'back_cover');
    expect(result.valid).toBe(true);
  });

  it('Req 3.3: correct spine image for "spine" step returns valid: true', async () => {
    const result = await validateBookImage(spineUrl, 'spine');
    expect(result.valid).toBe(true);
  });

  it('Req 3.4: correct inside pages image for "pages" step returns valid: true', async () => {
    const result = await validateBookImage(pagesUrl, 'pages');
    expect(result.valid).toBe(true);
  });
});

describe('Preservation: Non-Book Images Continue to Be Rejected', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Gemini returns valid: false for non-book images
    mockState.generateContent = vi.fn().mockResolvedValue({
      response: {
        text: () => JSON.stringify({ valid: false, reason: 'This is not a book' }),
      },
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      arrayBuffer: () => Promise.resolve(Buffer.from('fake-image-data').buffer),
      headers: { get: () => 'image/jpeg' },
    });
  });

  /**
   * Property 2b: For any non-book image across all four imageType values, result is valid: false
   *
   * Gemini is mocked to return { valid: false, reason: "This is not a book" }
   * for the food photo. This confirms the baseline rejection behavior.
   *
   * **Validates: Requirement 3.5**
   */
  it('Property 2b: non-book image returns valid: false for all four imageType values', async () => {
    const allImageTypes = fc.constantFrom(
      'front_cover' as const,
      'back_cover' as const,
      'spine' as const,
      'pages' as const,
    );

    await fc.assert(
      fc.asyncProperty(allImageTypes, async (imageType) => {
        const result = await validateBookImage(foodPhotoUrl, imageType);
        expect(result.valid).toBe(false);
      }),
      { numRuns: 4 }
    );
  });

  it('Req 3.5: food photo is rejected for "front_cover" step', async () => {
    const result = await validateBookImage(foodPhotoUrl, 'front_cover');
    expect(result.valid).toBe(false);
  });

  it('Req 3.5: food photo is rejected for "back_cover" step', async () => {
    const result = await validateBookImage(foodPhotoUrl, 'back_cover');
    expect(result.valid).toBe(false);
  });

  it('Req 3.5: food photo is rejected for "spine" step', async () => {
    const result = await validateBookImage(foodPhotoUrl, 'spine');
    expect(result.valid).toBe(false);
  });

  it('Req 3.5: food photo is rejected for "pages" step', async () => {
    const result = await validateBookImage(foodPhotoUrl, 'pages');
    expect(result.valid).toBe(false);
  });
});

describe('Preservation: API Error Handling (Req 3.6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      arrayBuffer: () => Promise.resolve(Buffer.from('fake-image-data').buffer),
      headers: { get: () => 'image/jpeg' },
    });
  });

  /**
   * When Gemini throws a 429 / RESOURCE_EXHAUSTED error across ALL models,
   * validateBookImage must return { valid: false, api_unavailable: true }.
   *
   * **Validates: Requirement 3.6**
   */
  it('Req 3.6: when all Gemini models throw 429 RESOURCE_EXHAUSTED, returns api_unavailable: true', async () => {
    // All model attempts throw a rate-limit error
    mockState.generateContent = vi.fn().mockRejectedValue(
      new Error('429 RESOURCE_EXHAUSTED: quota exceeded, retryDelay: 30s')
    );

    const result = await validateBookImage(frontCoverUrl, 'front_cover');

    expect(result.valid).toBe(false);
    expect(result.api_unavailable).toBe(true);
  });

  it('Req 3.6: when Gemini throws 429 with retryDelay, returns api_unavailable: true', async () => {
    mockState.generateContent = vi.fn().mockRejectedValue(
      new Error('429 Too Many Requests retryDelay: 60s')
    );

    const result = await validateBookImage(spineUrl, 'spine');

    expect(result.valid).toBe(false);
    expect(result.api_unavailable).toBe(true);
  });

  it('Req 3.6: when Gemini throws RESOURCE_EXHAUSTED with limit: 0, returns api_unavailable: true', async () => {
    mockState.generateContent = vi.fn().mockRejectedValue(
      new Error('RESOURCE_EXHAUSTED: limit: 0 quota exceeded')
    );

    const result = await validateBookImage(pagesUrl, 'pages');

    expect(result.valid).toBe(false);
    expect(result.api_unavailable).toBe(true);
  });
});
