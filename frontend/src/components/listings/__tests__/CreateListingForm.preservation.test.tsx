/**
 * Preservation Tests — Rescan Book Button Fix
 *
 * Property 2: Preservation — Other Buttons and Flows Are Unaffected
 *
 * These tests MUST PASS on unfixed code — they document baseline behavior to preserve.
 * They verify that the fix does NOT break any existing button handlers or flow transitions.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { render, screen, waitFor } from '@testing-library/react';
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
  default: function MockBookImageUploader({
    onComplete,
  }: {
    onComplete: (images: any) => void;
    onCancel: () => void;
  }) {
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

// ── Scan result fixtures ──────────────────────────────────────────────────────

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

/** Scan result where original_price is a positive number — no price-not-found banner */
const SCAN_RESULT_WITH_PRICE = {
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
      price_source: 'cover_price',
      original_price: 499,
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
    original_price: 499,
    price_source: 'cover_price',
    official_cover_image: null,
  },
};

// ── Fetch mock helpers ────────────────────────────────────────────────────────

function mockFetchWithScanResult(
  scanResult: typeof SCAN_RESULT_NO_PRICE | typeof SCAN_RESULT_WITH_PRICE
) {
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
        json: () => Promise.resolve(scanResult),
      });
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'unexpected' }) });
  }) as any;
}

/** Scan mock that fails — triggers the Step 2 scan error screen */
function mockFetchWithScanError() {
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
        ok: false,
        json: () => Promise.resolve({ error: 'Scan failed' }),
      });
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'unexpected' }) });
  }) as any;
}

// ── Drive helpers ─────────────────────────────────────────────────────────────

/**
 * Drive the component from Step 1 → Step 2 scanning error screen.
 * Returns the user-event instance for further interactions.
 */
async function driveToStep2ScanError() {
  const user = userEvent.setup();
  mockFetchWithScanError();

  render(<CreateListingForm />);

  // Step 1: trigger image upload completion
  const uploadBtn = screen.getByTestId('trigger-upload-complete');
  await user.click(uploadBtn);

  // Wait for scan error screen — "Scan failed" heading (h2) appears
  await waitFor(
    () => {
      expect(screen.getByRole('heading', { name: 'Scan failed' })).toBeInTheDocument();
    },
    { timeout: 10000 }
  );

  return user;
}

/**
 * Drive the component from Step 1 → Step 2 → Step 3 (with no MRP).
 * Returns the user-event instance for further interactions.
 */
async function driveToStep3WithNoPrice() {
  const user = userEvent.setup();
  mockFetchWithScanResult(SCAN_RESULT_NO_PRICE);

  render(<CreateListingForm />);

  // Step 1: trigger image upload completion
  const uploadBtn = screen.getByTestId('trigger-upload-complete');
  await user.click(uploadBtn);

  // Step 2: wait for "Review Details →" button
  await waitFor(
    () => {
      expect(screen.getByText('Review Details →')).toBeInTheDocument();
    },
    { timeout: 10000 }
  );

  // Click "Review Details →" to advance to Step 3
  await user.click(screen.getByText('Review Details →'));

  // Confirm we are at Step 3 with the price-not-found banner
  await waitFor(
    () => {
      expect(screen.getByText('⚠️ Original price not found')).toBeInTheDocument();
    },
    { timeout: 5000 }
  );

  return user;
}

/**
 * Drive the component from Step 1 → Step 2 → Step 3 (with valid MRP).
 * Returns the user-event instance for further interactions.
 */
