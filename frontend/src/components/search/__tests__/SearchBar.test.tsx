/**
 * Tests for SearchBar component
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SearchBar from '../SearchBar';

describe('SearchBar', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn();
  });

  it('renders search input with placeholder', () => {
    render(<SearchBar onSearch={vi.fn()} />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search books/i)).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(<SearchBar onSearch={vi.fn()} placeholder="Find a book..." />);
    expect(screen.getByPlaceholderText('Find a book...')).toBeInTheDocument();
  });

  it('renders with initial query', () => {
    render(<SearchBar onSearch={vi.fn()} initialQuery="physics" />);
    expect(screen.getByRole('searchbox')).toHaveValue('physics');
  });

  it('calls onSearch when form is submitted', () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'clean code' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(onSearch).toHaveBeenCalledWith('clean code');
  });

  it('calls onSearch when Search button is clicked', () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'math' } });
    fireEvent.click(screen.getByRole('button', { name: /submit search/i }));
    expect(onSearch).toHaveBeenCalledWith('math');
  });

  it('trims whitespace from query before calling onSearch', () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '  physics  ' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(onSearch).toHaveBeenCalledWith('physics');
  });

  it('shows clear button when query is non-empty', () => {
    render(<SearchBar onSearch={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'test' } });
    expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
  });

  it('clears input when clear button is clicked', () => {
    render(<SearchBar onSearch={vi.fn()} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: /clear search/i }));
    expect(input).toHaveValue('');
  });

  it('fetches and shows autocomplete suggestions', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: ['Clean Code', 'Robert Martin'] }),
    });

    render(<SearchBar onSearch={vi.fn()} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'cle' } });

    await waitFor(() => {
      expect(screen.getByText('Clean Code')).toBeInTheDocument();
      expect(screen.getByText('Robert Martin')).toBeInTheDocument();
    });
  });

  it('does not fetch suggestions for queries shorter than 2 chars', async () => {
    render(<SearchBar onSearch={vi.fn()} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'c' } });
    await act(async () => { await new Promise((r) => setTimeout(r, 400)); });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('calls onSearch when a suggestion is clicked', async () => {
    const onSearch = vi.fn();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: ['Clean Code'] }),
    });

    render(<SearchBar onSearch={onSearch} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'cle' } });

    await waitFor(() => {
      expect(screen.getByText('Clean Code')).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByText('Clean Code'));
    expect(onSearch).toHaveBeenCalledWith('Clean Code');
  });

  it('navigates suggestions with arrow keys', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: ['Option A', 'Option B'] }),
    });

    render(<SearchBar onSearch={vi.fn()} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'opt' } });

    await waitFor(() => {
      expect(screen.getByText('Option A')).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('option', { name: 'Option A' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('option', { name: 'Option B' })).toHaveAttribute('aria-selected', 'true');
  });

  it('closes suggestions on Escape key', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: ['Clean Code'] }),
    });

    render(<SearchBar onSearch={vi.fn()} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'cle' } });

    await waitFor(() => {
      expect(screen.getByText('Clean Code')).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByText('Clean Code')).not.toBeInTheDocument();
  });
});
