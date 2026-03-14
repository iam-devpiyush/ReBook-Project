# OAuth Sign-In Flows Guide

## Overview

This guide explains how to use the OAuth sign-in flows implemented for Google, Apple, and Microsoft authentication.

## Quick Start

### For Users

1. Visit the sign-in page: `/auth/signin`
2. Click on your preferred OAuth provider button
3. Grant permission on the provider's page
4. You'll be redirected back to the dashboard

### For Developers

```typescript
import { signInWithGoogle, signInWithApple, signInWithMicrosoft } from '@/lib/auth';

// Sign in with Google
await signInWithGoogle();

// Sign in with Apple
await signInWithApple();

// Sign in with Microsoft
await signInWithMicrosoft();

// With custom redirect
await signInWithGoogle('/custom/redirect');
```

## OAuth Flow Sequence

```
User → Sign-In Page → OAuth Provider → Callback → Dashboard
  ↓         ↓              ↓              ↓          ↓
Visit    Click        Authorize      Exchange    Redirect
/signin   Button       Account         Code      to /dashboard
```

## Components

### Sign-In Page (`/auth/signin`)
- Displays OAuth provider buttons
- Handles loading states
- Shows error messages
- Supports redirect URL via query params

### Callback Route (`/auth/callback`)
- Exchanges authorization code for session
- Creates user record in database
- Handles OAuth errors
- Redirects to dashboard or error page

### Error Page (`/auth/error`)
- Displays authentication errors
- Provides retry and home links
- Shows user-friendly error messages

### Dashboard (`/dashboard`)
- Protected route requiring authentication
- Displays user profile information
- Provides sign-out functionality

## OAuth Providers

### Google OAuth
- Provider: `google`
- Function: `signInWithGoogle()`
- Scopes: email, profile
- Button: Blue with Google logo

### Apple OAuth
- Provider: `apple`
- Function: `signInWithApple()`
- Scopes: email, name
- Button: Black with Apple logo

### Microsoft OAuth
- Provider: `azure` (Azure AD)
- Function: `signInWithMicrosoft()`
- Scopes: email, profile
- Button: White with Microsoft logo

## Error Handling

### Common Errors

1. **access_denied**: User denied permission
   - Solution: Try again and grant permissions

2. **exchange_failed**: Code exchange failed
   - Solution: Check OAuth configuration

3. **server_error**: Server error occurred
   - Solution: Try again later

### Error Display

Errors are displayed on `/auth/error` with:
- Error code
- User-friendly message
- Description (if available)
- Retry and home links

## Protected Routes

### Client-Side Protection

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

### Server-Side Protection

```typescript
import { requireAuth } from '@/lib/auth';

export default async function ProtectedPage() {
  const user = await requireAuth(); // Throws if not authenticated
  
  return <div>Protected content for {user.email}</div>;
}
```

## Redirect URLs

### Default Redirect
By default, users are redirected to `/dashboard` after sign-in.

### Custom Redirect
Pass a custom redirect URL:

```typescript
// In sign-in page
await signInWithGoogle('/custom/page');

// Or via query param
<Link href="/auth/signin?redirect=/custom/page">
  Sign In
</Link>
```

### Callback Route
The callback route is always `/auth/callback`. This must be configured in your OAuth provider settings.

## Session Management

### Session Storage
- Sessions are stored in httpOnly cookies
- Automatic token refresh via Supabase
- Secure and protected from XSS

### Session Lifecycle
1. User signs in → Session created
2. Token expires → Automatic refresh
3. User signs out → Session destroyed

### Check Auth State

```typescript
import { useAuth } from '@/lib/auth';

function MyComponent() {
  const { user, session, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not signed in</div>;
  
  return <div>Signed in as {user.email}</div>;
}
```

## Database Integration

### User Record Creation

When a user signs in for the first time:
1. OAuth profile is received
2. User record is created in `users` table
3. Fields populated:
   - `id`: User ID from Supabase Auth
   - `email`: Email from OAuth profile
   - `name`: Name from OAuth profile
   - `profile_picture`: Avatar URL
   - `oauth_provider`: Provider name (google, apple, azure)
   - `oauth_provider_id`: Provider-specific user ID
   - `role`: Default role (buyer)
   - `is_active`: true

### Existing User Sign-In

For existing users:
1. OAuth profile is received
2. User is found by ID
3. Session is created
4. User is redirected to dashboard

## Testing

### Manual Testing

1. Start the development server
2. Visit `/auth/signin`
3. Click each OAuth button
4. Verify redirect to provider
5. Grant permission
6. Verify redirect to dashboard
7. Check user record in database

### Automated Testing

```bash
cd frontend
npm test -- oauth-flows.test.ts
```

## Configuration

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### OAuth Provider Setup

In Supabase Dashboard:
1. Go to Authentication > Providers
2. Enable Google, Apple, Microsoft
3. Add OAuth credentials
4. Set redirect URL: `https://your-domain.com/auth/callback`

## Best Practices

1. **Always handle loading states**: Check `loading` before rendering
2. **Handle errors gracefully**: Show user-friendly error messages
3. **Use AuthProvider**: Wrap app with AuthProvider for global state
4. **Protect sensitive routes**: Use `requireAuth()` or redirect logic
5. **Test all providers**: Verify each OAuth provider works correctly
6. **Monitor errors**: Log OAuth errors for debugging

## Troubleshooting

### OAuth redirect not working
- Check redirect URL in provider settings
- Verify callback route is accessible
- Check browser console for errors

### User not created in database
- Check database permissions
- Verify users table exists
- Check callback route logs

### Session not persisting
- Check cookie settings
- Verify Supabase configuration
- Check browser cookie settings

### Provider button not working
- Check OAuth credentials
- Verify provider is enabled in Supabase
- Check network requests in browser

## Related Documentation

- [Authentication Utilities README](./README.md)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [OAuth 2.0 Specification](https://oauth.net/2/)