async function driveToStep3WithPrice() {
  const user = userEvent.setup();
  mockFetchWithScanResult(SCAN_RESULT_WITH_PRICE);

  render(<CreateListingForm />);

  // Step 1: trigger image upload completion
  const uploadBtn = screen.getByTestId('trigger-upload-complete');
  await user.click(uploadBtn);

  // Step 2: wait for "Review Details →" button
  await waitFor(
    () => {
      expect(screen.getByText('Review Details →')).toBeInTheDocument();
    },
    { timeout: 10000 }
  );

  // Click "Review Details →" to advance to Step 3
  await user.click(screen.getByText('Review Details →'));

  // Confirm we are at Step 3 (Book Details heading)
  await waitFor(
    () => {
      expect(screen.getByText('Book Details')).toBeInTheDocument();
    },
    { timeout: 5000 }
  );

  return user;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Preservation Tests — Other Buttons and Flows Are Unaffected (Property 2)', () => {
  const mockRouter = { push: vi.fn(), back: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue(mockRouter);
  });

  /**
   * Requirement 3.1 — Step 2 "Rescan (same images)" button re-triggers scan pipeline
   *
   * When the AI scan fails at Step 2 and the user clicks "Rescan (same images)",
   * the system SHALL re-trigger the AI scan using the already-uploaded images
   * without navigating to Step 1.
   *
   * Validates: Requirement 3.1
   */
  it(
    'Req 3.1 — Step 2 "Rescan (same images)" button re-triggers scan (Step 2 scanning screen appears)',
    async () => {
      const user = await driveToStep2ScanError();

      // Confirm we are on the Step 2 scan error screen
      expect(screen.getByRole('heading', { name: 'Scan failed' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Rescan (same images)' })).toBeInTheDocument();

      // Set up a slow scan so we can observe the scanning state
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/ai/upload-images')) {
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

      // Click "Rescan (same images)"
      await user.click(screen.getByRole('button', { name: 'Rescan (same images)' }));

      // The scanning screen (Step 2) should appear — NOT the image uploader (Step 1)
      await waitFor(
        () => {
          const scanningHeading =
            screen.queryByText('Analysing your book...') ||
            screen.queryByText('Uploading images...');
          expect(scanningHeading).not.toBeNull();
        },
        { timeout: 5000 }
      );

      // Step 1 image uploader must NOT be rendered
      expect(screen.queryByTestId('book-image-uploader')).toBeNull();
    },
    20000
  );

  /**
   * Requirement 3.2 — Step 2 "Upload new images" button navigates to Step 1
   *
   * When the AI scan fails at Step 2 and the user clicks "Upload new images",
   * the system SHALL navigate back to Step 1 to allow re-uploading.
   *
   * Validates: Requirement 3.2
   */
  it(
    'Req 3.2 — Step 2 "Upload new images" button shows Step 1 image uploader',
    async () => {
      const user = await driveToStep2ScanError();

      // Confirm we are on the Step 2 scan error screen
      expect(screen.getByRole('heading', { name: 'Scan failed' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Upload new images' })).toBeInTheDocument();

      // Click "Upload new images"
      await user.click(screen.getByRole('button', { name: 'Upload new images' }));

      // Step 1 image uploader MUST appear
      expect(screen.getByTestId('book-image-uploader')).toBeInTheDocument();

      // Step 2 scan error screen must NOT be visible
      expect(screen.queryByRole('heading', { name: 'Scan failed' })).toBeNull();
    },
    20000
  );

  /**
   * Requirement 3.4 — Step 3 bottom "Rescan" button navigates to Step 1
   *
   * When the user is at Step 3 and clicks the "Rescan" button at the bottom of the form,
   * the system SHALL navigate back to Step 1 (this button is intentionally for uploading new images).
   *
   * Validates: Requirement 3.4
   */
  it(
    'Req 3.4 — Step 3 bottom "Rescan" button shows Step 1 image uploader',
    async () => {
      const user = await driveToStep3WithNoPrice();

      // Confirm we are at Step 3
      expect(screen.getByText('Book Details')).toBeInTheDocument();

      // The bottom "Rescan" button (not the banner "Rescan Book" button)
      const rescanBtn = screen.getByRole('button', { name: 'Rescan' });
      expect(rescanBtn).toBeInTheDocument();

      // Click the bottom "Rescan" button
      await user.click(rescanBtn);

      // Step 1 image uploader MUST appear
      expect(screen.getByTestId('book-image-uploader')).toBeInTheDocument();

      // Step 3 must NOT be visible
      expect(screen.queryByText('Book Details')).toBeNull();
    },
    20000
  );

  /**
   * Requirement 3.3 — Price-not-found banner is NOT shown when MRP is present
   *
   * When the AI scan completes with a detected MRP, the price-not-found warning banner
   * and "Rescan Book" button SHALL NOT be rendered.
   *
   * Validates: Requirement 3.3
   */
  it(
    'Req 3.3 — With valid MRP, price-not-found banner and "Rescan Book" button are not rendered',
    async () => {
      await driveToStep3WithPrice();

      // Confirm we are at Step 3
      expect(screen.getByText('Book Details')).toBeInTheDocument();

      // Price-not-found banner must NOT be rendered
      expect(screen.queryByText('⚠️ Original price not found')).toBeNull();

      // "Rescan Book" button must NOT be rendered
      expect(screen.queryByRole('button', { name: 'Rescan Book' })).toBeNull();

      // The MRP should be visible in the AI-extracted card
      expect(screen.getByText('₹499')).toBeInTheDocument();
    },
    20000
  );
});
