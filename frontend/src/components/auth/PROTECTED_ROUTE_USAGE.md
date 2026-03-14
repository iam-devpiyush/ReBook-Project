# Protected Route Component Usage Guide

**Validates: Requirements 1.9**

The `ProtectedRoute` component provides a reusable wrapper for protecting routes that require authentication. It automatically checks authentication status, handles loading states, redirects unauthenticated users, and supports role-based access control.

## Features

- ✅ Automatic authentication check using `useAuth` hook
- ✅ Loading state while checking authentication
- ✅ Redirect to sign-in page if not authenticated
- ✅ Automatic session refresh (handled by auth store)
- ✅ Optional role-based access control
- ✅ Custom redirect paths
- ✅ Custom loading and unauthorized components
- ✅ Higher-order component (HOC) wrapper

## Basic Usage

### Protect a Page Component

```tsx
import { ProtectedRoute } from '@/components/auth';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div>
        <h1>Dashboard</h1>
        <p>This content is only visible to authenticated users.</p>
      </div>
    </ProtectedRoute>
  );
}
```

### Protect with Role-Based Access Control

```tsx
import { ProtectedRoute } from '@/components/auth';

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <div>
        <h1>Admin Panel</h1>
        <p>Only admins can see this content.</p>
      </div>
    </ProtectedRoute>
  );
}
```

### Custom Redirect Path

```tsx
import { ProtectedRoute } from '@/components/auth';

export default function SellerPortalPage() {
  return (
    <ProtectedRoute redirectTo="/auth/signin?role=seller">
      <div>
        <h1>Seller Portal</h1>
        <p>Seller-specific content here.</p>
      </div>
    </ProtectedRoute>
  );
}
```

## Advanced Usage

### Custom Loading Component

```tsx
import { ProtectedRoute } from '@/components/auth';

function CustomLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="spinner-border" role="status">
          <span className="sr-only">Checking authentication...</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute loadingComponent={<CustomLoader />}>
      <div>Dashboard Content</div>
    </ProtectedRoute>
  );
}
```

### Custom Unauthorized Component

```tsx
import { ProtectedRoute } from '@/components/auth';
import Link from 'next/link';

function CustomUnauthorized() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="mb-4">You don't have permission to view this page.</p>
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute
      requiredRole="admin"
      unauthorizedComponent={<CustomUnauthorized />}
    >
      <div>Admin Content</div>
    </ProtectedRoute>
  );
}
```

## Higher-Order Component (HOC) Pattern

### Basic HOC Usage

```tsx
import { withProtectedRoute } from '@/components/auth';

function DashboardContent() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Protected content</p>
    </div>
  );
}

// Wrap component with authentication protection
export default withProtectedRoute(DashboardContent);
```

### HOC with Options

```tsx
import { withProtectedRoute } from '@/components/auth';

function AdminPanel() {
  return (
    <div>
      <h1>Admin Panel</h1>
      <p>Admin-only content</p>
    </div>
  );
}

// Wrap with role-based access control
export default withProtectedRoute(AdminPanel, {
  requiredRole: 'admin',
  redirectTo: '/auth/signin?role=admin',
});
```

### HOC with TypeScript Props

```tsx
import { withProtectedRoute } from '@/components/auth';

interface DashboardProps {
  userId: string;
  title: string;
}

function Dashboard({ userId, title }: DashboardProps) {
  return (
    <div>
      <h1>{title}</h1>
      <p>User ID: {userId}</p>
    </div>
  );
}

// TypeScript will preserve prop types
export default withProtectedRoute(Dashboard);
```

## Role-Based Access Control

### Available Roles

- `buyer` - Regular users who can purchase books
- `seller` - Users who can list books for sale
- `admin` - Administrators with full platform access

### Checking User Role

The component checks for user role in the following order:

1. `user.user_metadata.role`
2. `user.app_metadata.role`

### Example: Multi-Role Access

```tsx
import { ProtectedRoute } from '@/components/auth';
import { useAuth } from '@/lib/auth';

export default function SellerDashboard() {
  const { user } = useAuth();
  const userRole = user?.user_metadata?.role || user?.app_metadata?.role;

  return (
    <ProtectedRoute requiredRole="seller">
      <div>
        <h1>Seller Dashboard</h1>
        <p>Welcome, {userRole}!</p>
        {/* Seller-specific content */}
      </div>
    </ProtectedRoute>
  );
}
```

## Session Management

### Automatic Session Refresh

The `ProtectedRoute` component relies on the auth store for automatic session refresh:

- Session is checked every minute
- Proactive refresh when 5 minutes remain before expiration
- Automatic redirect to sign-in when session expires (Requirement 1.9)

### Handling Session Expiration

When a session expires:

