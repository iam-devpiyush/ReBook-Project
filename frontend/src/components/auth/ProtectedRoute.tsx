/**
 * Protected Route Wrapper Component
 * 
 * Wraps routes that require authentication. Checks authentication status,
 * shows loading state, and redirects to sign-in if not authenticated.
 * 
 * Requirements:
 * - 1.9: Require user to refresh token or re-authenticate when session expires
 * 
 * Features:
 * - Automatic authentication check using useAuth hook
 * - Loading state while checking authentication
 * - Redirect to sign-in page if not authenticated
 * - Automatic session refresh (handled by auth store)
 * - Optional role-based access control
 * 
 * @example
 * ```tsx
 * // Basic usage - protect any route
 * <ProtectedRoute>
 *   <DashboardContent />
 * </ProtectedRoute>
 * 
 * // With role-based access control
 * <ProtectedRoute requiredRole="admin">
 *   <AdminPanel />
 * </ProtectedRoute>
 * 
 * // Custom redirect path
 * <ProtectedRoute redirectTo="/auth/signin?from=/dashboard">
 *   <DashboardContent />
 * </ProtectedRoute>
 * 
 * // Custom loading component
 * <ProtectedRoute loadingComponent={<CustomLoader />}>
 *   <DashboardContent />
 * </ProtectedRoute>
 * ```
 */

'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  /**
   * Required role for access. If specified, user must have this role.
   * Possible values: 'buyer', 'seller', 'admin'
   */
  requiredRole?: 'buyer' | 'seller' | 'admin';
  /**
   * Path to redirect to if not authenticated.
   * Defaults to '/auth/signin' with return URL
   */
  redirectTo?: string;
  /**
   * Custom loading component to show while checking authentication
   */
  loadingComponent?: ReactNode;
  /**
   * Custom component to show when user doesn't have required role
   */
  unauthorizedComponent?: ReactNode;
}

/**
 * Default loading component
 */
function DefaultLoadingComponent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Default unauthorized component
 */
function DefaultUnauthorizedComponent({ requiredRole }: { requiredRole: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-4">
        <div className="mb-4">
          <svg
            className="w-16 h-16 text-red-500 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">
          You don&apos;t have permission to access this page. This page requires{' '}
          <span className="font-semibold">{requiredRole}</span> role.
        </p>
      </div>
    </div>
  );
}

/**
 * Protected Route Component
 * 
 * Wraps content that requires authentication. Automatically checks auth status,
 * handles loading states, and redirects unauthenticated users to sign-in.
 * 
 * Session refresh is handled automatically by the auth store (Requirement 1.7).
 * When session expires, user is redirected to sign-in (Requirement 1.9).
 */
export function ProtectedRoute({
  children,
  requiredRole,
  redirectTo,
  loadingComponent,
  unauthorizedComponent,
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Wait for auth initialization to complete
    if (loading) {
      return;
    }

    // Redirect to sign-in if not authenticated (Requirement 1.9)
    if (!isAuthenticated) {
      const signInPath = redirectTo || `/auth/signin?from=${encodeURIComponent(pathname)}`;
      router.push(signInPath);
    }
  }, [isAuthenticated, loading, router, pathname, redirectTo]);

  // Show loading state while checking authentication
  if (loading) {
    return loadingComponent || <DefaultLoadingComponent />;
  }

  // Redirect in progress (don't render anything)
  if (!isAuthenticated) {
    return null;
  }

  // Check role-based access control if required
  if (requiredRole && user) {
    // Get user role from user metadata or app_metadata
    const userRole = user.user_metadata?.role || user.app_metadata?.role;

    // Check if user has required role
    if (userRole !== requiredRole) {
      return (
        unauthorizedComponent || (
          <DefaultUnauthorizedComponent requiredRole={requiredRole} />
        )
      );
    }
  }

  // User is authenticated and authorized - render protected content
  return <>{children}</>;
}

/**
 * Higher-order component version of ProtectedRoute
 * 
 * Wraps a component with authentication protection.
 * 
 * @example
 * ```tsx
 * const ProtectedDashboard = withProtectedRoute(DashboardComponent);
 * 
 * // With options
 * const ProtectedAdmin = withProtectedRoute(AdminPanel, {
 *   requiredRole: 'admin',
 * });
 * ```
 */
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
