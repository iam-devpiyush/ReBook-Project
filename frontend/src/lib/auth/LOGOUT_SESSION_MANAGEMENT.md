# Logout and Session Management Documentation

## Overview

This document describes the logout functionality and session expiration handling for the Second-Hand Book Marketplace platform using Supabase Auth.

**Requirements Implemented:**
- **Requirement 1.8**: Invalidate session token on logout
- **Requirement 1.9**: Handle session expiration gracefully

## Logout Functionality

### Client-Side Logout

**Location:** `frontend/src/lib/auth/client.ts`

The `signOut` function provides client-side logout functionality:

```typescript
import { signOut } from '@/lib/auth/client';

// Sign out and redirect to home page
await signOut();

// Sign out and redirect to custom page
await signOut('/auth/signin');
```

**Behavior:**
- Calls Supabase Auth `signOut()` to invalidate session token
- Clears all session cookies automatically via Supabase client
- Redirects to home page or specified URL
- Throws error if sign out fails

### Server-Side Logout

**Location:** `frontend/src/lib/auth/server.ts`

The `signOutServer` function provides server-side logout functionality:

```typescript
import { signOutServer } from '@/lib/auth/server';

// In API route or server action
export async function POST() {
  try {
    await signOutServer();
    return new Response('Signed out successfully', { status: 200 });
  } catch (error) {
    return new Response('Sign out failed', { status: 500 });
  }
}
```

**Behavior:**
- Calls Supabase Auth `signOut()` to invalidate session token
- Clears all session cookies via server-side Supabase client
- Throws error if sign out fails

### Provider-Level Logout

**Location:** `frontend/src/lib/auth/provider.tsx`

The `AuthProvider` exposes a `signOut` function via context:

```typescript
import { useAuthContext } from '@/lib/auth/provider';

function LogoutButton() {
  const { signOut } = useAuthContext();
  
  const handleLogout = async () => {
    try {
      await signOut();
      // User will be redirected by auth state change
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  return <button onClick={handleLogout}>Logout</button>;
}
```

**Behavior:**
- Calls Supabase Auth `signOut()` to invalidate session token
- Clears local state (user, session)
- Stops automatic refresh timer
- Triggers `SIGNED_OUT` event for auth state listeners

### Hook-Based Logout

**Location:** `frontend/src/lib/auth/hooks.ts`

The `useSignOut` hook provides a convenient way to handle logout:

```typescript
import { useSignOut } from '@/lib/auth/hooks';

function LogoutButton() {
  const { signOut, signingOut, error } = useSignOut();
  
  const handleLogout = async () => {
    await signOut('/auth/signin');
  };
  
  return (
    <button onClick={handleLogout} disabled={signingOut}>
      {signingOut ? 'Signing out...' : 'Logout'}
    </button>
  );
}
```

**Features:**
- Tracks loading state (`signingOut`)
- Handles errors gracefully
- Supports custom redirect URL
- Automatically redirects after successful logout

## Session Expiration Handling

### Graceful Expiration Detection

**Location:** `frontend/src/lib/auth/provider.tsx`

The `AuthProvider` checks for session expiration during refresh checks:

```typescript
const checkAndRefreshSession = async (currentSession: Session | null) => {
  if (!currentSession?.expires_at) return;

  const expiresAt = new Date(currentSession.expires_at * 1000);
  const now = new Date();
  const secondsUntilExpiry = (expiresAt.getTime() - now.getTime()) / 1000;

  // If session has already expired, require re-authentication
  if (secondsUntilExpiry <= 0) {
    console.log('Session expired, requiring re-authentication');
    setSession(null);
    setUser(null);
    setError(new Error('Session expired. Please sign in again.'));
    return;
  }

  // Proactively refresh if within threshold (5 minutes)
  if (secondsUntilExpiry < SESSION_CONFIG.PROACTIVE_REFRESH_THRESHOLD_SECONDS) {
    // Attempt refresh...
  }
};
```

**Behavior:**
- Checks session expiration every 60 seconds
- If session expired, clears session and user state
- Sets error message for UI to display
- Requires user to sign in again

### Refresh Failure Handling

When session refresh fails near expiration:

```typescript
if (refreshError) {
  console.error('Session refresh failed:', refreshError.message);
  setError(refreshError);
  // If refresh fails and session is expired, clear session
  if (secondsUntilExpiry < 60) {
    console.log('Session refresh failed and session near expiry, clearing session');
    setSession(null);
    setUser(null);
  }
}
```

**Behavior:**
- Logs refresh error
- If session expires within 60 seconds and refresh fails, clears session
- Requires user to sign in again

### Middleware-Level Expiration Handling

**Location:** `frontend/src/lib/supabase/middleware.ts`

The middleware checks session expiration on every request:

```typescript
const { data: { session }, error } = await supabase.auth.getSession();

if (!session || error) {
  // Session expired or invalid
  return NextResponse.redirect(new URL('/auth/signin', request.url));
}

// Check if session is about to expire
const expiresAt = new Date(session.expires_at! * 1000);
const now = new Date();
const secondsUntilExpiry = (expiresAt.getTime() - now.getTime()) / 1000;

if (secondsUntilExpiry < AUTO_REFRESH_THRESHOLD_SECONDS) {
  // Attempt refresh
  await supabase.auth.refreshSession();
}
```

