/**
 * Unit Tests: PendingListingsTable Component
 *
 * Tests for the admin pending listings table component.
 * Requirements: 9.2, 3.3-3.8
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PendingListingsTable from '../PendingListingsTable';
import { ListingWithBook } from '@/types/listing';

const mockListing: ListingWithBook = {
  id: 'listing-1',
  book_id: 'book-1',
  seller_id: 'seller-1',
  original_price: 500,
  condition_score: 4,
  condition_details: null,
  suggested_price: null,
  final_price: 450,
  delivery_cost: 50,
  platform_commission: 45,
  payment_fees: 15,
  seller_payout: 340,
  status: 'pending_approval',
  rejection_reason: null,
  images: ['https://example.com/image1.jpg'],
  location: { city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  approved_at: null,
  approved_by: null,
  views: 0,
  is_featured: false,
  book: {
    id: 'book-1',
    isbn: '9781234567890',
    title: 'Introduction to Algorithms',
    author: 'Thomas H. Cormen',
    publisher: 'MIT Press',
    edition: '3rd',
    publication_year: 2009,
    category_id: 'cat-1',
    subject: 'Computer Science',
    description: 'A comprehensive textbook',
    cover_image: 'https://example.com/cover.jpg',
  },
  seller: {
    id: 'seller-1',
    name: 'John Doe',
    email: 'john@example.com',
    profile_picture: 'https://example.com/profile.jpg',
    rating: 4.5,
  },
};

const makeListResponse = (data: ListingWithBook[], total = data.length, page = 1) => ({
  ok: true,
  json: async () => ({
    success: true,
    data,
    pagination: {
      page,
      pageSize: 20,
      total,
      totalPages: Math.max(1, Math.ceil(total / 20)),
      hasNextPage: total > page * 20,
      hasPreviousPage: page > 1,
    },
  }),
});

const makeActionResponse = (listing: ListingWithBook, status: string) => ({
  ok: true,
  json: async () => ({ success: true, data: { ...listing, status } }),
});

describe('PendingListingsTable', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn();
  });

  it('renders loading state initially', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    render(<PendingListingsTable />);
    expect(screen.getByText(/loading pending listings/i)).toBeInTheDocument();
  });

  it('fetches and displays pending listings', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeListResponse([mockListing])
    );

    render(<PendingListingsTable />);

    await waitFor(() => {
      expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
    });

    expect(screen.getByText('Thomas H. Cormen')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('₹450')).toBeInTheDocument();
  });

  it('displays error message on fetch failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to fetch listings' }),
    });

    render(<PendingListingsTable />);

    await waitFor(() => {
      expect(screen.getByText(/error loading listings/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Failed to fetch listings')).toBeInTheDocument();
  });

  it('displays empty state when no listings', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeListResponse([])
    );

    render(<PendingListingsTable />);

    await waitFor(() => {
      expect(screen.getByText(/no pending listings/i)).toBeInTheDocument();
    });
  });

  it('calls approve API when approve button clicked', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(makeListResponse([mockListing]))
      .mockResolvedValueOnce(makeActionResponse(mockListing, 'active'))
      .mockResolvedValueOnce(makeListResponse([]));

    render(<PendingListingsTable />);

    await waitFor(() => {
      expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /approve listing/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/listings/listing-1/approve',
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  it('opens rejection modal when reject button clicked', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeListResponse([mockListing])
    );

    render(<PendingListingsTable />);

    await waitFor(() => {
      expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /reject listing/i }));

    // Modal heading
    expect(screen.getAllByText('Reject Listing').length).toBeGreaterThan(0);
    expect(
      screen.getByPlaceholderText(/explain why this listing is being rejected/i)
    ).toBeInTheDocument();
  });

  it('validates rejection reason is required', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeListResponse([mockListing])
    );

    render(<PendingListingsTable />);

    await waitFor(() => {
      expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
    });

    // Open modal
    fireEvent.click(screen.getByRole('button', { name: /reject listing/i }));

    // Submit without reason — click the modal submit button (last button with that label)
    const rejectButtons = screen.getAllByRole('button', { name: /reject listing/i });
    fireEvent.click(rejectButtons[rejectButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText('Rejection reason is required')).toBeInTheDocument();
    });
  });

  it('submits rejection with reason', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(makeListResponse([mockListing]))
      .mockResolvedValueOnce(makeActionResponse(mockListing, 'rejected'))
      .mockResolvedValueOnce(makeListResponse([]));

    render(<PendingListingsTable />);

    await waitFor(() => {
      expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /reject listing/i }));

    const textarea = screen.getByPlaceholderText(/explain why this listing is being rejected/i);
    fireEvent.change(textarea, { target: { value: 'Poor image quality' } });

    const rejectButtons = screen.getAllByRole('button', { name: /reject listing/i });
    fireEvent.click(rejectButtons[rejectButtons.length - 1]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/listings/listing-1/reject',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Poor image quality' }),
        })
      );
    });
  });

  it('opens rescan modal when rescan button clicked', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeListResponse([mockListing])
    );

    render(<PendingListingsTable />);

    await waitFor(() => {
      expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /request rescan/i }));

    expect(screen.getAllByText('Request Rescan').length).toBeGreaterThan(0);
    expect(
      screen.getByPlaceholderText(/describe what needs to be rescanned/i)
    ).toBeInTheDocument();
  });

  it('submits rescan request with optional notes', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(makeListResponse([mockListing]))
      .mockResolvedValueOnce(makeActionResponse(mockListing, 'rescan_required'))
      .mockResolvedValueOnce(makeListResponse([]));

    render(<PendingListingsTable />);

    await waitFor(() => {
      expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /request rescan/i }));

    const textarea = screen.getByPlaceholderText(/describe what needs to be rescanned/i);
    fireEvent.change(textarea, { target: { value: 'Please capture clearer spine image' } });

    const rescanButtons = screen.getAllByRole('button', { name: /request rescan/i });
    fireEvent.click(rescanButtons[rescanButtons.length - 1]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/listings/listing-1/request-rescan',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: 'Please capture clearer spine image' }),
        })
      );
    });
  });

  it('handles pagination correctly', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [mockListing],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 25,
          totalPages: 2,
          hasNextPage: true,
          hasPreviousPage: false,
        },
      }),
    });

    render(<PendingListingsTable />);

    await waitFor(() => {
      expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
    });

    // Pagination text is split across elements, use a function matcher
    expect(
      screen.getByText((_, el) => el?.textContent?.replace(/\s+/g, ' ').trim() === 'Showing 1–20 of 25 listings')
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
  });

  it('calls onActionComplete callback after successful action', async () => {
    const onActionComplete = vi.fn();

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(makeListResponse([mockListing]))
      .mockResolvedValueOnce(makeActionResponse(mockListing, 'active'))
      .mockResolvedValueOnce(makeListResponse([]));

    render(<PendingListingsTable onActionComplete={onActionComplete} />);

    await waitFor(() => {
      expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /approve listing/i }));

    await waitFor(() => {
      expect(onActionComplete).toHaveBeenCalledTimes(1);
    });
  });
});