1. Auth store detects expiration
2. User state is cleared
3. `isAuthenticated` becomes `false`
4. `ProtectedRoute` detects the change
5. User is redirected to sign-in page with return URL

```tsx
// The component automatically handles session expiration
<ProtectedRoute>
  <div>
    {/* User will be redirected to sign-in if session expires */}
    Protected Content
  </div>
</ProtectedRoute>
```

## Return URL Handling

### Automatic Return URL

By default, the component includes the current path as a return URL:

```tsx
// User at /dashboard will be redirected to:
// /auth/signin?from=%2Fdashboard
<ProtectedRoute>
  <div>Dashboard</div>
</ProtectedRoute>
```

### Custom Return URL

```tsx
<ProtectedRoute redirectTo="/auth/signin?from=/custom-path">
  <div>Protected Content</div>
</ProtectedRoute>
```

### Using Return URL After Sign-In

In your sign-in page, read the `from` parameter and redirect after authentication:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function SignInPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      router.push(from);
    }
  }, [isAuthenticated, from, router]);

  // Sign-in UI...
}
```

## Complete Example: Protected Dashboard

```tsx
'use client';

import { ProtectedRoute } from '@/components/auth';
import { useAuth } from '@/lib/auth';

function DashboardContent() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Dashboard</h1>
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
          <h2 className="text-2xl font-bold mb-4">Welcome!</h2>
          <p className="text-gray-600">
            This is your protected dashboard. Only authenticated users can see this.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
```

## Testing Protected Routes

### Unit Tests

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth';
import { useAuth } from '@/lib/auth';

jest.mock('next/navigation');
jest.mock('@/lib/auth');

describe('ProtectedRoute', () => {
  it('should redirect unauthenticated users', async () => {
    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/auth/signin'));
    });
  });
});
```

## Best Practices

1. **Use at Page Level**: Wrap entire page components for consistent protection
2. **Combine with Middleware**: Use Next.js middleware for additional server-side protection
3. **Handle Loading States**: Provide custom loading components for better UX
4. **Role-Based Access**: Use `requiredRole` for fine-grained access control
5. **Return URLs**: Always include return URLs for better user experience
6. **Error Handling**: Monitor auth errors and provide user feedback
7. **Testing**: Write tests for both authenticated and unauthenticated scenarios

## Common Patterns

### Nested Protected Routes

```tsx
// Layout with protection
export default function ProtectedLayout({ children }) {
  return (
    <ProtectedRoute>
      <div className="layout">
        <Sidebar />
        <main>{children}</main>
      </div>
    </ProtectedRoute>
  );
}

// Individual pages don't need additional protection
export default function DashboardPage() {
  return <div>Dashboard Content</div>;
}
```

### Conditional Protection

```tsx
export default function ConditionalPage({ requireAuth = true }) {
  const content = <div>Page Content</div>;

  if (requireAuth) {
    return <ProtectedRoute>{content}</ProtectedRoute>;
  }

  return content;
}
```

### Multiple Role Checks

```tsx
import { ProtectedRoute } from '@/components/auth';
import { useAuth } from '@/lib/auth';

export default function FlexibleAccessPage() {
  const { user } = useAuth();
  const userRole = user?.user_metadata?.role || user?.app_metadata?.role;
  const allowedRoles = ['admin', 'seller'];

  if (!allowedRoles.includes(userRole)) {
    return <div>Access Denied</div>;
  }

  return (
    <ProtectedRoute>
      <div>Content for admins and sellers</div>
    </ProtectedRoute>
  );
}
```

## Troubleshooting

### Issue: Infinite Redirect Loop

**Cause**: Sign-in page is also wrapped with `ProtectedRoute`

**Solution**: Never wrap sign-in/sign-up pages with `ProtectedRoute`

### Issue: Flash of Unauthenticated Content

**Cause**: Loading state not properly handled

**Solution**: Ensure loading state is shown while checking authentication

```tsx
<ProtectedRoute loadingComponent={<LoadingSpinner />}>
  <div>Protected Content</div>
</ProtectedRoute>
```

### Issue: Role Check Not Working

**Cause**: User role not set in metadata

**Solution**: Ensure user role is set during sign-up or profile sync

```tsx
// Check where role is stored
const { user } = useAuth();
console.log('user_metadata.role:', user?.user_metadata?.role);
console.log('app_metadata.role:', user?.app_metadata?.role);
```

## Related Documentation

- [Authentication Store](../../lib/auth/AUTH_STORE.md)
- [Session Handling](../../lib/auth/SESSION_HANDLING.md)
- [OAuth Flows](../../lib/auth/OAUTH_FLOWS.md)
- [Usage Examples](../../lib/auth/USAGE_EXAMPLES.md)
