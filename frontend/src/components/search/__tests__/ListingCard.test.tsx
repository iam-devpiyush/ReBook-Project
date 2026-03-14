/**
 * Tests for ListingCard component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect } from 'vitest';
import ListingCard from '../ListingCard';
import type { ListingDocument } from '@/services/search.service';

const mockListing: ListingDocument = {
  id: 'listing-1',
  book_id: 'book-1',
  seller_id: 'seller-1',
  title: 'Clean Code',
  author: 'Robert C. Martin',
  status: 'active',
  category_id: 'cat-1',
  condition_score: 4,
  final_price: 350,
  original_price: 800,
  delivery_cost: 50,
  images: ['https://example.com/cover.jpg'],
  location: { city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('ListingCard', () => {
  it('renders book title and author', () => {
    render(<ListingCard listing={mockListing} />);
    expect(screen.getByText('Clean Code')).toBeInTheDocument();
    expect(screen.getByText('Robert C. Martin')).toBeInTheDocument();
  });

  it('renders formatted price', () => {
    render(<ListingCard listing={mockListing} />);
    expect(screen.getByText('₹350')).toBeInTheDocument();
  });

  it('renders location', () => {
    render(<ListingCard listing={mockListing} />);
    expect(screen.getByText(/Mumbai.*Maharashtra/)).toBeInTheDocument();
  });

  it('renders book image when available', () => {
    render(<ListingCard listing={mockListing} />);
    const img = screen.getByAltText(/Cover of Clean Code/i);
    expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg');
  });

  it('renders placeholder when no image', () => {
    render(<ListingCard listing={{ ...mockListing, images: [] }} />);
    expect(screen.queryByRole('img', { name: /cover/i })).not.toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const onClick = vi.fn();
    render(<ListingCard listing={mockListing} onClick={onClick} />);
    fireEvent.click(screen.getByRole('article'));
    expect(onClick).toHaveBeenCalledWith(mockListing);
  });

  it('calls onClick on Enter key press', () => {
    const onClick = vi.fn();
    render(<ListingCard listing={mockListing} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('article'), { key: 'Enter' });
    expect(onClick).toHaveBeenCalledWith(mockListing);
  });

  it('shows distance when distanceKm is provided', () => {
    render(<ListingCard listing={mockListing} distanceKm={5.3} />);
    expect(screen.getByText('5.3km')).toBeInTheDocument();
  });

  it('shows meters for distances under 1km', () => {
    render(<ListingCard listing={mockListing} distanceKm={0.45} />);
    expect(screen.getByText('450m')).toBeInTheDocument();
  });

  it('has correct aria-label', () => {
    render(<ListingCard listing={mockListing} />);
    expect(
      screen.getByRole('article', { name: /Clean Code by Robert C. Martin/i })
    ).toBeInTheDocument();
  });
});
