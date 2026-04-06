/**
 * Bug Condition Exploration Test — Rescan Book Button
 *
 * Property 1: Bug Condition — Rescan Book Re-triggers Scan Pipeline
 *
 * CRITICAL: These tests MUST FAIL on unfixed code.
 * Failure confirms the bug exists: the "Rescan Book" button calls setStep(1)
 * instead of handleImagesComplete(uploadedImages!).
 *
 * Validates: Requirements 1.1, 1.2
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useRouter } from 'next/navigation';
import CreateListingForm from '../CreateListingForm';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock BookImageUploader so we can programmatically trigger onComplete
vi.mock('@/components/ai-scanner/BookImageUploader', () => ({
  default: function MockBookImageUploader({ onComplete }: { onComplete: (images: any) => void; onCancel: () => void }) {
    return (
      <div data-testid="book-image-uploader">
        <button
          data-testid="trigger-upload-complete"
          onClick={() =>
            onComplete({
              front_cover: 'data:image/jpeg;base64,front',
              back_cover: 'data:image/jpeg;base64,back',
              spine: 'data:image/jpeg;base64,spine',
              pages: 'data:image/jpeg;base64,pages',
            })
          }
        >
          Upload Complete
        </button>
      </div>
    );
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Scan result where original_price is null — triggers the price-not-found banner */
const SCAN_RESULT_NO_PRICE = {
  result: {
    detected_isbn: '9780123456789',
    book_metadata: {
      title: 'Test Book',
      author: 'Test Author',
      publisher: 'Test Publisher',
      edition: '1st',
      publication_year: 2020,
      subject: 'Testing',
      cover_image: null,
      price_source: null,
      original_price: null,
    },
    condition_analysis: {
      overall_score: 4,
      cover_damage: 4,
      page_quality: 5,
      binding_quality: 4,
      markings: 5,
      discoloration: 4,
      notes: 'Good condition',
    },
    original_price: null,
    price_source: null,
    official_cover_image: null,
  },
};

/**
 * Drive the component from Step 1 → Step 2 → Step 3 (with no MRP).
 * Returns the user-event instance for further interactions.
 */
async function driveToStep3WithNoPrice() {
  const user = userEvent.setup();

  // Mock fetch: upload-images succeeds, scan returns no original_price
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/ai/upload-images')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            public_urls: {
              front_cover: 'https://storage.example.com/front.jpg',
              back_cover: 'https://storage.example.com/back.jpg',
              spine: 'https://storage.example.com/spine.jpg',
              pages: 'https://storage.example.com/pages.jpg',
            },
          }),
      });
    }
    if (url.includes('/api/ai/scan')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(SCAN_RESULT_NO_PRICE),
      });
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'unexpected' }) });
  }) as any;

  render(<CreateListingForm />);

  // Step 1: trigger image upload completion
  const uploadBtn = screen.getByTestId('trigger-upload-complete');
  await user.click(uploadBtn);

  // Step 2: wait for scanning to complete and "Review Details →" button to appear
  await waitFor(
    () => {
      expect(screen.getByText('Review Details →')).toBeInTheDocument();
    },
    { timeout: 5000 }
  );

  // Click "Review Details →" to advance to Step 3
  const reviewBtn = screen.getByText('Review Details →');
  await user.click(reviewBtn);

  // Confirm we are at Step 3 with the price-not-found banner
  await waitFor(() => {
    expect(screen.getByText('⚠️ Original price not found')).toBeInTheDocument();
  });

  return user;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Bug Condition Exploration — Rescan Book Button (Property 1)', () => {
  const mockRouter = { push: vi.fn(), back: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue(mockRouter);
  });

  /**
   * Test case 1 — Rescan Book calls handleImagesComplete (re-triggers scan pipeline)
   *
   * Expected (correct) behavior: clicking "Rescan Book" should call handleImagesComplete,
   * which sets scanning=true and transitions to Step 2 (scanning screen).
   *
   * Bug behavior: setStep(1) is called instead, showing the image uploader (Step 1).
   *
   * EXPECTED TO FAIL on unfixed code.
   */
  it('Test case 1 — Rescan Book transitions to Step 2 scanning screen (not Step 1)', async () => {
    const user = await driveToStep3WithNoPrice();

    // Verify we are at Step 3 with the price-not-found banner
    expect(screen.getByText('⚠️ Original price not found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rescan Book' })).toBeInTheDocument();

    // Reset fetch mock so the next scan call triggers scanning state
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/ai/upload-images')) {
        // Delay to keep scanning state visible long enough to assert
        return new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: () =>
                  Promise.resolve({
                    public_urls: {
                      front_cover: 'https://storage.example.com/front.jpg',
                      back_cover: 'https://storage.example.com/back.jpg',
                      spine: 'https://storage.example.com/spine.jpg',
                      pages: 'https://storage.example.com/pages.jpg',
                    },
                  }),
              }),
            200
          )
        );
      }
      if (url.includes('/api/ai/scan')) {
        return new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: () => Promise.resolve(SCAN_RESULT_NO_PRICE),
              }),
            500
          )
        );
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'unexpected' }) });
    }) as any;

    // Click "Rescan Book"
    const rescanBtn = screen.getByRole('button', { name: 'Rescan Book' });
    await user.click(rescanBtn);

    // EXPECTED (correct): Step 2 scanning screen should appear
    // BUG: Step 1 image uploader appears instead
    await waitFor(() => {
      // The scanning screen (Step 2) should be visible — "Analysing your book..." or "Uploading images..."
      const scanningHeading =
        screen.queryByText('Analysing your book...') ||
        screen.queryByText('Uploading images...');
      expect(scanningHeading).not.toBeNull();
    });

    // The Step 1 image uploader must NOT be rendered
    expect(screen.queryByTestId('book-image-uploader')).toBeNull();
  });

  /**
   * Test case 2 — Rescan Book does not navigate to Step 1
   *
   * Expected (correct) behavior: clicking "Rescan Book" should NOT show the image uploader.
   * The component should be in Step 2 (scanning), not Step 1 (upload).
   *
   * Bug behavior: setStep(1) is called, rendering the BookImageUploader (Step 1).
   *
   * EXPECTED TO FAIL on unfixed code.
   */
  it('Test case 2 — Rescan Book does not render the image uploader (Step 1)', async () => {
    const user = await driveToStep3WithNoPrice();

    // Confirm we are at Step 3
    expect(screen.getByText('⚠️ Original price not found')).toBeInTheDocument();

    // Click "Rescan Book"
    const rescanBtn = screen.getByRole('button', { name: 'Rescan Book' });
    await user.click(rescanBtn);

    // EXPECTED (correct): image uploader (Step 1) must NOT appear
    // BUG: image uploader IS rendered because setStep(1) was called
    expect(screen.queryByTestId('book-image-uploader')).toBeNull();
  });
});
