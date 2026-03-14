# Authentication Middleware Usage Guide

This guide demonstrates how to use the authentication middleware functions in Next.js API routes.

## Overview

The authentication middleware provides four main functions:
- `getUser` - Verify session and get user information
- `requireAuth` - Require authentication for any user
- `requireSeller` - Require seller or admin role
- `requireAdmin` - Require admin role only

## Basic Usage

### 1. Public Route (No Authentication Required)

```typescript
// app/api/books/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // No authentication required - anyone can view books
  return NextResponse.json({ books: [] });
}
```

### 2. Protected Route (Authentication Required)

```typescript
// app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  // Verify user is authenticated
  const result = await requireAuth(request);
  
  if (!result.success) {
    return result.response; // Returns 401 if not authenticated
  }
  
  const { user } = result;
  
  // User is authenticated - proceed with logic
  return NextResponse.json({
    id: user.id,
    email: user.email,
    role: user.role,
  });
}
```

### 3. Seller-Only Route

```typescript
// app/api/listings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSeller } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  // Verify user is a seller or admin
  const result = await requireSeller(request);
  
  if (!result.success) {
    return result.response; // Returns 401 or 403
  }
  
  const { user } = result;
  
  // User is a seller or admin - allow listing creation
  const body = await request.json();
  
  // Create listing logic here
  return NextResponse.json({ 
    message: 'Listing created',
    seller_id: user.id,
  });
}
```

### 4. Admin-Only Route

```typescript
// app/api/admin/approve-listing/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  // Verify user is an admin
  const result = await requireAdmin(request);
  
  if (!result.success) {
    return result.response; // Returns 401 or 403
  }
  
  const { user } = result;
  
  // User is an admin - allow listing approval
  const { listing_id } = await request.json();
  
  // Approve listing logic here
  return NextResponse.json({ 
    message: 'Listing approved',
    approved_by: user.id,
  });
}
```

## Advanced Usage

### Checking User Role

```typescript
import { requireAuth, hasRole, hasAnyRole } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  const result = await requireAuth(request);
  
  if (!result.success) {
    return result.response;
  }
  
  const { user } = result;
  
  // Check specific role
  if (hasRole(user, 'admin')) {
    // Admin-specific logic
  }
  
  // Check multiple roles
  if (hasAnyRole(user, ['seller', 'admin'])) {
    // Seller or admin logic
  }
  
  return NextResponse.json({ success: true });
}
```

### Custom Authorization Logic

```typescript
import { getUser } from '@/lib/auth/middleware';
import { createServerClient } from '@/lib/supabase/server';

export async function PUT(request: NextRequest) {
  // Get authenticated user
  const result = await getUser(request);
  
  if (!result.success) {
    return result.response;
  }
  
  const { user } = result;
  const { listing_id } = await request.json();
  
  // Custom authorization: verify user owns the listing
  const supabase = createServerClient();
  const { data: listing } = await supabase
    .from('listings')
    .select('seller_id')
    .eq('id', listing_id)
    .single();
  
  if (!listing || listing.seller_id !== user.id) {
    return NextResponse.json(
      { error: 'Forbidden: You can only edit your own listings' },
      { status: 403 }
    );
  }
  
  // User owns the listing - proceed with update
  return NextResponse.json({ success: true });
}
```

## Error Responses

The middleware functions return standardized error responses:

### 401 Unauthorized
Returned when user is not authenticated:
```json
{
  "error": "Unauthorized: Authentication required"
}
```

### 403 Forbidden - Wrong Role
Returned when user doesn't have required role:
```json
{
  "error": "Forbidden: Seller role required"
}
```
```json
{
  "error": "Forbidden: Admin role required"
}
```

### 403 Forbidden - Account Suspended
Returned when user account is suspended:
```json
{
  "error": "Account suspended",
  "suspended_until": "2024-12-31T23:59:59Z"
}
```

### 403 Forbidden - Account Inactive
Returned when user account is inactive:
```json
{
  "error": "Account is inactive"
}
```

### 500 Internal Server Error
Returned when profile fetch fails:
```json
{
  "error": "Failed to fetch user profile"
}
```

## User Object Structure

When authentication succeeds, you receive a `UserWithRole` object:

```typescript
interface UserWithRole {
  id: string;                    // User UUID
  email: string;                 // User email
  role: 'buyer' | 'seller' | 'admin';  // User role
  is_active: boolean;            // Account active status
  suspended_until: string | null; // Suspension expiry date
  aud: string;                   // Audience claim
  created_at: string;            // Account creation date
  app_metadata: Record<string, any>;
  user_metadata: Record<string, any>;
}
```

## Best Practices

1. **Always check the result**: The middleware returns a discriminated union - always check `result.success` before accessing `result.user`.

2. **Return early on failure**: If authentication fails, immediately return the error response:
   ```typescript
   const result = await requireAuth(request);
   if (!result.success) {
     return result.response;
   }
   ```

3. **Use the most specific middleware**: Use `requireSeller` or `requireAdmin` instead of `requireAuth` + manual role checking when possible.

4. **Admins can access seller routes**: The `requireSeller` middleware allows both sellers and admins. This is intentional for admin oversight.

5. **Custom authorization**: Use `getUser` for routes that need custom authorization logic beyond role checking.

## Testing

The middleware includes comprehensive tests. To run them:

```bash
# Install Vitest (if not already installed)
npm install --save-dev vitest @vitejs/plugin-react

# Run tests
npm test -- middleware.test.ts
```

## Requirements Satisfied

- **Requirement 1.6**: Session token verification via Supabase Auth
- **Requirement 1.8**: Role-based access control (buyer, seller, admin)
- **Requirement 9.3**: Admin authorization for moderation actions
- **Requirement 9.4**: User suspension enforcement
- **Requirement 23.3**: Secure session handling with httpOnly cookies

## Related Documentation

- [Session Handling](./SESSION_HANDLING.md) - Session configuration and management
- [Profile Management](./PROFILE_MANAGEMENT.md) - User profile operations
- [OAuth Flows](./OAUTH_FLOWS.md) - Authentication flows
