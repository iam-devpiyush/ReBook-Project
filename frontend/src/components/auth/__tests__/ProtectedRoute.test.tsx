/**
 * Tests for ProtectedRoute Component
 * 
 * Validates: Requirements 1.9
 * 
 * Test Coverage:
 * - Authentication check and redirect
 * - Loading state display
 * - Role-based access control
 * - Custom redirect paths
 * - Custom loading and unauthorized components
 * - HOC wrapper functionality
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import { ProtectedRoute, withProtectedRoute } from '../ProtectedRoute';
import { useAuth } from '@/lib/auth';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

// Mock auth hook
vi.mock('@/lib/auth', () => ({
  useAuth: vi.fn(),
}));

describe('ProtectedRoute Component', () => {
  const mockPush = vi.fn();
  const mockUseRouter = useRouter as ReturnType<typeof vi.fn>;
  const mockUsePathname = usePathname as ReturnType<typeof vi.fn>;
  const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: mockPush } as any);
    mockUsePathname.mockReturnValue('/dashboard');
  });

  describe('Authentication Check', () => {
    it('should show loading state while checking authentication', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        isAuthenticated: false,
        session: null,
        error: null,
        signInWithGoogle: vi.fn(),
        signInWithApple: vi.fn(),
        signInWithMicrosoft: vi.fn(),
        signOut: vi.fn(),
        refreshSession: vi.fn(),
        clearError: vi.fn(),
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should redirect to sign-in if not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isAuthenticated: false,
        session: null,
        error: null,
        signInWithGoogle: vi.fn(),
        signInWithApple: vi.fn(),
        signInWithMicrosoft: vi.fn(),
        signOut: vi.fn(),
        refreshSession: vi.fn(),
        clearError: vi.fn(),
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin?from=%2Fdashboard');
      });

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should render protected content when authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: {},
          app_metadata: {},
        } as any,
        loading: false,
        isAuthenticated: true,
        session: {} as any,
        error: null,
        signInWithGoogle: vi.fn(),
        signInWithApple: vi.fn(),
        signInWithMicrosoft: vi.fn(),
        signOut: vi.fn(),
        refreshSession: vi.fn(),
        clearError: vi.fn(),
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Custom Redirect Path', () => {
    it('should redirect to custom path when specified', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isAuthenticated: false,
        session: null,
        error: null,
        signInWithGoogle: vi.fn(),
        signInWithApple: vi.fn(),
        signInWithMicrosoft: vi.fn(),
        signOut: vi.fn(),
        refreshSession: vi.fn(),
        clearError: vi.fn(),
      });

      render(
        <ProtectedRoute redirectTo="/custom-signin">
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/custom-signin');
      });
    });
  });

  describe('Custom Loading Component', () => {
    it('should render custom loading component when provided', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        isAuthenticated: false,
        session: null,
        error: null,
        signInWithGoogle: vi.fn(),
        signInWithApple: vi.fn(),
        signInWithMicrosoft: vi.fn(),
        signOut: vi.fn(),
        refreshSession: vi.fn(),
        clearError: vi.fn(),
      });

      render(
        <ProtectedRoute loadingComponent={<div>Custom Loading...</div>}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Custom Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow access when user has required role', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-123',
          email: 'admin@example.com',
          user_metadata: { role: 'admin' },
          app_metadata: {},
        } as any,
        loading: false,
        isAuthenticated: true,
        session: {} as any,
        error: null,
        signInWithGoogle: vi.fn(),
        signInWithApple: vi.fn(),
        signInWithMicrosoft: vi.fn(),
        signOut: vi.fn(),
        refreshSession: vi.fn(),
        clearError: vi.fn(),
      });

      render(
        <ProtectedRoute requiredRole="admin">
          <div>Admin Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });

    it('should deny access when user does not have required role', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-123',
          email: 'buyer@example.com',
          user_metadata: { role: 'buyer' },
          app_metadata: {},
        } as any,
        loading: false,
        isAuthenticated: true,
        session: {} as any,
        error: null,
        signInWithGoogle: vi.fn(),
        signInWithApple: vi.fn(),
        signInWithMicrosoft: vi.fn(),
        signOut: vi.fn(),
        refreshSession: vi.fn(),
        clearError: vi.fn(),
      });

      render(
        <ProtectedRoute requiredRole="admin">
          <div>Admin Content</div>
        </ProtectedRoute>
      );

      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/requires admin role/i)).toBeInTheDocument();
    });

    it('should check role from app_metadata if not in user_metadata', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-123',
          email: 'seller@example.com',
          user_metadata: {},
          app_metadata: { role: 'seller' },
        } as any,
        loading: false,
        isAuthenticated: true,
        session: {} as any,
        error: null,
        signInWithGoogle: vi.fn(),
        signInWithApple: vi.fn(),
        signInWithMicrosoft: vi.fn(),
        signOut: vi.fn(),
        refreshSession: vi.fn(),
        clearError: vi.fn(),
      });

      render(
        <ProtectedRoute requiredRole="seller">
          <div>Seller Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Seller Content')).toBeInTheDocument();
    });

    it('should render custom unauthorized component when provided', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-123',
          email: 'buyer@example.com',
          user_metadata: { role: 'buyer' },
          app_metadata: {},
        } as any,
        loading: false,
        isAuthenticated: true,
        session: {} as any,
        error: null,
        signInWithGoogle: vi.fn(),
        signInWithApple: vi.fn(),
        signInWithMicrosoft: vi.fn(),
        signOut: vi.fn(),
        refreshSession: vi.fn(),
        clearError: vi.fn(),
      });

      render(
        <ProtectedRoute
          requiredRole="admin"
          unauthorizedComponent={<div>Custom Unauthorized</div>}
        >
          <div>Admin Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Custom Unauthorized')).toBeInTheDocument();
      expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
    });
  });

  describe('withProtectedRoute HOC', () => {
    it('should wrap component with authentication protection', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: {},
          app_metadata: {},
        } as any,
        loading: false,
        isAuthenticated: true,
        session: {} as any,
        error: null,
        signInWithGoogle: vi.fn(),
        signInWithApple: vi.fn(),
        signInWithMicrosoft: vi.fn(),
        signOut: vi.fn(),
        refreshSession: vi.fn(),
        clearError: vi.fn(),
      });

      const TestComponent = ({ message }: { message: string }) => (
        <div>{message}</div>
      );

      const ProtectedTestComponent = withProtectedRoute(TestComponent);

      render(<ProtectedTestComponent message="HOC Protected Content" />);

      expect(screen.getByText('HOC Protected Content')).toBeInTheDocument();
    });

    it('should apply options to HOC wrapper', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isAuthenticated: false,
        session: null,
        error: null,
        signInWithGoogle: vi.fn(),
        signInWithApple: vi.fn(),
        signInWithMicrosoft: vi.fn(),
        signOut: vi.fn(),
        refreshSession: vi.fn(),
        clearError: vi.fn(),
      });

      const TestComponent = () => <div>Test Content</div>;

      const ProtectedTestComponent = withProtectedRoute(TestComponent, {
        redirectTo: '/custom-path',
      });

      render(<ProtectedTestComponent />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/custom-path');
      });
    });

    it('should apply role-based access control in HOC', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-123',
          email: 'admin@example.com',
          user_metadata: { role: 'admin' },
          app_metadata: {},
        } as any,
        loading: false,
        isAuthenticated: true,
        session: {} as any,
        error: null,
        signInWithGoogle: vi.fn(),
        signInWithApple: vi.fn(),
        signInWithMicrosoft: vi.fn(),
        signOut: vi.fn(),
        refreshSession: vi.fn(),
        clearError: vi.fn(),
      });

      const AdminComponent = () => <div>Admin Panel</div>;

      const ProtectedAdminComponent = withProtectedRoute(AdminComponent, {
        requiredRole: 'admin',
      });

      render(<ProtectedAdminComponent />);

      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });
  });

  describe('Session Expiration Handling (Requirement 1.9)', () => {
    it('should redirect when session expires and user becomes unauthenticated', async () => {
      // Start with authenticated user
      const { rerender } = render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      // Initially authenticated
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: {},
          app_metadata: {},
        } as any,
        loading: false,
        isAuthenticated: true,
        session: {} as any,
        error: null,
        signInWithGoogle: vi.fn(),
        signInWithApple: vi.fn(),
        signInWithMicrosoft: vi.fn(),
        signOut: vi.fn(),
        refreshSession: vi.fn(),
        clearError: vi.fn(),
      });

      rerender(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();

      // Session expires - user becomes unauthenticated
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isAuthenticated: false,
        session: null,
        error: new Error('Session expired'),
        signInWithGoogle: vi.fn(),
        signInWithApple: vi.fn(),
        signInWithMicrosoft: vi.fn(),
        signOut: vi.fn(),
        refreshSession: vi.fn(),
        clearError: vi.fn(),
      });

      rerender(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      // Should redirect to sign-in (Requirement 1.9)
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin?from=%2Fdashboard');
      });
    });
  });
});
