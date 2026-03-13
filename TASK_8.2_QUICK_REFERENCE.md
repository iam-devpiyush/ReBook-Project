# Task 8.2 Quick Reference: Authentication Middleware

## 🚀 Quick Start

### Import Middleware

```typescript
import { requireAuth, requireSeller, requireAdmin } from '@/lib/auth/middleware';
```

### Protected Route (Any User)

```typescript
export async function GET(request: NextRequest) {
  const result = await requireAuth(request);
  if (!result.success) return result.response;
  
  const { user } = result;
  // user.id, user.email, user.role available
}
```

### Seller Route

```typescript
export async function POST(request: NextRequest) {
  const result = await requireSeller(request);
  if (!result.success) return result.response;
  
  const { user } = result;
  // Only sellers and admins can reach here
}
```

### Admin Route

```typescript
export async function POST(request: NextRequest) {
  const result = await requireAdmin(request);
  if (!result.success) return result.response;
  
  const { user } = result;
  // Only admins can reach here
}
```

## 📦 What's Included

### Middleware Functions
- `getUser(request)` - Get authenticated user
- `requireAuth(request)` - Require any authenticated user
- `requireSeller(request)` - Require seller or admin
- `requireAdmin(request)` - Require admin only

### Helper Functions
- `hasRole(user, role)` - Check specific role
- `hasAnyRole(user, roles)` - Check multiple roles

### Types
- `UserWithRole` - User object with role info
- `MiddlewareResult` - Success/error result type

## 🔒 Security Features

✅ Session token verification via Supabase Auth
✅ Database profile fetch for current role/status
✅ Account suspension checking
✅ Account active status checking
✅ Proper HTTP status codes (401, 403)
✅ Clear error messages

## 📋 HTTP Responses

| Status | Condition | Error Message |
|--------|-----------|---------------|
| 401 | Not authenticated | "Unauthorized: Authentication required" |
| 403 | Wrong role | "Forbidden: Seller/Admin role required" |
| 403 | Suspended | "Account suspended" + expiry date |
| 403 | Inactive | "Account is inactive" |
| 500 | Profile error | "Failed to fetch user profile" |

## 🎯 Role Hierarchy

- **Buyer**: Basic user, can browse and purchase
- **Seller**: Can create listings + buyer permissions
- **Admin**: Full access, can access seller routes

Note: `requireSeller` allows both sellers AND admins.

## 📚 Full Documentation

- [Middleware Usage Guide](frontend/src/lib/auth/MIDDLEWARE_USAGE.md)
- [Task Completion Summary](TASK_8.2_COMPLETE.md)

## ✅ Requirements

- ✅ Requirement 1.6: Session token verification
- ✅ Requirement 1.8: Role-based access control
