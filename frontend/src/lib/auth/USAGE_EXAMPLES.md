# Authentication State Management Usage Examples

This document provides examples of how to use the authentication state management system with Zustand.

## Overview

The authentication system provides two approaches:
1. **Zustand Store** (`useAuthStore`) - Direct access to the global store
2. **useAuth Hook** (`useAuthHook`) - Convenient wrapper with automatic initialization

Both approaches provide the same functionality, but the `useAuth` hook is recommended for most use cases.

## Requirements Implemented

- **Requirement 1.6**: Generate secure session token (JWT) stored in httpOnly cookie
- **Requirement 1.7**: Automatic session refresh before expiration
- **Requirement 1.8**: Invalidate session token on logout

## Using the useAuth Hook (Recommended)

The `useAuth` hook provides a clean interface for accessing authentication state and actions.

### Basic Usage

```tsx
'use client';

import { useAuthHook } from '@/lib/auth';

export function MyComponent() {
  const { user, loading, isAuthenticated, signOut } = useAuthHook();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <div>Please sign in</div>;
  }

  return (
    <div>
      <h1>Welcome, {user?.email}</h1>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}
```

### Sign In with OAuth Providers

```tsx
'use client';

import { useAuthHook } from '@/lib/auth';

export function SignInButtons() {
  const { signInWithGoogle, signInWithApple, signInWithMicrosoft, loading } = useAuthHook();

  return (
    <div>
      <button 
        onClick={() => signInWithGoogle('/dashboard')}
        disabled={loading}
      >
        Sign in with Google
      </button>
      
      <button 
        onClick={() => signInWithApple('/dashboard')}
        disabled={loading}
      >
        Sign in with Apple
      </button>
      
      <button 
        onClick={() => signInWithMicrosoft('/dashboard')}
        disabled={loading}
      >
        Sign in with Microsoft
      </button>
    </div>
  );
}
```

### Accessing User Information

```tsx
'use client';

import { useUserHook } from '@/lib/auth';

export function UserProfile() {
  const { user, loading, error } = useUserHook();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>Not signed in</div>;

  return (
    <div>
      <p>Email: {user.email}</p>
      <p>User ID: {user.id}</p>
      <p>Created: {new Date(user.created_at).toLocaleDateString()}</p>
    </div>
  );
}
```

### Accessing Session Information

```tsx
'use client';

import { useSessionHook } from '@/lib/auth';

export function SessionInfo() {
  const { session, loading } = useSessionHook();

  if (loading) return <div>Loading...</div>;
  if (!session) return <div>No active session</div>;

  const expiresAt = new Date(session.expires_at! * 1000);

  return (
    <div>
      <p>Session expires: {expiresAt.toLocaleString()}</p>
      <p>Token type: {session.token_type}</p>
    </div>
  );
}
```

### Checking Authentication Status

```tsx
'use client';

import { useIsAuthenticatedHook } from '@/lib/auth';

export function ProtectedContent() {
  const { isAuthenticated, loading } = useIsAuthenticatedHook();

  if (loading) return <div>Loading...</div>;
  
  if (!isAuthenticated) {
    return <div>Please sign in to view this content</div>;
  }

  return <div>Protected content here</div>;
}
```

### Manual Session Refresh

```tsx
'use client';

import { useAuthHook } from '@/lib/auth';

export function RefreshButton() {
  const { refreshSession, loading } = useAuthHook();

  const handleRefresh = async () => {
    try {
      await refreshSession();
      alert('Session refreshed successfully');
    } catch (error) {
      alert('Failed to refresh session');
    }
  };

  return (
    <button onClick={handleRefresh} disabled={loading}>
      Refresh Session
    </button>
  );
}
```

### Error Handling

```tsx
'use client';

import { useAuthHook } from '@/lib/auth';

export function AuthErrorDisplay() {
  const { error, clearError } = useAuthHook();

  if (!error) return null;

  return (
    <div className="error-banner">
      <p>Error: {error.message}</p>
      <button onClick={clearError}>Dismiss</button>
    </div>
  );
}
```

## Using the Zustand Store Directly

For advanced use cases, you can access the store directly.

### Basic Store Usage

```tsx
'use client';

import { useAuthStore } from '@/lib/auth';
import { useEffect } from 'react';

export function AdvancedComponent() {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const initialize = useAuthStore((state) => state.initialize);
  const signOut = useAuthStore((state) => state.signOut);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {user ? (
        <>
          <p>Welcome, {user.email}</p>
          <button onClick={() => signOut()}>Sign Out</button>
        </>
      ) : (
        <p>Not signed in</p>
      )}
    </div>
  );
}
```

### Selective State Subscription

