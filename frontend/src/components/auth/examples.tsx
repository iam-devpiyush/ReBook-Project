/**
 * Protected Route Component Examples
 * 
 * Demonstrates various usage patterns for the ProtectedRoute component.
 * These examples show how to protect routes, implement role-based access,
 * and customize the authentication experience.
 */

'use client';

import React from 'react';
import { ProtectedRoute, withProtectedRoute } from './ProtectedRoute';
import { useAuth } from '@/lib/auth';

// ============================================================================
// Example 1: Basic Protected Page
// ============================================================================

export function BasicProtectedPage() {
  return (
    <ProtectedRoute>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Protected Dashboard</h1>
        <p className="text-gray-600">
          This content is only visible to authenticated users.
        </p>
      </div>
    </ProtectedRoute>
  );
}

// ============================================================================
// Example 2: Admin-Only Page with Role-Based Access Control
// ============================================================================

export function AdminOnlyPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
        <p className="text-gray-600">
          Only administrators can access this page.
        </p>
        <div className="mt-6 space-y-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded">
            Manage Users
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded">
            Approve Listings
          </button>
        </div>
      </div>
    </ProtectedRoute>
  );
}

// ============================================================================
// Example 3: Seller Portal with Custom Redirect
// ============================================================================

export function SellerPortalPage() {
  return (
    <ProtectedRoute
      requiredRole="seller"
      redirectTo="/auth/signin?role=seller&from=/seller/portal"
    >
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Seller Portal</h1>
        <p className="text-gray-600">
          Manage your book listings and orders here.
        </p>
      </div>
    </ProtectedRoute>
  );
}

// ============================================================================
// Example 4: Custom Loading Component
// ============================================================================

function CustomLoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse"></div>
          </div>
        </div>
        <p className="mt-6 text-lg font-medium text-gray-700">
          Verifying your access...
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Please wait while we check your authentication status
        </p>
      </div>
    </div>
  );
}

export function PageWithCustomLoading() {
  return (
    <ProtectedRoute loadingComponent={<CustomLoadingSpinner />}>
      <div className="p-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p>Content with custom loading experience</p>
      </div>
    </ProtectedRoute>
  );
}

// ============================================================================
// Example 5: Custom Unauthorized Component
// ============================================================================

function CustomUnauthorizedMessage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md text-center px-4">
        <div className="mb-6">
          <svg
            className="w-24 h-24 text-yellow-500 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Premium Feature
        </h1>
        <p className="text-gray-600 mb-6">
          This feature is only available to premium members. Upgrade your account
          to access exclusive content and features.
        </p>
        <div className="space-y-3">
          <button className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
            Upgrade to Premium
          </button>
          <button className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

export function PremiumFeaturePage() {
  return (
    <ProtectedRoute
      requiredRole="admin"
      unauthorizedComponent={<CustomUnauthorizedMessage />}
    >
      <div className="p-8">
        <h1 className="text-2xl font-bold">Premium Content</h1>
        <p>Exclusive content for premium members</p>
      </div>
    </ProtectedRoute>
  );
}

// ============================================================================
// Example 6: Using HOC Pattern
// ============================================================================

interface DashboardContentProps {
  title: string;
  description: string;
}

function DashboardContent({ title, description }: DashboardContentProps) {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">{title}</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">{user?.email}</span>
              <button
                onClick={() => signOut()}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-2">{title}</h2>
            <p className="text-gray-600">{description}</p>
          </div>
        </div>
      </main>
    </div>
  );
}

// Wrap with HOC
export const ProtectedDashboard = withProtectedRoute(DashboardContent);

// Usage:
// <ProtectedDashboard title="My Dashboard" description="Welcome back!" />

// ============================================================================
// Example 7: Admin Dashboard with HOC and Role
// ============================================================================

function AdminDashboardContent() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Total Users</h3>
          <p className="text-3xl font-bold text-blue-600">1,234</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Active Listings</h3>
          <p className="text-3xl font-bold text-green-600">567</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Pending Approvals</h3>
          <p className="text-3xl font-bold text-yellow-600">89</p>
        </div>
      </div>
    </div>
  );
}

export const ProtectedAdminDashboard = withProtectedRoute(AdminDashboardContent, {
  requiredRole: 'admin',
  redirectTo: '/auth/signin?role=admin',
});

// ============================================================================
// Example 8: Nested Protected Layout
// ============================================================================

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        {/* Sidebar */}
        <aside className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-6">Navigation</h2>
            <nav className="space-y-2">
              <a href="/dashboard" className="block px-4 py-2 rounded hover:bg-gray-100">
                Dashboard
              </a>
              <a href="/profile" className="block px-4 py-2 rounded hover:bg-gray-100">
                Profile
              </a>
              <a href="/settings" className="block px-4 py-2 rounded hover:bg-gray-100">
                Settings
              </a>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="ml-64 p-8">
          <div className="mb-6">
            <p className="text-sm text-gray-600">Logged in as: {user?.email}</p>
          </div>
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}

// Usage:
// <ProtectedLayout>
//   <div>Page content here</div>
// </ProtectedLayout>

// ============================================================================
// Example 9: Multi-Role Access
// ============================================================================

export function MultiRoleAccessPage() {
  const { user } = useAuth();
  const userRole = user?.user_metadata?.role || user?.app_metadata?.role;

  return (
    <ProtectedRoute>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Multi-Role Dashboard</h1>
        <p className="text-gray-600 mb-6">Your role: {userRole}</p>

        {/* Content visible to all authenticated users */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-2">General Content</h2>
          <p>This is visible to all authenticated users.</p>
        </div>

        {/* Seller-specific content */}
        {(userRole === 'seller' || userRole === 'admin') && (
          <div className="bg-blue-50 p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-2">Seller Tools</h2>
            <p>Manage your listings and orders.</p>
          </div>
        )}

        {/* Admin-specific content */}
        {userRole === 'admin' && (
          <div className="bg-red-50 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Admin Tools</h2>
            <p>Platform administration and moderation.</p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

// ============================================================================
// Example 10: Conditional Protection
// ============================================================================

interface ConditionalPageProps {
  requireAuth?: boolean;
  requiredRole?: 'buyer' | 'seller' | 'admin';
}

export function ConditionalProtectionPage({
  requireAuth = true,
  requiredRole,
}: ConditionalPageProps) {
  const content = (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Flexible Access Page</h1>
      <p className="text-gray-600">
        This page can be configured to require authentication or be public.
      </p>
    </div>
  );

  if (!requireAuth) {
    return content;
  }

  return <ProtectedRoute requiredRole={requiredRole}>{content}</ProtectedRoute>;
}

// Usage:
// <ConditionalProtectionPage requireAuth={true} requiredRole="seller" />
// <ConditionalProtectionPage requireAuth={false} />