**Behavior:**
- Checks session on every protected route request
- Redirects to sign-in if session expired
- Attempts refresh if session expires within 60 seconds
- Transparent to the user

## Session Lifecycle

### Complete Lifecycle Flow

```
User Signs In
    ↓
Session Created (7-day expiration)
    ↓
Session Stored in httpOnly Cookie
    ↓
[Active Session]
    ↓
Automatic Refresh (every 60s check)
    ↓
If < 5 minutes → Proactive Refresh
    ↓
If Expired → Clear Session
    ↓
User Signs Out OR Session Expires
    ↓
Session Invalidated
    ↓
Cookies Cleared
    ↓
User Redirected to Sign-In
```

### Logout Flow

```
User Clicks Logout
    ↓
signOut() Called
    ↓
Supabase Auth Invalidates Token
    ↓
Session Cookies Cleared
    ↓
Local State Cleared
    ↓
Refresh Timer Stopped
    ↓
SIGNED_OUT Event Emitted
    ↓
User Redirected to Home/Sign-In
```

### Expiration Flow

```
Session Expires
    ↓
Refresh Check Detects Expiration
    ↓
Attempt Automatic Refresh
    ↓
If Refresh Succeeds → Continue
    ↓
If Refresh Fails → Clear Session
    ↓
Set Error Message
    ↓
User Sees "Session Expired" Message
    ↓
User Redirected to Sign-In
```

## Usage Examples

### Basic Logout Button

```typescript
import { signOut } from '@/lib/auth/client';

function LogoutButton() {
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  return <button onClick={handleLogout}>Logout</button>;
}
```

### Logout with Loading State

```typescript
import { useSignOut } from '@/lib/auth/hooks';

function LogoutButton() {
  const { signOut, signingOut, error } = useSignOut();
  
  return (
    <div>
      <button onClick={() => signOut()} disabled={signingOut}>
        {signingOut ? 'Signing out...' : 'Logout'}
      </button>
      {error && <p className="error">{error.message}</p>}
    </div>
  );
}
```

### Logout from Server Action

```typescript
'use server';

import { signOutServer } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export async function logoutAction() {
  try {
    await signOutServer();
    redirect('/auth/signin');
  } catch (error) {
    console.error('Server logout failed:', error);
    throw error;
  }
}
```

### Logout from API Route

```typescript
import { signOutServer } from '@/lib/auth/server';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    await signOutServer();
    return NextResponse.json({ message: 'Signed out successfully' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Sign out failed' },
      { status: 500 }
    );
  }
}
```

### Handle Session Expiration in UI

```typescript
import { useAuthContext } from '@/lib/auth/provider';

function SessionStatus() {
  const { session, error } = useAuthContext();
  
  if (error?.message.includes('expired')) {
    return (
      <div className="alert alert-warning">
        Your session has expired. Please <a href="/auth/signin">sign in again</a>.
      </div>
    );
  }
  
  if (!session) {
    return <div>Not authenticated</div>;
  }
  
  return <div>Session active</div>;
}
```

### Check Session Expiration Time

```typescript
import { useAuthContext } from '@/lib/auth/provider';

function SessionTimer() {
  const { session } = useAuthContext();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  
  useEffect(() => {
    if (!session?.expires_at) return;
    
    const interval = setInterval(() => {
      const expiresAt = new Date(session.expires_at! * 1000);
      const now = new Date();
      const seconds = Math.max(0, (expiresAt.getTime() - now.getTime()) / 1000);
      setTimeRemaining(seconds);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [session]);
  
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = Math.floor(timeRemaining % 60);
  
  return (
    <div>
      Session expires in: {minutes}m {seconds}s
    </div>
  );
}
```

## Cookie Management

### Cookie Clearing on Logout

When `signOut()` is called, Supabase automatically clears the following cookies:

- `sb-auth-token` - Main session token
- `sb-refresh-token` - Refresh token (if stored in cookies)
- Any other Supabase-related cookies

**Cookie Attributes:**
- `httpOnly: true` - Cannot be accessed via JavaScript
- `secure: true` - Only sent over HTTPS (production)
- `sameSite: 'lax'` - CSRF protection
- `maxAge: 0` - Immediate expiration on logout

### Manual Cookie Clearing (if needed)

If you need to manually clear cookies:

```typescript
import { cookies } from 'next/headers';

export async function clearAuthCookies() {
  const cookieStore = cookies();
  
  // Clear Supabase auth cookies
  cookieStore.set('sb-auth-token', '', { maxAge: 0 });
  cookieStore.set('sb-refresh-token', '', { maxAge: 0 });
}
```

## Error Handling

### Logout Errors

Common logout errors and how to handle them:

**Network Error:**
```typescript
try {
  await signOut();
} catch (error) {
  if (error.message.includes('network')) {
    // Show retry option
    console.error('Network error during logout. Please try again.');
  }
}
```

