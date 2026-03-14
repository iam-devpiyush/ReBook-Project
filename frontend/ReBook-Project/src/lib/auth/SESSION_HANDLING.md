# Session Handling Documentation

## Overview

This document describes the session management implementation for the Second-Hand Book Marketplace platform using Supabase Auth.

**Requirements Implemented:**
- **Requirement 1.6**: Session expiration (7 days)
- **Requirement 1.7**: Automatic session refresh
- **Requirement 23.3**: Secure httpOnly cookies

## Session Configuration

### Session Expiration

Sessions are configured to expire after **7 days** (604,800 seconds).

```typescript
const SESSION_CONFIG = {
  EXPIRATION_SECONDS: 7 * 24 * 60 * 60, // 604800 seconds
};
```

### Cookie Settings

Sessions are stored in secure, httpOnly cookies with the following configuration:

```typescript
{
  name: 'sb-auth-token',
  maxAge: 604800, // 7 days
  httpOnly: true, // Prevents XSS attacks
  secure: true, // HTTPS only in production
  sameSite: 'lax', // CSRF protection
  path: '/',
}
```

**Security Features:**
- `httpOnly: true` - Cookie cannot be accessed via JavaScript (XSS protection)
- `secure: true` - Cookie only sent over HTTPS in production
- `sameSite: 'lax'` - Provides CSRF protection while allowing OAuth flows

## Automatic Session Refresh

The platform implements **three layers** of automatic session refresh:

### 1. Middleware-Level Refresh

**Location:** `frontend/src/lib/supabase/middleware.ts`

**Behavior:**
- Runs on every request
- Checks if session expires within 60 seconds
- Automatically refreshes if needed
- Transparent to the user

```typescript
const AUTO_REFRESH_THRESHOLD_SECONDS = 60;

if (secondsUntilExpiry < AUTO_REFRESH_THRESHOLD_SECONDS) {
  await supabase.auth.refreshSession();
}
```

### 2. Provider-Level Proactive Refresh

**Location:** `frontend/src/lib/auth/provider.tsx`

**Behavior:**
- Checks session every 60 seconds
- Proactively refreshes when 5 minutes remain
- Runs in the background
- Logs refresh events to console

```typescript
const PROACTIVE_REFRESH_THRESHOLD_SECONDS = 5 * 60; // 5 minutes
const REFRESH_CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

setInterval(() => {
  if (secondsUntilExpiry < PROACTIVE_REFRESH_THRESHOLD_SECONDS) {
    await supabase.auth.refreshSession();
  }
}, REFRESH_CHECK_INTERVAL_MS);
```

### 3. Supabase Built-in Refresh

**Location:** Supabase Auth SDK

**Behavior:**
- Supabase SDK automatically refreshes tokens
- Triggered by `onAuthStateChange` listener
- Emits `TOKEN_REFRESHED` event
- Handled by AuthProvider

## Session Lifecycle

### 1. Sign In

```
User Signs In
    ↓
OAuth Provider Authenticates
    ↓
Supabase Generates JWT
    ↓
Session Stored in httpOnly Cookie
    ↓
Session Expires in 7 Days
```

### 2. Active Session

```
User Makes Request
    ↓
Middleware Checks Session
    ↓
If < 60s Until Expiry → Refresh
    ↓
Continue with Valid Session
```

### 3. Proactive Refresh

```
Every 60 Seconds
    ↓
Check Session Expiry
    ↓
If < 5 Minutes → Refresh
    ↓
Update Session in Cookie
```

### 4. Sign Out

```
User Signs Out
    ↓
Supabase Invalidates Token
    ↓
Cookie Cleared
    ↓
Refresh Timer Stopped
```

## Implementation Details

### Client-Side Configuration

**File:** `frontend/src/lib/supabase/client.ts`

```typescript
export const createClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        name: 'sb-auth-token',
        maxAge: 604800, // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      },
    }
  );
};
```

### Server-Side Configuration

**File:** `frontend/src/lib/supabase/server.ts`

```typescript
export const createServerClient = () => {
  const cookieStore = cookies();
  
  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ 
            name, 
            value, 
            maxAge: 604800, // 7 days
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
          });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', maxAge: 0 });
        },
      },
    }
  );
};
```

## Usage Examples

### Manual Session Refresh

```typescript
import { useAuthContext } from '@/lib/auth/provider';

function MyComponent() {
  const { refreshSession } = useAuthContext();
  
  const handleRefresh = async () => {
    try {
      await refreshSession();
      console.log('Session refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh session:', error);
    }
  };
  
  return <button onClick={handleRefresh}>Refresh Session</button>;
}
```

### Check Session Status

```typescript
import { useAuthContext } from '@/lib/auth/provider';

function SessionStatus() {
  const { session } = useAuthContext();
  
  if (!session) {
    return <div>Not authenticated</div>;
  }
  
  const expiresAt = new Date(session.expires_at! * 1000);
  const now = new Date();
  const secondsRemaining = (expiresAt.getTime() - now.getTime()) / 1000;
  
  return (
    <div>
      Session expires in: {Math.round(secondsRemaining / 60)} minutes
    </div>
  );
}
```

