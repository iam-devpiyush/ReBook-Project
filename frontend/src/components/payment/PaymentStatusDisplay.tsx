/**
 * PaymentStatusDisplay Component
 *
 * Shows payment status, method, and transaction ID.
 *
 * Requirements: Payment status display
 */

'use client';

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

interface PaymentStatusDisplayProps {
  status: PaymentStatus;
  paymentId?: string;
  paymentMethod?: string;
  amount?: number;
  currency?: string;
}

const STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; color: string; bg: string; icon: string }
> = {
  pending: {
    label: 'Payment Pending',
    color: 'text-yellow-700',
    bg: 'bg-yellow-50 border-yellow-200',
    icon: '⏳',
  },
  processing: {
    label: 'Processing Payment',
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
    icon: '🔄',
  },
  completed: {
    label: 'Payment Successful',
    color: 'text-green-700',
    bg: 'bg-green-50 border-green-200',
    icon: '✅',
  },
  failed: {
    label: 'Payment Failed',
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
    icon: '❌',
  },
  refunded: {
    label: 'Payment Refunded',
    color: 'text-purple-700',
    bg: 'bg-purple-50 border-purple-200',
    icon: '↩️',
  },
};

export default function PaymentStatusDisplay({
  status,
  paymentId,
  paymentMethod,
  amount,
  currency = 'INR',
}: PaymentStatusDisplayProps) {
  const config = STATUS_CONFIG[status];

  const formatAmount = (amt: number, curr: string) => {
    if (curr === 'INR') return `₹${amt.toFixed(2)}`;
    return `${curr} ${amt.toFixed(2)}`;
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-lg border p-6 ${config.bg}`}
      data-testid="payment-status-display"
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl" aria-hidden="true">
          {config.icon}
        </span>
        <h2 className={`text-xl font-bold ${config.color}`}>{config.label}</h2>
      </div>

      <div className="space-y-2 text-sm">
        {amount !== undefined && (
          <div className="flex justify-between">
            <span className="text-gray-600">Amount</span>
            <span className="font-semibold text-gray-900">
              {formatAmount(amount, currency)}
            </span>
          </div>
        )}

        {paymentMethod && (
          <div className="flex justify-between">
            <span className="text-gray-600">Payment Method</span>
            <span className="font-medium text-gray-800 capitalize">{paymentMethod}</span>
          </div>
        )}

        {paymentId && (
          <div className="flex justify-between items-start gap-4">
            <span className="text-gray-600 shrink-0">Transaction ID</span>
            <span
              className="font-mono text-xs text-gray-700 break-all text-right"
              data-testid="transaction-id"
            >
              {paymentId}
            </span>
          </div>
        )}
      </div>

      {status === 'completed' && (
        <p className="mt-4 text-sm text-green-700">
          Your order has been confirmed. You will receive a confirmation shortly.
        </p>
      )}

      {status === 'failed' && (
        <p className="mt-4 text-sm text-red-700">
          Your payment could not be processed. Please try again or use a different payment method.
        </p>
      )}

      {status === 'refunded' && (
        <p className="mt-4 text-sm text-purple-700">
          Your refund has been initiated. It may take 5-7 business days to reflect in your account.
        </p>
      )}
    </div>
  );
}
