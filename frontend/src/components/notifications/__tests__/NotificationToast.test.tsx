/**
 * Unit Tests for NotificationToast Component and useNotifications hook
 *
 * Requirements: Real-time notifications UI (Task 46.3)
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import NotificationToast, {
    useNotifications,
    type Notification,
} from '../NotificationToast';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNotification(overrides: Partial<Notification> = {}): Notification {
    return {
        id: 'test-1',
        type: 'info',
        title: 'Test Title',
        message: 'Test message',
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// NotificationToast rendering
// ---------------------------------------------------------------------------

describe('NotificationToast', () => {
    it('renders nothing when notifications array is empty', () => {
        const { container } = render(
            <NotificationToast notifications={[]} onDismiss={vi.fn()} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders a notification with title and message', () => {
        const n = makeNotification({ title: 'Hello', message: 'World' });
        render(<NotificationToast notifications={[n]} onDismiss={vi.fn()} />);
        expect(screen.getByText('Hello')).toBeInTheDocument();
        expect(screen.getByText('World')).toBeInTheDocument();
    });

    it('renders multiple notifications', () => {
        const notifications: Notification[] = [
            makeNotification({ id: '1', title: 'First' }),
            makeNotification({ id: '2', title: 'Second' }),
        ];
        render(<NotificationToast notifications={notifications} onDismiss={vi.fn()} />);
        expect(screen.getByText('First')).toBeInTheDocument();
        expect(screen.getByText('Second')).toBeInTheDocument();
    });

    it('calls onDismiss with the notification id when dismiss button is clicked', () => {
        const onDismiss = vi.fn();
        const n = makeNotification({ id: 'abc-123' });
        render(<NotificationToast notifications={[n]} onDismiss={onDismiss} />);
        fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
        expect(onDismiss).toHaveBeenCalledWith('abc-123');
    });

    it('has role="alert" on each toast item for accessibility', () => {
        const n = makeNotification();
        render(<NotificationToast notifications={[n]} onDismiss={vi.fn()} />);
        expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('applies top-right position class by default', () => {
        const n = makeNotification();
        const { container } = render(
            <NotificationToast notifications={[n]} onDismiss={vi.fn()} />
        );
        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper.className).toContain('top-4');
        expect(wrapper.className).toContain('right-4');
    });

    it('applies bottom-left position class when specified', () => {
        const n = makeNotification();
        const { container } = render(
            <NotificationToast notifications={[n]} onDismiss={vi.fn()} position="bottom-left" />
        );
        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper.className).toContain('bottom-4');
        expect(wrapper.className).toContain('left-4');
    });

    describe('notification types', () => {
        it.each([
            ['listing', 'bg-blue-50'],
            ['order', 'bg-indigo-50'],
            ['scan', 'bg-purple-50'],
            ['info', 'bg-gray-50'],
            ['error', 'bg-red-50'],
        ] as const)('applies correct background for type "%s"', (type, expectedBg) => {
            const n = makeNotification({ type });
            const { container } = render(
                <NotificationToast notifications={[n]} onDismiss={vi.fn()} />
            );
            const alert = container.querySelector('[role="alert"]') as HTMLElement;
            expect(alert.className).toContain(expectedBg);
        });
    });
});

// ---------------------------------------------------------------------------
// Auto-dismiss behaviour
// ---------------------------------------------------------------------------

describe('NotificationToast auto-dismiss', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('calls onDismiss after 5 seconds by default', () => {
        const onDismiss = vi.fn();
        const n = makeNotification({ id: 'auto-1' });
        render(<NotificationToast notifications={[n]} onDismiss={onDismiss} />);

        expect(onDismiss).not.toHaveBeenCalled();
        act(() => { vi.advanceTimersByTime(5000); });
        expect(onDismiss).toHaveBeenCalledWith('auto-1');
    });

    it('respects custom duration', () => {
        const onDismiss = vi.fn();
        const n = makeNotification({ id: 'custom-dur', duration: 3000 });
        render(<NotificationToast notifications={[n]} onDismiss={onDismiss} />);

        act(() => { vi.advanceTimersByTime(2999); });
        expect(onDismiss).not.toHaveBeenCalled();

        act(() => { vi.advanceTimersByTime(1); });
        expect(onDismiss).toHaveBeenCalledWith('custom-dur');
    });

    it('does not auto-dismiss when duration is 0', () => {
        const onDismiss = vi.fn();
        const n = makeNotification({ id: 'no-dismiss', duration: 0 });
        render(<NotificationToast notifications={[n]} onDismiss={onDismiss} />);

        act(() => { vi.advanceTimersByTime(30_000); });
        expect(onDismiss).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useNotifications hook
// ---------------------------------------------------------------------------

describe('useNotifications hook', () => {
    it('starts with an empty notifications array', () => {
        const { result } = renderHook(() => useNotifications());
        expect(result.current.notifications).toHaveLength(0);
    });

    it('push() adds a notification with a generated id', () => {
        const { result } = renderHook(() => useNotifications());
        act(() => {
            result.current.push({ type: 'info', title: 'Hi', message: 'There' });
        });
        expect(result.current.notifications).toHaveLength(1);
        expect(result.current.notifications[0].id).toMatch(/^notif-/);
        expect(result.current.notifications[0].title).toBe('Hi');
    });

    it('dismiss() removes the notification with the given id', () => {
        const { result } = renderHook(() => useNotifications());
        let id: string;
        act(() => {
            id = result.current.push({ type: 'info', title: 'A', message: 'B' });
        });
        act(() => {
            result.current.dismiss(id!);
        });
        expect(result.current.notifications).toHaveLength(0);
    });

    it('notifyListingApproved() pushes a listing-type notification', () => {
        const { result } = renderHook(() => useNotifications());
        act(() => { result.current.notifyListingApproved('My Book'); });
        const n = result.current.notifications[0];
        expect(n.type).toBe('listing');
        expect(n.title).toBe('Listing Approved');
        expect(n.message).toContain('My Book');
    });

    it('notifyListingApproved() works without a title argument', () => {
        const { result } = renderHook(() => useNotifications());
        act(() => { result.current.notifyListingApproved(); });
        const n = result.current.notifications[0];
        expect(n.message).toContain('approved');
    });

    it('notifyListingRejected() pushes a listing-type notification with reason', () => {
        const { result } = renderHook(() => useNotifications());
        act(() => { result.current.notifyListingRejected('Poor image quality'); });
        const n = result.current.notifications[0];
        expect(n.type).toBe('listing');
        expect(n.title).toBe('Listing Rejected');
        expect(n.message).toContain('Poor image quality');
    });

    it('notifyRescanRequired() pushes a listing-type notification', () => {
        const { result } = renderHook(() => useNotifications());
        act(() => { result.current.notifyRescanRequired('Please retake spine photo'); });
        const n = result.current.notifications[0];
        expect(n.type).toBe('listing');
        expect(n.title).toBe('Rescan Required');
        expect(n.message).toContain('spine photo');
    });

    it.each([
        ['paid', 'Payment confirmed'],
        ['shipped', 'shipped'],
        ['delivered', 'delivered'],
        ['cancelled', 'cancelled'],
    ])('notifyOrderStatus("%s") pushes an order-type notification', (status, expectedText) => {
        const { result } = renderHook(() => useNotifications());
        act(() => { result.current.notifyOrderStatus(status); });
        const n = result.current.notifications[0];
        expect(n.type).toBe('order');
        expect(n.title).toBe('Order Update');
        expect(n.message.toLowerCase()).toContain(expectedText.toLowerCase());
    });

    it('notifyOrderStatus() handles unknown status gracefully', () => {
        const { result } = renderHook(() => useNotifications());
        act(() => { result.current.notifyOrderStatus('processing'); });
        const n = result.current.notifications[0];
        expect(n.message).toContain('processing');
    });

    it('notifyScanProgress() pushes a scan-type notification with 3s duration', () => {
        const { result } = renderHook(() => useNotifications());
        act(() => { result.current.notifyScanProgress(50, 'Analyzing condition'); });
        const n = result.current.notifications[0];
        expect(n.type).toBe('scan');
        expect(n.title).toContain('50%');
        expect(n.message).toBe('Analyzing condition');
        expect(n.duration).toBe(3000);
    });

    it('push() returns unique ids for multiple notifications', () => {
        const { result } = renderHook(() => useNotifications());
        const ids: string[] = [];
        act(() => {
            ids.push(result.current.push({ type: 'info', title: 'A', message: '' }));
            ids.push(result.current.push({ type: 'info', title: 'B', message: '' }));
            ids.push(result.current.push({ type: 'info', title: 'C', message: '' }));
        });
        const unique = new Set(ids);
        expect(unique.size).toBe(3);
    });
});