### Server-Side Session Check

```typescript
import { getServerSession } from '@/lib/auth/server';

export async function GET() {
  const session = await getServerSession();
  
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Session is valid
  return new Response('Authenticated');
}
```

## Session Expiration Handling

### Graceful Expiration

When a session expires:

1. **Middleware detects expiration** on next request
2. **Attempts automatic refresh** if refresh token is valid
3. **If refresh fails**, user is redirected to sign-in page
4. **User data is cleared** from AuthProvider state

### User Experience

- **Active users**: Session refreshes automatically, no interruption
- **Inactive users**: Session expires after 7 days, must sign in again
- **Returning users**: If within 7 days, session is still valid

## Security Considerations

### httpOnly Cookies

Sessions are stored in httpOnly cookies, which:
- Cannot be accessed via JavaScript
- Protect against XSS attacks
- Are automatically sent with requests
- Are managed by the browser

### HTTPS in Production

In production:
- `secure: true` ensures cookies only sent over HTTPS
- Prevents man-in-the-middle attacks
- Required for OAuth providers

### SameSite Protection

`sameSite: 'lax'` provides:
- CSRF protection for most requests
- Allows OAuth callback flows
- Balances security and functionality

## Monitoring and Debugging

### Console Logs

The AuthProvider logs session events:

```
✓ User signed in
✓ Session token refreshed
✓ Proactively refreshing session (expires in 280 seconds)
✓ Session successfully refreshed
```

### Error Handling

Session refresh errors are:
- Logged to console
- Stored in AuthProvider error state
- Do not interrupt user experience
- Trigger re-authentication if critical

### Testing Session Refresh

To test automatic refresh:

1. Sign in to the application
2. Open browser console
3. Wait for proactive refresh logs (every 60 seconds)
4. Verify session is refreshed before expiration

## Configuration Constants

All session configuration is centralized:

```typescript
export const SESSION_CONFIG = {
  // 7 days in seconds (Requirement 1.6, 23.3)
  EXPIRATION_SECONDS: 7 * 24 * 60 * 60, // 604800 seconds
  
  // Middleware: refresh when 60 seconds remain
  AUTO_REFRESH_THRESHOLD_SECONDS: 60,
  
  // Provider: proactive refresh when 5 minutes remain
  PROACTIVE_REFRESH_THRESHOLD_SECONDS: 5 * 60, // 300 seconds
  
  // Check interval: every minute
  REFRESH_CHECK_INTERVAL_MS: 60 * 1000, // 60000 ms
} as const;
```

## Requirements Validation

### ✅ Requirement 1.6: Session Expiration (7 days)

- Sessions configured with 7-day expiration
- Cookie `maxAge` set to 604,800 seconds
- Enforced in both client and server configurations

### ✅ Requirement 1.7: Automatic Session Refresh

- Middleware-level refresh (60-second threshold)
- Provider-level proactive refresh (5-minute threshold)
- Supabase SDK automatic refresh
- No user intervention required

### ✅ Requirement 23.3: Secure httpOnly Cookies

- `httpOnly: true` prevents JavaScript access
- `secure: true` in production (HTTPS only)
- `sameSite: 'lax'` for CSRF protection
- Session tokens never exposed to client code

## Troubleshooting

### Session Not Persisting

**Symptoms:** User signed out after page refresh

**Solutions:**
1. Check browser cookie settings (allow cookies)
2. Verify Supabase URL and anon key in `.env.local`
3. Ensure `httpOnly` cookies are enabled
4. Check browser console for errors

### Session Not Refreshing

**Symptoms:** User signed out after 7 days

**Solutions:**
1. Check middleware is running (console logs)
2. Verify AuthProvider is wrapping the app
3. Check Supabase project settings (JWT expiry)
4. Ensure refresh token is valid

### Cookie Not Set

**Symptoms:** No `sb-auth-token` cookie in browser

**Solutions:**
1. Verify OAuth callback is working
2. Check cookie domain settings
3. Ensure HTTPS in production
4. Check browser security settings

## Related Files

- `frontend/src/lib/supabase/client.ts` - Client-side Supabase configuration
- `frontend/src/lib/supabase/server.ts` - Server-side Supabase configuration
- `frontend/src/lib/supabase/middleware.ts` - Middleware session refresh
- `frontend/src/lib/auth/provider.tsx` - AuthProvider with proactive refresh
- `frontend/src/lib/auth/client.ts` - Client-side auth utilities
- `frontend/src/lib/auth/server.ts` - Server-side auth utilities

## Next Steps

After implementing session handling:

1. **Task 8.2**: Write unit tests for session configuration
2. **Task 8.3**: Implement logout and session management
3. **Task 9**: Implement protected routes with session validation
4. **Integration Testing**: Test session refresh in real scenarios
