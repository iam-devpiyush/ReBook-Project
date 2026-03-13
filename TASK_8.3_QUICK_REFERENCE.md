# Task 8.3: Logout and Session Management - Quick Reference

## Quick Start

### 1. Client-Side Logout

```typescript
import { signOut } from '@/lib/auth/client';

// Basic logout
await signOut();

// Logout with custom redirect
await signOut('/auth/signin');
```

### 2. Logout with Loading State

```typescript
import { useSignOut } from '@/lib/auth/hooks';

function LogoutButton() {
  const { signOut, signingOut, error } = useSignOut();
  
  return (
    <button onClick={() => signOut()} disabled={signingOut}>
      {signingOut ? 'Signing out...' : 'Logout'}
    </button>
  );
}
```

### 3. Logout from Context

```typescript
import { useAuthContext } from '@/lib/auth/provider';

function LogoutButton() {
  const { signOut } = useAuthContext();
  
  return <button onClick={signOut}>Logout</button>;
}
```

### 4. Server-Side Logout

```typescript
'use server';

import { signOutServer } from '@/lib/auth/server';

export async function logoutAction() {
  await signOutServer();
  redirect('/auth/signin');
}
```

### 5. Session Expiration Alert

```typescript
import { useAuthContext } from '@/lib/auth/provider';

function SessionAlert() {
  const { error } = useAuthContext();
  
  if (error?.message.includes('expired')) {
    return <div>Session expired. Please sign in again.</div>;
  }
  
  return null;
}
```

## Key Features

### Logout Functionality
- ✅ Invalidates session token via Supabase Auth
- ✅ Clears all session cookies automatically
- ✅ Clears local state (user, session)
- ✅ Stops automatic refresh timer
- ✅ Supports custom redirect URLs
- ✅ Provides loading state and error handling

### Session Expiration Handling
- ✅ Detects expired sessions automatically
- ✅ Clears session and user state on expiration
- ✅ Sets error message for UI display
- ✅ Attempts refresh before expiration (5-minute threshold)
- ✅ Handles refresh failures gracefully
- ✅ Redirects to sign-in page via middleware

## API Reference

### Client Functions

#### `signOut(redirectTo?: string): Promise<void>`
Client-side logout function.

**Parameters:**
- `redirectTo` (optional): URL to redirect after logout (default: '/')

**Throws:** Error if sign out fails

**Example:**
```typescript
await signOut('/auth/signin');
```

### Server Functions

#### `signOutServer(): Promise<void>`
Server-side logout function for API routes and server actions.

**Throws:** Error if sign out fails

**Example:**
```typescript
await signOutServer();
```

### Hooks

#### `useSignOut()`
Hook for logout with loading state and error handling.

**Returns:**
- `signOut(redirectTo?: string): Promise<void>` - Logout function
- `signingOut: boolean` - Loading state
- `error: Error | null` - Error state

**Example:**
```typescript
const { signOut, signingOut, error } = useSignOut();
```

#### `useAuthContext()`
Hook to access auth context including signOut method.

**Returns:**
- `user: User | null` - Current user
- `session: Session | null` - Current session
- `loading: boolean` - Loading state
- `error: Error | null` - Error state
- `signOut(): Promise<void>` - Logout function
- `refreshSession(): Promise<void>` - Refresh function

**Example:**
```typescript
const { user, signOut } = useAuthContext();
```

## Session Configuration

```typescript
const SESSION_CONFIG = {
  // 7 days in seconds
  EXPIRATION_SECONDS: 604800,
  
  // Middleware: refresh when 60 seconds remain
  AUTO_REFRESH_THRESHOLD_SECONDS: 60,
  
  // Provider: proactive refresh when 5 minutes remain
  PROACTIVE_REFRESH_THRESHOLD_SECONDS: 300,
  
  // Check interval: every minute
  REFRESH_CHECK_INTERVAL_MS: 60000,
};
```

## Common Patterns

### Logout Button with Confirmation

```typescript
function LogoutButton() {
  const { signOut } = useAuthContext();
  const [showDialog, setShowDialog] = useState(false);
  
  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await signOut();
    }
  };
  
  return <button onClick={handleLogout}>Logout</button>;
}
```

### User Menu with Logout

```typescript
function UserMenu() {
  const { user, signOut } = useAuthContext();
  
  if (!user) return null;
  
  return (
    <div>
      <span>{user.email}</span>
      <button onClick={signOut}>Logout</button>
    </div>
  );
}
```

### Session Timer

```typescript
function SessionTimer() {
  const { session } = useAuthContext();
  const [timeRemaining, setTimeRemaining] = useState(0);
  
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
  
  return <div>Session expires in: {minutes} minutes</div>;
}
```

## Error Handling

### Logout Errors

```typescript
try {
  await signOut();
} catch (error) {
  if (error.message.includes('network')) {
    console.error('Network error. Please try again.');
  } else if (error.message.includes('expired')) {
    // Session already expired, just redirect
    window.location.href = '/auth/signin';
  } else {
    console.error('Logout failed:', error);
  }
}
```

### Session Expiration Errors

```typescript
const { error } = useAuthContext();

if (error?.message.includes('expired')) {
  // Show notification
  alert('Your session has expired. Please sign in again.');
  // Redirect to sign-in
  router.push('/auth/signin');
}
```

## Security Notes

### Session Token Invalidation
- Tokens are invalidated server-side via Supabase Auth
- Immediate revocation on logout
- No residual session data

### Cookie Security
- httpOnly cookies (cannot be accessed via JavaScript)
- Secure cookies (HTTPS only in production)
- SameSite protection (CSRF prevention)
- Automatic clearing on logout

### State Management
- Local state cleared on logout
- Refresh timer stopped
- No memory leaks
- Clean session termination

## Troubleshooting

### Logout Not Working
1. Check browser console for errors
2. Verify Supabase configuration
3. Check network requests
4. Ensure cookies are enabled

### Session Not Expiring
1. Check session configuration
2. Verify refresh timer is running
3. Check middleware is active
4. Review console logs

### Redirect Not Working
1. Verify redirect URL is correct
2. Check for JavaScript errors
3. Ensure window.location.href is accessible
4. Test with different URLs

## Files Reference

### Core Files
- `frontend/src/lib/auth/client.ts` - Client-side functions
- `frontend/src/lib/auth/server.ts` - Server-side functions
- `frontend/src/lib/auth/provider.tsx` - AuthProvider
- `frontend/src/lib/auth/hooks.ts` - React hooks

### Documentation
- `frontend/src/lib/auth/LOGOUT_SESSION_MANAGEMENT.md` - Full documentation

### Examples
- `frontend/src/lib/auth/logout-examples.tsx` - Example components

### Tests
- `frontend/src/lib/auth/__tests__/logout-session.test.ts` - Unit tests

## Requirements

### Requirement 1.8: Invalidate Session Token on Logout
✅ Implemented via Supabase Auth signOut()
✅ Clears all session cookies
✅ Clears local state
✅ Stops refresh timer

### Requirement 1.9: Handle Session Expiration Gracefully
✅ Automatic expiration detection
✅ Session clearing on expiration
✅ Error message display
✅ Proactive refresh before expiration
✅ Graceful refresh failure handling

## Next Steps

After implementing logout:
1. Test logout functionality in the browser
2. Verify session expiration handling
3. Integrate logout buttons into UI
4. Add session expiration alerts
5. Test with different scenarios

## Support

For more information:
- See `LOGOUT_SESSION_MANAGEMENT.md` for detailed documentation
- See `logout-examples.tsx` for more examples
- Run `npx tsx scripts/verify-logout-session.ts` to verify implementation
