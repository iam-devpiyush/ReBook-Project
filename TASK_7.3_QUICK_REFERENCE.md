# Task 7.3 Quick Reference: User Profile Management

## Quick Start

### Import Profile Functions

```typescript
import {
  syncUserProfileServer,
  syncUserProfileClient,
  getUserProfileById,
  updateUserProfile,
  type UserProfile,
} from '@/lib/auth/profile';
```

## Common Use Cases

### 1. Sync Profile After OAuth (Server-Side)

```typescript
// In API route or server component
import { syncUserProfileServer } from '@/lib/auth/profile';
import { createServerClient } from '@/lib/supabase/server';

const supabase = createServerClient();
const { data: { user } } = await supabase.auth.getUser();

if (user) {
  const { data, error } = await syncUserProfileServer(user);
  if (error) {
    console.error('Profile sync failed:', error);
  }
}
```

### 2. Sync Profile After OAuth (Client-Side)

```typescript
// In client component
import { syncUserProfileClient } from '@/lib/auth/profile';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();

if (user) {
  const { data, error } = await syncUserProfileClient(user);
  if (error) {
    console.error('Profile sync failed:', error);
  }
}
```

### 3. Get User Profile

```typescript
import { getUserProfileById } from '@/lib/auth/profile';

const { data: profile, error } = await getUserProfileById('user-123');
if (profile) {
  console.log('User:', profile.name, profile.email);
}
```

### 4. Update User Profile

```typescript
import { updateUserProfile } from '@/lib/auth/profile';

const { data, error } = await updateUserProfile('user-123', {
  name: 'New Name',
  city: 'San Francisco',
  state: 'California',
  pincode: '94102',
});
```

## OAuth Provider Mapping

| OAuth Provider | Database Value |
|---------------|----------------|
| Google        | `google`       |
| Apple         | `apple`        |
| Azure/Microsoft | `microsoft`  |

## Default Values for New Users

```typescript
{
  role: 'buyer',
  is_active: true,
  rating: 0.0,
  total_transactions: 0,
  listing_limit: -1,  // Unlimited
  books_sold: 0,
  books_bought: 0,
  trees_saved: 0.0,
  water_saved_liters: 0.0,
  co2_reduced_kg: 0.0,
}
```

## Error Handling

### Uniqueness Violation

```typescript
const { data, error } = await syncUserProfileServer(user);
if (error?.message.includes('OAuth provider already exists')) {
  // This OAuth account is already linked to another user
  console.error('Duplicate OAuth account');
}
```

### Profile Not Found

```typescript
const { data, error } = await getUserProfileById('user-123');
if (error?.message.includes('not found')) {
  // User profile doesn't exist
  console.error('Profile not found');
}
```

## UserProfile Type

```typescript
interface UserProfile {
  id: string;
  email: string;
  name: string;
  profile_picture?: string | null;
  oauth_provider: 'google' | 'apple' | 'microsoft';
  oauth_provider_id: string;
  role?: 'buyer' | 'seller' | 'admin';
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number;
  total_transactions?: number;
  is_active?: boolean;
  suspended_until?: string | null;
  listing_limit?: number;
  books_sold?: number;
  books_bought?: number;
  trees_saved?: number;
  water_saved_liters?: number;
  co2_reduced_kg?: number;
  created_at?: string;
  updated_at?: string;
}
```

## Verification

Run verification script:
```bash
npx tsx scripts/verify-profile-management.ts
```

## Documentation

Full documentation: `frontend/src/lib/auth/PROFILE_MANAGEMENT.md`

## Testing

Tests location: `frontend/src/lib/auth/__tests__/profile.test.ts`

## Database Constraint

```sql
CONSTRAINT unique_oauth_provider UNIQUE (oauth_provider, oauth_provider_id)
```

This ensures no two users can have the same OAuth provider credentials.

## RLS Policies

- Users can insert their own profile: `auth.uid() = id`
- Users can update their own profile: `auth.uid() = id`
- Users can view their own profile: `auth.uid() = id`
- Everyone can view public profiles: `true`

## Integration Points

### OAuth Callback Route

`frontend/src/app/auth/callback/route.ts` automatically syncs profiles after OAuth.

### Auth Module

All functions exported from `frontend/src/lib/auth/index.ts`.

## Requirements Satisfied

- ✅ **Requirement 1.4**: Find or create user account from OAuth profile
- ✅ **Requirement 1.5**: Ensure (oauth_provider, oauth_provider_id) uniqueness

## Quick Troubleshooting

### Profile sync fails with "OAuth provider already exists"
- Another user already has this OAuth account linked
- Check if user is trying to create a duplicate account

### Profile sync fails with "Failed to check existing user"
- Database connection issue
- Check Supabase credentials and RLS policies

### Profile picture not showing
- OAuth provider may not provide picture URL
- Falls back to null if not available

### Name shows as email prefix
- OAuth provider didn't provide full name
- System extracts name from email as fallback

## Next Steps

After Task 7.3:
- Task 7.4: Write property test for OAuth uniqueness
- Task 8: Implement session management
- Integration testing with real OAuth providers
