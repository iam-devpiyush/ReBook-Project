/**
 * NotificationToast Component
 *
 * Displays real-time notifications for listing approvals/rejections,
 * order status updates, and AI scan progress. Auto-dismisses after 5 seconds.
 *
 * Requirements: Real-time notifications UI
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationType = 'listing' | 'order' | 'scan' | 'info' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  /** Auto-dismiss delay in ms (default 5000). Pass 0 to disable. */
  duration?: number;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<NotificationType, { icon: string; bg: string; border: string; titleColor: string }> = {
  listing: { icon: '📋', bg: 'bg-blue-50',   border: 'border-blue-200',  titleColor: 'text-blue-800' },
  order:   { icon: '📦', bg: 'bg-indigo-50', border: 'border-indigo-200', titleColor: 'text-indigo-800' },
  scan:    { icon: '🔍', bg: 'bg-purple-50', border: 'border-purple-200', titleColor: 'text-purple-800' },
  info:    { icon: 'ℹ️',  bg: 'bg-gray-50',   border: 'border-gray-200',   titleColor: 'text-gray-800' },
  error:   { icon: '❌', bg: 'bg-red-50',    border: 'border-red-200',    titleColor: 'text-red-800' },
};

const DEFAULT_DURATION = 5000;

// ---------------------------------------------------------------------------
// Single toast item
// ---------------------------------------------------------------------------

interface ToastItemProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

function ToastItem({ notification, onDismiss }: ToastItemProps) {
  const config = TYPE_CONFIG[notification.type];
  const duration = notification.duration ?? DEFAULT_DURATION;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (duration <= 0) return;
    timerRef.current = setTimeout(() => onDismiss(notification.id), duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [notification.id, duration, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex items-start gap-3 rounded-lg border p-4 shadow-md ${config.bg} ${config.border} max-w-sm w-full`}
    >
      <span className="text-xl shrink-0" aria-hidden="true">{config.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${config.titleColor}`}>{notification.title}</p>
        <p className="text-sm text-gray-700 mt-0.5">{notification.message}</p>
      </div>
      <button
        onClick={() => onDismiss(notification.id)}
        className="shrink-0 text-gray-400 hover:text-gray-600 text-lg leading-none"
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NotificationToast container
// ---------------------------------------------------------------------------

interface NotificationToastProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
}

export default function NotificationToast({
  notifications,
  onDismiss,
  position = 'top-right',
}: NotificationToastProps) {
  const positionClass = {
    'top-right':    'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left':     'top-4 left-4',
    'bottom-left':  'bottom-4 left-4',
  }[position];

  if (notifications.length === 0) return null;

  return (
    <div
      className={`fixed ${positionClass} z-50 flex flex-col gap-2`}
      aria-label="Notifications"
    >
      {notifications.map(n => (
        <ToastItem key={n.id} notification={n} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// useNotifications hook — manages the notification queue
// ---------------------------------------------------------------------------

let _idCounter = 0;

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const push = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = `notif-${++_idCounter}`;
    setNotifications(prev => [...prev, { ...notification, id }]);
    return id;
  }, []);

  /** Convenience: push a listing approval notification */
  const notifyListingApproved = useCallback((listingTitle?: string) => {
    push({
      type: 'listing',
      title: 'Listing Approved',
      message: listingTitle
        ? `"${listingTitle}" is now live on the marketplace.`
        : 'Your listing has been approved and is now live.',
    });
  }, [push]);

  /** Convenience: push a listing rejection notification */
  const notifyListingRejected = useCallback((reason?: string) => {
    push({
      type: 'listing',
      title: 'Listing Rejected',
      message: reason ? `Reason: ${reason}` : 'Your listing was rejected. Please review and resubmit.',
    });
  }, [push]);

  /** Convenience: push a listing rescan notification */
  const notifyRescanRequired = useCallback((notes?: string) => {
    push({
      type: 'listing',
      title: 'Rescan Required',
      message: notes ?? 'Please rescan your book images and resubmit.',
    });
  }, [push]);

  /** Convenience: push an order status notification */
  const notifyOrderStatus = useCallback((status: string, orderId?: string) => {
    const messages: Record<string, string> = {
      paid:      'Payment confirmed. Your order is being processed.',
      shipped:   'Your order has been shipped.',
      delivered: 'Your order has been delivered.',
      cancelled: 'Your order has been cancelled.',
    };
    push({
      type: 'order',
      title: 'Order Update',
      message: messages[status] ?? `Order status changed to: ${status}`,
    });
  }, [push]);

  /** Convenience: push a scan progress notification */
  const notifyScanProgress = useCallback((progress: number, message: string) => {
    push({
      type: 'scan',
      title: `Scanning… ${progress}%`,
      message,
      duration: 3000,
    });
  }, [push]);

  return {
    notifications,
    dismiss,
    push,
    notifyListingApproved,
    notifyListingRejected,
    notifyRescanRequired,
    notifyOrderStatus,
    notifyScanProgress,
  };
}
