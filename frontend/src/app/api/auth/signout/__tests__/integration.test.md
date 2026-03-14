# Integration Test for /api/auth/signout

## Manual Testing Steps

### Test 1: Successful Sign Out
1. Start the development server: `npm run dev`
2. Sign in using OAuth (visit `/auth/signin`)
3. Make a POST request to `/api/auth/signout`:
   ```bash
   curl -X POST http://localhost:3001/api/auth/signout \
     -H "Content-Type: application/json" \
     -c cookies.txt -b cookies.txt
   ```
4. Expected response:
   ```json
   {
     "success": true,
     "message": "Successfully signed out"
   }
   ```
5. Verify session cookies are cleared by checking cookies.txt

### Test 2: Sign Out Without Session
1. Make a POST request without being signed in:
   ```bash
   curl -X POST http://localhost:3001/api/auth/signout \
     -H "Content-Type: application/json"
   ```
2. Expected response: Should still return 200 OK (idempotent operation)

### Test 3: Client-Side Integration
1. Sign in to the application
2. Click the logout button (which should call this API route)
3. Verify you are redirected to the home page
4. Verify you cannot access protected routes

## Automated Testing

The unit tests in `route.test.ts` cover:
- ✅ Successful sign out
- ✅ Error handling when Supabase signOut fails
- ✅ Unexpected error handling
- ✅ Session cookie clearing
- ✅ Supabase client creation

## Requirements Validation

**Requirement 1.8: Logout functionality**
- ✅ Calls Supabase Auth signOut to invalidate session
- ✅ Clears all session cookies (handled by Supabase client)
- ✅ Returns appropriate HTTP response (200 OK or 500 error)
- ✅ Handles errors gracefully

## Implementation Notes

The route implementation:
1. Creates a Supabase server client with cookie access
2. Calls `supabase.auth.signOut()` which:
   - Invalidates the session on the server
   - Automatically clears session cookies via the cookie handlers
3. Returns a success response or error response

The Supabase client automatically handles cookie clearing through the cookie handlers defined in `createServerClient`, so no manual cookie clearing is needed.
