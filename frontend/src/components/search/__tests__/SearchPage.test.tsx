/**
 * Tests for SearchPage component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SearchPage from '../SearchPage';

// Mock child components to keep tests focused
vi.mock('../SearchBar', () => ({
  default: ({ onSearch, initialQuery }: any) => (
    <div>
      <input
        data-testid="search-input"
        defaultValue={initialQuery}
        onKeyDown={(e) => e.key === 'Enter' && onSearch((e.target as HTMLInputElement).value)}
      />
      <button onClick={() => onSearch('test query')}>Search</button>
    </div>
  ),
}));

vi.mock('../FilterPanel', () => ({
  default: ({ onChange }: any) => (
    <div data-testid="filter-panel">
      <button onClick={() => onChange({ category_id: 'cat-1' })}>Apply Filter</button>
    </div>
  ),
}));

vi.mock('../ListingCard', () => ({
  default: ({ listing, onClick }: any) => (
    <div
      data-testid={`listing-card-${listing.id}`}
      onClick={() => onClick?.(listing)}
    >
      {listing.title}
    </div>
  ),
}));

vi.mock('@/components/listings/ConditionBadge', () => ({
  default: () => <span>Condition</span>,
}));

const mockSearchResult = {
  success: true,
  data: [
    { id: 'l1', title: 'Clean Code', author: 'Martin', final_price: 350, condition_score: 4, images: [], location: { city: 'Mumbai', state: 'MH', pincode: '400001' }, status: 'active' },
    { id: 'l2', title: 'The Pragmatic Programmer', author: 'Hunt', final_price: 450, condition_score: 5, images: [], location: { city: 'Delhi', state: 'DL', pincode: '110001' }, status: 'active' },
  ],
  pagination: { page: 1, page_size: 20, total_hits: 2, total_pages: 1 },
  processing_time_ms: 15,
  cached: false,
};

describe('SearchPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn();
    // Default: categories returns empty, search returns results
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
      }
      return Promise.resolve({ ok: true, json: async () => mockSearchResult });
    });
  });

  it('renders search bar', async () => {
    render(<SearchPage />);
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  it('shows loading skeletons initially', () => {
    // Make fetch hang
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));
    render(<SearchPage />);
    // Skeleton cards should be visible
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays search results after fetch', async () => {
    render(<SearchPage />);
    await waitFor(() => {
      expect(screen.getByTestId('listing-card-l1')).toBeInTheDocument();
      expect(screen.getByTestId('listing-card-l2')).toBeInTheDocument();
    });
  });

  it('shows result count', async () => {
    render(<SearchPage />);
    await waitFor(() => {
      expect(screen.getByText(/2 results/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when no results', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          ...mockSearchResult,
          data: [],
          pagination: { ...mockSearchResult.pagination, total_hits: 0, total_pages: 0 },
        }),
      });
    });

    render(<SearchPage />);
    await waitFor(() => {
      expect(screen.getByText(/no results found/i)).toBeInTheDocument();
    });
  });

  it('shows error state on fetch failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
      }
      return Promise.resolve({ ok: false, json: async () => ({ error: 'Search service unavailable' }) });
    });

    render(<SearchPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/search service unavailable/i).length).toBeGreaterThan(0);
    });
  });

  it('calls onListingClick when a listing card is clicked', async () => {
    const onListingClick = vi.fn();
    render(<SearchPage onListingClick={onListingClick} />);

    await waitFor(() => {
      expect(screen.getByTestId('listing-card-l1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('listing-card-l1'));
    expect(onListingClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'l1' })
    );
  });

  it('shows filter panel', async () => {
    render(<SearchPage />);
    await waitFor(() => {
      expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
    });
  });

  it('shows sort dropdown', async () => {
    render(<SearchPage />);
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /sort results/i })).toBeInTheDocument();
    });
  });

  it('shows pagination when multiple pages', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          ...mockSearchResult,
          pagination: { page: 1, page_size: 20, total_hits: 100, total_pages: 5 },
        }),
      });
    });

    render(<SearchPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous page/i })).toBeInTheDocument();
    });
  });
});
