/**
 * Unit tests for AdminDashboard component
 *
 * Requirements: 9.1, 9.12
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AdminDashboard from '../AdminDashboard';

// ─── Mock recharts to avoid canvas issues in jsdom ────────────────────────────
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Line: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockStats = {
  total_books_listed: 120,
  total_books_sold: 45,
  active_listings: 75,
  total_users: 200,
  total_buyers: 150,
  total_sellers: 50,
  revenue_generated: 48500.5,
  platform_commission_earned: 4850.05,
  trees_saved: 1.5,
  water_saved_liters: 2250,
  co2_reduced_kg: 112.5,
  charts: {
    daily_sales: [{ date: '2024-01-01', count: 3 }],
    listings_per_day: [{ date: '2024-01-01', count: 5 }],
    revenue_by_category: [{ category: 'School', revenue: 1200 }],
  },
};

const mockAnalytics = {
  dailySales: [{ date: '2024-01-01', count: 3 }],
  listingsPerDay: [{ date: '2024-01-01', count: 5 }],
  revenueByCategory: [{ categoryId: '1', categoryName: 'School', revenue: 1200 }],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows a loading spinner while fetching data', () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as any;
    render(<AdminDashboard />);
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('renders key metric cards after successful fetch', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: mockStats }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: mockAnalytics }) }) as any;

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Total Books Listed')).toBeTruthy();
      expect(screen.getByText('120')).toBeTruthy();
    });

    expect(screen.getByText('Books Sold')).toBeTruthy();
    expect(screen.getByText('45')).toBeTruthy();
    expect(screen.getByText('Active Listings')).toBeTruthy();
    expect(screen.getByText('75')).toBeTruthy();
    expect(screen.getByText('Total Users')).toBeTruthy();
    expect(screen.getByText('200')).toBeTruthy();
  });

  it('displays revenue metrics in Indian Rupees', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: mockStats }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: mockAnalytics }) }) as any;

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Total Revenue Generated')).toBeTruthy();
    });

    // Revenue should be formatted with ₹ symbol (multiple revenue cards may show ₹)
    const revenueEls = screen.getAllByText(/₹/);
    expect(revenueEls.length).toBeGreaterThan(0);
  });

  it('displays environmental impact metrics', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: mockStats }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: mockAnalytics }) }) as any;

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Trees Saved')).toBeTruthy();
      expect(screen.getByText('Water Saved')).toBeTruthy();
      expect(screen.getByText('CO₂ Reduced')).toBeTruthy();
    });

    expect(screen.getByText('1.50')).toBeTruthy();
  });

  it('renders chart sections', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: mockStats }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: mockAnalytics }) }) as any;

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Daily Sales (last 30 days)')).toBeTruthy();
      expect(screen.getByText('Listings Per Day (last 30 days)')).toBeTruthy();
      expect(screen.getByText('Revenue by Category')).toBeTruthy();
    });
  });

  it('shows an error banner when the stats fetch fails', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, statusText: 'Unauthorized' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: mockAnalytics }) }) as any;

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch stats/)).toBeTruthy();
    });
  });

  it('shows empty chart placeholder when no data is available', async () => {
    const emptyStats = {
      ...mockStats,
      charts: {
        daily_sales: [],
        listings_per_day: [],
        revenue_by_category: [],
      },
    };
    const emptyAnalytics = {
      dailySales: [],
      listingsPerDay: [],
      revenueByCategory: [],
    };

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: emptyStats }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: emptyAnalytics }) }) as any;

    render(<AdminDashboard />);

    await waitFor(() => {
      const noDataMessages = screen.getAllByText('No data available');
      expect(noDataMessages.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('shows seller/buyer breakdown in users metric', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: mockStats }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: mockAnalytics }) }) as any;

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('50 sellers · 150 buyers')).toBeTruthy();
    });
  });
});
