/**
 * Tests for PaymentStatusDisplay component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PaymentStatusDisplay from '../PaymentStatusDisplay';

describe('PaymentStatusDisplay', () => {
  it('shows completed status correctly', () => {
    render(
      <PaymentStatusDisplay
        status="completed"
        paymentId="pay_abc123"
        amount={878}
        currency="INR"
      />
    );
    expect(screen.getByText('Payment Successful')).toBeInTheDocument();
    expect(screen.getByTestId('transaction-id')).toHaveTextContent('pay_abc123');
    expect(screen.getByText('₹878.00')).toBeInTheDocument();
  });

  it('shows failed status correctly', () => {
    render(<PaymentStatusDisplay status="failed" />);
    expect(screen.getByText('Payment Failed')).toBeInTheDocument();
    expect(screen.getByText(/could not be processed/i)).toBeInTheDocument();
  });

  it('shows pending status correctly', () => {
    render(<PaymentStatusDisplay status="pending" amount={500} />);
    expect(screen.getByText('Payment Pending')).toBeInTheDocument();
    expect(screen.getByText('₹500.00')).toBeInTheDocument();
  });

  it('shows processing status correctly', () => {
    render(<PaymentStatusDisplay status="processing" />);
    expect(screen.getByText('Processing Payment')).toBeInTheDocument();
  });

  it('shows refunded status with message', () => {
    render(<PaymentStatusDisplay status="refunded" amount={878} />);
    expect(screen.getByText('Payment Refunded')).toBeInTheDocument();
    expect(screen.getByText(/5-7 business days/i)).toBeInTheDocument();
  });

  it('shows payment method when provided', () => {
    render(<PaymentStatusDisplay status="completed" paymentMethod="upi" />);
    expect(screen.getByText('upi')).toBeInTheDocument();
  });

  it('does not show transaction ID when not provided', () => {
    render(<PaymentStatusDisplay status="completed" />);
    expect(screen.queryByTestId('transaction-id')).not.toBeInTheDocument();
  });

  it('has accessible role=status', () => {
    render(<PaymentStatusDisplay status="completed" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('formats non-INR currency correctly', () => {
    render(<PaymentStatusDisplay status="completed" amount={100} currency="USD" />);
    expect(screen.getByText('USD 100.00')).toBeInTheDocument();
  });
});
