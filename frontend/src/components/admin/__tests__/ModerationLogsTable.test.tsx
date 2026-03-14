/**
 * Unit Tests: ModerationLogsTable Component
 *
 * Requirements: 9.11, 24.3
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ModerationLogsTable, { ModerationLog } from '../ModerationLogsTable';

const makeMockLog = (overrides: Partial<ModerationLog> = {}): ModerationLog => ({
  id: 'log-1',
  admin_id: 'admin-1',
  action: 'approve_listing',
  target_type: 'listing',
  target_id: 'listing-abc',
  reason: 'Looks good',
  notes: null,
  created_at: '2024-03-01T10:00:00Z',
  admin: { id: 'admin-1', name: 'Alice Admin', email: 'alice@example.com' },
  ...overrides,
});

const makeLogsResponse = (data: ModerationLog[], total = data.length, page = 1) => ({
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

describe('ModerationLogsTable', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn();
  });

  it('renders loading state initially', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {})
    );
    render(<ModerationLogsTable />);
    expect(screen.getByText(/loading moderation logs/i)).toBeInTheDocument();
  });

  it('fetches and displays logs', async () => {
    const log = makeMockLog();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeLogsResponse([log])
    );

    render(<ModerationLogsTable />);

    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    });

    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getAllByText('Approve Listing').length).toBeGreaterThan(0);
    expect(screen.getByText('listing')).toBeInTheDocument();
    expect(screen.getByText('Looks good')).toBeInTheDocument();
  });

  it('displays error state on fetch failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Unauthorized' }),
    });

    render(<ModerationLogsTable />);

    await waitFor(() => {
      expect(screen.getByText(/error loading logs/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Unauthorized')).toBeInTheDocument();
  });

  it('displays empty state when no logs', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeLogsResponse([])
    );

    render(<ModerationLogsTable />);

    await waitFor(() => {
      expect(screen.getByText(/no moderation logs found/i)).toBeInTheDocument();
    });
  });

  it('renders action badge with correct label', async () => {
    const log = makeMockLog({ action: 'suspend_user', target_type: 'user' });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeLogsResponse([log])
    );

    render(<ModerationLogsTable />);

    await waitFor(() => {
      expect(screen.getByText('Suspend User')).toBeInTheDocument();
    });
  });

  it('shows notes when reason is null', async () => {
    const log = makeMockLog({ reason: null, notes: 'Please rescan spine' });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeLogsResponse([log])
    );

    render(<ModerationLogsTable />);

    await waitFor(() => {
      expect(screen.getByText('Please rescan spine')).toBeInTheDocument();
    });
  });

  it('shows dash when both reason and notes are null', async () => {
    const log = makeMockLog({ reason: null, notes: null });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeLogsResponse([log])
    );

    render(<ModerationLogsTable />);

    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    });
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('applies action filter and refetches', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(makeLogsResponse([makeMockLog()]))
      .mockResolvedValueOnce(makeLogsResponse([makeMockLog({ action: 'reject_listing' })]));

    render(<ModerationLogsTable />);

    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    });

    // Change action filter
    fireEvent.change(screen.getByRole('combobox', { name: /filter by action/i }), {
      target: { value: 'reject_listing' },
    });

    // Apply filters
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const lastUrl = calls[calls.length - 1][0] as string;
      expect(lastUrl).toContain('action=reject_listing');
    });
  });

  it('applies target type filter', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(makeLogsResponse([makeMockLog()]))
      .mockResolvedValueOnce(makeLogsResponse([makeMockLog({ target_type: 'user' })]));

    render(<ModerationLogsTable />);

    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('combobox', { name: /filter by target type/i }), {
      target: { value: 'user' },
    });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const lastUrl = calls[calls.length - 1][0] as string;
      expect(lastUrl).toContain('targetType=user');
    });
  });

  it('applies date range filters', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(makeLogsResponse([makeMockLog()]))
      .mockResolvedValueOnce(makeLogsResponse([makeMockLog()]));

    render(<ModerationLogsTable />);

    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/filter from date/i), {
      target: { value: '2024-03-01' },
    });
    fireEvent.change(screen.getByLabelText(/filter to date/i), {
      target: { value: '2024-03-31' },
    });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const lastUrl = calls[calls.length - 1][0] as string;
      expect(lastUrl).toContain('startDate=2024-03-01');
      expect(lastUrl).toContain('endDate=2024-03-31');
    });
  });

  it('shows clear button when filters are active and clears on click', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(makeLogsResponse([makeMockLog()]))
      .mockResolvedValueOnce(makeLogsResponse([makeMockLog()]))
      .mockResolvedValueOnce(makeLogsResponse([makeMockLog()]));

    render(<ModerationLogsTable />);

    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    });

    // No clear button initially
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();

    // Apply a filter
    fireEvent.change(screen.getByRole('combobox', { name: /filter by action/i }), {
      target: { value: 'approve_listing' },
    });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
    });

    // Clear filters
    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const lastUrl = calls[calls.length - 1][0] as string;
      expect(lastUrl).not.toContain('action=');
    });
  });

  it('handles pagination correctly', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [makeMockLog()],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 45,
          totalPages: 3,
          hasNextPage: true,
          hasPreviousPage: false,
        },
      }),
    });

    render(<ModerationLogsTable />);

    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
  });

  it('navigates to next page', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [makeMockLog()],
          pagination: { page: 1, pageSize: 20, total: 25, totalPages: 2, hasNextPage: true, hasPreviousPage: false },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [makeMockLog({ id: 'log-2', admin: { id: 'admin-2', name: 'Bob Admin', email: 'bob@example.com' } })],
          pagination: { page: 2, pageSize: 20, total: 25, totalPages: 2, hasNextPage: false, hasPreviousPage: true },
        }),
      });

    render(<ModerationLogsTable />);

    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const lastUrl = calls[calls.length - 1][0] as string;
      expect(lastUrl).toContain('page=2');
    });
  });

  it('shows empty state with filter hint when filters are active', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(makeLogsResponse([makeMockLog()]))
      .mockResolvedValueOnce(makeLogsResponse([]));

    render(<ModerationLogsTable />);

    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('combobox', { name: /filter by action/i }), {
      target: { value: 'issue_refund' },
    });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    await waitFor(() => {
      expect(screen.getByText(/no moderation logs found/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/try adjusting your filters/i)).toBeInTheDocument();
  });
});