```tsx
'use client';

import { useAuthStore } from '@/lib/auth';

export function UserEmail() {
  // Only re-renders when user changes
  const user = useAuthStore((state) => state.user);

  return <div>{user?.email || 'Not signed in'}</div>;
}

export function LoadingIndicator() {
  // Only re-renders when loading changes
  const loading = useAuthStore((state) => state.loading);

  return loading ? <div>Loading...</div> : null;
}
```

### Accessing Store Outside React Components

```tsx
import { useAuthStore } from '@/lib/auth';

// Get current state
const currentUser = useAuthStore.getState().user;
const isAuthenticated = currentUser !== null;

// Subscribe to changes
const unsubscribe = useAuthStore.subscribe((state) => {
  console.log('Auth state changed:', state.user);
});

// Later: unsubscribe
unsubscribe();
```

## Automatic Session Management

The authentication system automatically handles session management:

### Session Refresh (Requirement 1.7)

- Sessions are automatically refreshed when they have 5 minutes or less remaining
- Refresh checks occur every minute
- No manual intervention required

```tsx
// Session refresh happens automatically in the background
// You don't need to do anything!
```

### Session Expiration Handling

```tsx
'use client';

import { useAuthHook } from '@/lib/auth';
import { useEffect } from 'react';

export function SessionMonitor() {
  const { session, error } = useAuthHook();

  useEffect(() => {
    if (error?.message.includes('Session expired')) {
      // Redirect to sign in page
      window.location.href = '/auth/signin';
    }
  }, [error]);

  return null;
}
```

## Integration with Next.js App Router

### Layout Integration

```tsx
// app/layout.tsx
import { AuthProvider } from '@/lib/auth';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### Protected Route Pattern

```tsx
// app/dashboard/page.tsx
'use client';

import { useAuthHook } from '@/lib/auth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { isAuthenticated, loading } = useAuthHook();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/signin');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return null;

  return <div>Dashboard content</div>;
}
```

### Sign Out with Redirect

```tsx
'use client';

import { useAuthHook } from '@/lib/auth';

export function SignOutButton() {
  const { signOut } = useAuthHook();

  return (
    <button onClick={() => signOut('/auth/signin')}>
      Sign Out
    </button>
  );
}
```

## Best Practices

1. **Use the useAuth Hook**: For most cases, use `useAuthHook` instead of accessing the store directly
2. **Initialize Once**: The hook automatically initializes the store, no need to call `initialize()` manually
3. **Handle Loading States**: Always check the `loading` state before rendering content
4. **Handle Errors**: Display error messages to users and provide a way to clear them
5. **Automatic Refresh**: Trust the automatic session refresh, don't manually refresh unless needed
6. **Secure Redirects**: Always redirect to HTTPS URLs in production
7. **Clean Up**: The store automatically cleans up listeners, no manual cleanup needed

## Troubleshooting

### Store Not Initializing

If the store doesn't initialize automatically:

```tsx
import { useAuthStore } from '@/lib/auth';
import { useEffect } from 'react';

export function MyComponent() {
  const initialize = useAuthStore((state) => state.initialize);
  const initialized = useAuthStore((state) => state.initialized);

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  // Rest of component
}
```

### Session Not Refreshing

The session refresh timer starts automatically when a session exists. If you need to stop it:

```tsx
import { stopSessionRefreshTimer } from '@/lib/auth';

// Stop the timer (rarely needed)
stopSessionRefreshTimer();
```

### Multiple Store Instances

Zustand creates a single global store instance. All components share the same state.

```tsx
// These all access the same store
const Component1 = () => {
  const user = useAuthStore((state) => state.user);
  return <div>{user?.email}</div>;
};

const Component2 = () => {
  const user = useAuthStore((state) => state.user);
  return <div>{user?.email}</div>; // Same user as Component1
};
```

## API Reference

### useAuth Hook

Returns an object with:

- `user: User | null` - Current authenticated user
- `session: Session | null` - Current session
- `loading: boolean` - Loading state
- `error: Error | null` - Error state
- `isAuthenticated: boolean` - Whether user is authenticated
- `signInWithGoogle(redirectTo?: string): Promise<void>` - Sign in with Google
- `signInWithApple(redirectTo?: string): Promise<void>` - Sign in with Apple
- `signInWithMicrosoft(redirectTo?: string): Promise<void>` - Sign in with Microsoft
- `signOut(redirectTo?: string): Promise<void>` - Sign out
- `refreshSession(): Promise<void>` - Manually refresh session
- `clearError(): void` - Clear error state

### useAuthStore

Zustand store with:

**State:**
- `user: User | null`
- `session: Session | null`
- `loading: boolean`
- `error: Error | null`
- `initialized: boolean`

**Actions:**
- `initialize(): Promise<void>`
- `signInWithOAuth(provider, redirectTo?): Promise<void>`
- `signOut(redirectTo?): Promise<void>`
- `refreshSession(): Promise<void>`
- `clearError(): void`
- `setUser(user): void`
- `setSession(session): void`
- `setLoading(loading): void`
- `setError(error): void`
