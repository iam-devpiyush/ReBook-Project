/**
 * Tests for CheckoutPage component (dummy payment gateway)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckoutPage, { OrderSummary } from '../CheckoutPage';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockOrder: OrderSummary = {
  orderId: 'order-uuid-1',
  bookTitle: 'Introduction to Algorithms',
  bookAuthor: 'Cormen et al.',
  sellerName: 'Test Seller',
  pricing: {
    original_price: 1000,
    condition_multiplier: 0.7,
    base_price: 700,
    delivery_cost: 80,
    platform_commission: 70,
    payment_fees: 28,
    final_price: 878,
    seller_payout: 630,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CheckoutPage', () => {
  it('renders order summary with book details', () => {
    render(<CheckoutPage order={mockOrder} />);
    expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
    expect(screen.getByText('by Cormen et al.')).toBeInTheDocument();
    expect(screen.getByText('Seller: Test Seller')).toBeInTheDocument();
  });

  it('renders pricing breakdown', () => {
    render(<CheckoutPage order={mockOrder} />);
    expect(screen.getByText('Pricing Breakdown')).toBeInTheDocument();
  });

  it('shows pay button with correct amount', () => {
    render(<CheckoutPage order={mockOrder} />);
    expect(screen.getByRole('button', { name: /Pay ₹878\.00/i })).toBeEnabled();
  });

  it('shows demo mode notice', () => {
    render(<CheckoutPage order={mockOrder} />);
    expect(screen.getByText(/Demo mode/i)).toBeInTheDocument();
  });

  it('calls create-intent API on pay click', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { paymentIntentId: 'dummy_order_abc123', status: 'completed', amount: 87800, currency: 'INR' },
      }),
    });

    render(<CheckoutPage order={mockOrder} />);
    fireEvent.click(screen.getByRole('button', { name: /Pay ₹878\.00/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/payments/create-intent',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('shows success state after payment', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { paymentIntentId: 'dummy_order_abc123', status: 'completed', amount: 87800, currency: 'INR' },
      }),
    });

    const onSuccess = vi.fn();
    render(<CheckoutPage order={mockOrder} onSuccess={onSuccess} />);
    fireEvent.click(screen.getByRole('button', { name: /Pay ₹878\.00/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('dummy_order_abc123');
    });

    await waitFor(() => {
      expect(screen.getByText('Payment Successful')).toBeInTheDocument();
    });
  });

  it('shows error message when API fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Order not found' }),
    });

    const onFailure = vi.fn();
    render(<CheckoutPage order={mockOrder} onFailure={onFailure} />);
    fireEvent.click(screen.getByRole('button', { name: /Pay ₹878\.00/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Order not found');
    });
    expect(onFailure).toHaveBeenCalledWith('Order not found');
  });

  it('shows book image when provided', () => {
    const orderWithImage = { ...mockOrder, bookImage: 'https://example.com/book.jpg' };
    render(<CheckoutPage order={orderWithImage} />);
    expect(screen.getByAltText('Introduction to Algorithms')).toHaveAttribute('src', 'https://example.com/book.jpg');
  });

  it('disables button while processing', async () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {})); // never resolves

    render(<CheckoutPage order={mockOrder} />);
    fireEvent.click(screen.getByRole('button', { name: /Pay ₹878\.00/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Processing/i })).toBeDisabled();
    });
  });
});
