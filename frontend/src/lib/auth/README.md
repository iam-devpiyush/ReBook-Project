# Authentication Utilities

This directory contains authentication utilities for the Second-Hand Book Marketplace platform, built on Supabase Auth with OAuth support for Google, Apple, and Microsoft.

## Overview

The authentication system provides:
- **OAuth Authentication**: Sign in with Google, Apple, or Microsoft
- **Session Management**: Automatic session refresh and token management
- **Server-Side Auth**: Utilities for API routes and server components
- **Client-Side Auth**: Utilities for client components
- **React Hooks**: Custom hooks for auth state management
- **Context Provider**: Global auth state with React Context
- **Real-Time Updates**: Auth state changes via Supabase listeners

## File Structure

```
auth/
├── server.ts       # Server-side auth utilities
├── client.ts       # Client-side auth utilities
├── hooks.ts        # React hooks for auth state
├── provider.tsx    # Auth Context Provider
├── index.ts        # Central export point
└── README.md       # This file
```

## Usage

### 1. Server-Side Authentication (API Routes, Server Components)

```typescript
import { getServerUser, requireAuth, requireRole } from '@/lib/auth';

// Get current user (returns null if not authenticated)
const user = await getServerUser();

// Require authentication (throws error if not authenticated)
const user = await requireAuth();

// Require specific role
const admin = await requireRole('admin');

// Check if user has role
const isAdmin = await hasRole('admin');

// Get user profile from database
const profile = await getUserProfile(userId);
```

### 2. Client-Side Authentication (Client Components)

```typescript
import { 
  signInWithGoogle, 
  signInWithApple, 
  signInWithMicrosoft,
  signOut,
  getCurrentUser 
} from '@/lib/auth';

// Sign in with OAuth providers
await signInWithGoogle();
await signInWithApple();
await signInWithMicrosoft();

// Sign out
await signOut();

// Get current user
const user = await getCurrentUser();

// Check if authenticated
const isAuth = await isAuthenticated();
```

### 3. React Hooks (Client Components)

```typescript
'use client';

import { 
  useAuth, 
  useUser, 
  useIsAuthenticated,
  useUserProfile,
  useIsAdmin 
} from '@/lib/auth';

function MyComponent() {
  // Get full auth state
  const { user, session, loading, error } = useAuth();
  
  // Get only user
  const { user, loading } = useUser();
  
  // Check if authenticated
  const { isAuthenticated, loading } = useIsAuthenticated();
  
  // Get user profile from database with real-time updates
  const { profile, loading, error } = useUserProfile();
  
  // Check if user is admin
  const { hasRole: isAdmin, loading } = useIsAdmin();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;
  
  return <div>Welcome, {user.email}</div>;
}
```

### 4. Auth Context Provider

Wrap your app with the AuthProvider to enable global auth state:

```typescript
// app/layout.tsx
import { AuthProvider } from '@/lib/auth';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

// Use in any component
import { useAuthContext } from '@/lib/auth';

function MyComponent() {
  const { user, loading, signOut } = useAuthContext();
  
  return (
    <div>
      {user && <button onClick={signOut}>Sign Out</button>}
    </div>
  );
}
```

### 5. Auth State Listeners

Listen to auth state changes:

```typescript
'use client';

import { useAuthStateChange } from '@/lib/auth';

function MyComponent() {
  useAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      console.log('User signed in:', session?.user);
    } else if (event === 'SIGNED_OUT') {
      console.log('User signed out');
    } else if (event === 'TOKEN_REFRESHED') {
      console.log('Session refreshed');
    }
  });
  
  return <div>Listening to auth changes...</div>;
}
```

## OAuth Flow

1. User clicks "Sign in with Google/Apple/Microsoft"
2. `signInWithOAuth()` redirects to provider's authorization page
3. User grants permission
4. Provider redirects to `/auth/callback` with authorization code
5. Callback route exchanges code for session
6. User record is created in database if new user
7. User is redirected to dashboard

## Protected Routes

### Server Components

```typescript
// app/dashboard/page.tsx
import { requireAuth } from '@/lib/auth';

export default async function DashboardPage() {
  const user = await requireAuth(); // Throws error if not authenticated
  
  return <div>Welcome, {user.email}</div>;
}
```

### Client Components

```typescript
'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);
  
  if (loading) return <div>Loading...</div>;
  if (!user) return null;
  
  return <div>Protected content</div>;
}
```

## Role-Based Access Control

Users have roles stored in their metadata:
- `buyer`: Default role for all users
- `seller`: Users who can list books
- `admin`: Platform administrators

```typescript
// Server-side
const admin = await requireRole('admin');
const isSeller = await hasRole('seller');

// Client-side
const { hasRole: isAdmin } = useIsAdmin();
const { hasRole: isSeller } = useIsSeller();
```

## Session Management

Sessions are automatically managed by Supabase:
- Sessions are stored in httpOnly cookies
- Tokens are automatically refreshed before expiration
- Session refresh happens transparently in the background

Manual session refresh:

```typescript
// Client-side
import { refreshSession } from '@/lib/auth';
await refreshSession();

// Using hook
const { refresh, refreshing } = useRefreshSession();
await refresh();
```

## Error Handling

All auth functions throw errors that should be caught:

```typescript
try {
  await signInWithGoogle();
} catch (error) {
  console.error('Sign in failed:', error.message);
}

// Or use error state from hooks
const { user, error } = useAuth();
if (error) {
  console.error('Auth error:', error.message);
}
```

## Real-Time Updates

Auth state updates are automatically propagated via Supabase listeners:
- Sign in/out events
- Session refresh events
- Token expiration events

User profile updates from database are also real-time:

```typescript
const { profile } = useUserProfile();
// Profile automatically updates when database changes
```

## Environment Variables

Required environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## OAuth Provider Setup

OAuth providers must be configured in Supabase Dashboard:
1. Go to Authentication > Providers
2. Enable Google, Apple, and Microsoft
3. Add OAuth credentials (Client ID, Client Secret)
4. Set redirect URLs to: `https://your-domain.com/auth/callback`

## Testing

Test authentication flows:

```typescript
// Test sign in
await signInWithGoogle();

// Test protected routes
const user = await getServerUser();
expect(user).toBeTruthy();

// Test role checks
const isAdmin = await hasRole('admin');
expect(isAdmin).toBe(true);
```

## Best Practices

1. **Use server-side auth for API routes**: Always use `getServerUser()` or `requireAuth()` in API routes
2. **Use hooks in client components**: Use `useAuth()` and related hooks for reactive auth state
3. **Handle loading states**: Always check `loading` before rendering auth-dependent content
4. **Catch errors**: Wrap auth calls in try-catch blocks
5. **Use AuthProvider**: Wrap your app with AuthProvider for global state
6. **Protect sensitive routes**: Use `requireAuth()` or `requireRole()` for protected pages
7. **Clean up subscriptions**: Hooks automatically clean up listeners on unmount

## Troubleshooting

**Issue**: User is not authenticated after OAuth redirect
- Check OAuth provider configuration in Supabase
- Verify redirect URL matches callback route
- Check browser console for errors

**Issue**: Session expires too quickly
- Check Supabase JWT expiration settings
- Ensure session refresh is working

**Issue**: Role checks not working
- Verify user metadata includes role field
- Check database user record has correct role

## Related Documentation

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js Authentication](https://nextjs.org/docs/authentication)
- [OAuth 2.0 Specification](https://oauth.net/2/)
