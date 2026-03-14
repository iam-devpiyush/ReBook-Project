/**
 * Unit Tests for CreateListingForm Component
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { useRouter } from 'next/navigation';
import CreateListingForm from '../CreateListingForm';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(),
      })),
    })),
    removeChannel: vi.fn(),
  })),
}));

vi.mock('@/lib/auth/hooks', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    isLoading: false,
  })),
}));

vi.mock('@/components/ai-scanner/EnhancedAIScanner', () => {
  return {
    default: function MockEnhancedAIScanner({ onComplete, onCancel }: any) {
      return (
        <div data-testid="mock-ai-scanner">
          <button onClick={() => onComplete(
            {
              detected_isbn: '9780123456789',
              book_metadata: {
                title: 'Test Book',
                author: 'Test Author',
                publisher: 'Test Publisher',
                edition: '1st',
                publication_year: 2020,
              },
              condition_analysis: {
                overall_score: 4,
                cover_damage: 4,
                page_quality: 5,
                binding_quality: 4,
                notes: 'Good condition',
              },
            },
            {
              front_cover: 'https://example.com/front.jpg',
              back_cover: 'https://example.com/back.jpg',
              spine: 'https://example.com/spine.jpg',
              pages: 'https://example.com/pages.jpg',
            }
          )}>
            Complete Scan
          </button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      );
    },
  };
});

describe('CreateListingForm', () => {
  const mockRouter = {
    push: vi.fn(),
    back: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue(mockRouter);
    global.fetch = vi.fn() as any;
  });

  describe('Step 1: AI Scanner', () => {
    it('should render AI scanner on step 1', () => {
      render(<CreateListingForm />);
      
      expect(screen.getByText('Step 1: Scan Your Book')).toBeInTheDocument();
      expect(screen.getByTestId('mock-ai-scanner')).toBeInTheDocument();
    });

    it('should move to step 2 after scan completion', async () => {
      const user = userEvent.setup();
      render(<CreateListingForm />);
      
      const completeScanButton = screen.getByText('Complete Scan');
      await user.click(completeScanButton);
      
      await waitFor(() => {
        expect(screen.getByText('Step 2: Book Details')).toBeInTheDocument();
      });
    });

    it('should auto-fill form fields with scan results', async () => {
      const user = userEvent.setup();
      render(<CreateListingForm />);
      
      const completeScanButton = screen.getByText('Complete Scan');
      await user.click(completeScanButton);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Book')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test Author')).toBeInTheDocument();
        expect(screen.getByDisplayValue('9780123456789')).toBeInTheDocument();
      });
    });
  });

  describe('Step 2: Book Details', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<CreateListingForm />);
      
      const completeScanButton = screen.getByText('Complete Scan');
      await user.click(completeScanButton);
      
      await waitFor(() => {
        expect(screen.getByText('Step 2: Book Details')).toBeInTheDocument();
      });
    });

    it('should display book details form', () => {
      expect(screen.getByPlaceholderText('Enter book title')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter author name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter original price')).toBeInTheDocument();
    });

    it('should navigate back to step 1', async () => {
      const user = userEvent.setup();
      
      const backButton = screen.getByText('Back');
      await user.click(backButton);
      
      await waitFor(() => {
        expect(screen.getByText('Step 1: Scan Your Book')).toBeInTheDocument();
      });
    });
  });

  describe('Progress Indicator', () => {
    it('should show progress indicator with all steps', () => {
      render(<CreateListingForm />);
      
      expect(screen.getByText('Scan')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    it('should highlight current step', async () => {
      const user = userEvent.setup();
      render(<CreateListingForm />);
      
      // Step 1 should be highlighted
      const step1Indicator = screen.getByText('1');
      expect(step1Indicator).toHaveClass('bg-blue-600');
      
      // Complete scan to move to step 2
      const completeScanButton = screen.getByText('Complete Scan');
      await user.click(completeScanButton);
      
      await waitFor(() => {
        const step2Indicator = screen.getByText('2');
        expect(step2Indicator).toHaveClass('bg-blue-600');
      });
    });
  });
});