**Session Already Expired:**
```typescript
try {
  await signOut();
} catch (error) {
  if (error.message.includes('expired')) {
    // Session already expired, just redirect
    window.location.href = '/auth/signin';
  }
}
```

### Session Expiration Errors

Handle session expiration gracefully:

```typescript
import { useAuthContext } from '@/lib/auth/provider';
import { useRouter } from 'next/navigation';

function ProtectedComponent() {
  const { session, error } = useAuthContext();
  const router = useRouter();
  
  useEffect(() => {
    if (error?.message.includes('expired')) {
      // Show notification
      alert('Your session has expired. Please sign in again.');
      // Redirect to sign-in
      router.push('/auth/signin');
    }
  }, [error, router]);
  
  if (!session) {
    return <div>Loading...</div>;
  }
  
  return <div>Protected content</div>;
}
```

## Security Considerations

### Session Token Invalidation

When a user logs out:
1. **Server-side invalidation**: Supabase Auth invalidates the JWT token
2. **Cookie clearing**: All session cookies are removed from the browser
3. **Local state clearing**: All user data is removed from React state
4. **Timer cleanup**: Automatic refresh timers are stopped

### Preventing Session Hijacking

- Sessions are stored in httpOnly cookies (cannot be accessed via JavaScript)
- Cookies are only sent over HTTPS in production
- Session tokens are short-lived (7 days) with automatic refresh
- Logout invalidates tokens immediately on the server

### Handling Concurrent Sessions

If a user signs in on multiple devices:
- Each device has its own session token
- Logging out on one device does not affect other devices
- Each session expires independently after 7 days
- Refresh tokens are device-specific

## Testing

### Test Logout Functionality

```typescript
import { signOut } from '@/lib/auth/client';

describe('Logout', () => {
  it('should clear session on logout', async () => {
    await signOut();
    
    const session = await getCurrentSession();
    expect(session).toBeNull();
  });
  
  it('should redirect after logout', async () => {
    const mockRedirect = jest.fn();
    window.location.href = mockRedirect;
    
    await signOut('/auth/signin');
    
    expect(mockRedirect).toHaveBeenCalledWith('/auth/signin');
  });
});
```

### Test Session Expiration

```typescript
import { checkAndRefreshSession } from '@/lib/auth/provider';

describe('Session Expiration', () => {
  it('should clear session when expired', async () => {
    const expiredSession = {
      expires_at: Math.floor(Date.now() / 1000) - 100, // Expired 100 seconds ago
    };
    
    await checkAndRefreshSession(expiredSession);
    
    expect(session).toBeNull();
    expect(error.message).toContain('expired');
  });
  
  it('should refresh session when near expiry', async () => {
    const nearExpirySession = {
      expires_at: Math.floor(Date.now() / 1000) + 200, // Expires in 200 seconds
    };
    
    await checkAndRefreshSession(nearExpirySession);
    
    expect(session).not.toBeNull();
  });
});
```

## Monitoring and Debugging

### Console Logs

The system logs important session events:

```
✓ User signed out successfully
✓ Session expired, requiring re-authentication
✓ Session refresh failed and session near expiry, clearing session
✓ Proactively refreshing session (expires in 280 seconds)
```

### Debug Session State

```typescript
import { useAuthContext } from '@/lib/auth/provider';

function DebugSession() {
  const { session, user, error } = useAuthContext();
  
  return (
    <pre>
      {JSON.stringify({
        hasSession: !!session,
        hasUser: !!user,
        expiresAt: session?.expires_at,
        error: error?.message,
      }, null, 2)}
    </pre>
  );
}
```

## Requirements Validation

### ✅ Requirement 1.8: Invalidate Session Token on Logout

- `signOut()` calls Supabase Auth to invalidate JWT token
- Session cookies are cleared automatically
- Local state is cleared (user, session)
- Refresh timer is stopped
- User is redirected to home/sign-in page

### ✅ Requirement 1.9: Handle Session Expiration Gracefully

- Automatic session refresh before expiration (5-minute threshold)
- Expired sessions are detected and cleared
- Error message is set for UI to display
- User is required to sign in again
- Middleware redirects to sign-in on expired sessions
- Refresh failures near expiration clear the session

## Related Files

- `frontend/src/lib/auth/client.ts` - Client-side logout function
- `frontend/src/lib/auth/server.ts` - Server-side logout function
- `frontend/src/lib/auth/provider.tsx` - AuthProvider with session expiration handling
- `frontend/src/lib/auth/hooks.ts` - useSignOut hook
- `frontend/src/lib/supabase/middleware.ts` - Middleware session expiration handling
- `frontend/src/lib/auth/SESSION_HANDLING.md` - Session handling documentation

## Next Steps

After implementing logout and session management:

1. **Task 8.4**: Write unit tests for logout functionality
2. **Task 9**: Implement authentication API routes
3. **Integration Testing**: Test logout and session expiration in real scenarios
4. **UI Components**: Create logout buttons and session expiration notifications
