# User Profile Management

This module handles syncing OAuth profile data to the users table in Supabase, ensuring uniqueness of (oauth_provider, oauth_provider_id), and managing both first-time sign-in (create) and returning users (update).

## Overview

When a user signs in via OAuth (Google, Apple, or Microsoft), their profile information needs to be synced to the `users` table in the database. This module provides functions to:

1. **Create user profiles** on first sign-in
2. **Update user profiles** on subsequent sign-ins
3. **Ensure uniqueness** of (oauth_provider, oauth_provider_id) combinations
4. **Extract profile data** from various OAuth providers

## Key Features

### OAuth Provider Support

- **Google OAuth**: Maps to `google` provider
- **Apple OAuth**: Maps to `apple` provider
- **Microsoft OAuth**: Maps `azure` provider to `microsoft`

### Profile Data Extraction

The module intelligently extracts profile data from different OAuth providers:

- **Email**: Always required from OAuth profile
- **Name**: Extracted from `full_name`, `name`, `display_name`, or email prefix
- **Profile Picture**: Extracted from `avatar_url`, `picture`, or `photo`
- **Provider ID**: Extracted from `provider_id`, `sub`, or user ID

### Uniqueness Enforcement

The database schema enforces uniqueness on the combination of:
```sql
CONSTRAINT unique_oauth_provider UNIQUE (oauth_provider, oauth_provider_id)
```

This prevents:
- Multiple accounts with the same OAuth provider credentials
- Account hijacking or duplication
- Data integrity issues

## Functions

### `syncUserProfileServer(user: User)`

**Server-side** function to sync OAuth profile to users table.

**Usage in API routes or server components:**
```typescript
import { syncUserProfileServer } from '@/lib/auth/profile';

const { data: { user } } = await supabase.auth.getUser();
if (user) {
  const { data, error } = await syncUserProfileServer(user);
  if (error) {
    console.error('Profile sync failed:', error);
  }
}
```

**Behavior:**
- Checks if user exists in database by ID
- If exists: Updates profile with latest OAuth data
- If not exists: Creates new user profile with default values
- Returns user profile data or error

### `syncUserProfileClient(user: User)`

**Client-side** function to sync OAuth profile to users table.

**Usage in client components:**
```typescript
import { syncUserProfileClient } from '@/lib/auth/profile';

const { data: { user } } = await supabase.auth.getUser();
if (user) {
  const { data, error } = await syncUserProfileClient(user);
  if (error) {
    console.error('Profile sync failed:', error);
  }
}
```

**Behavior:**
- Same as server-side function but uses client Supabase instance
- Suitable for client-side profile updates

### `getUserProfileById(userId: string)`

Fetch user profile by ID.

**Usage:**
```typescript
import { getUserProfileById } from '@/lib/auth/profile';

const { data, error } = await getUserProfileById('user-123');
if (data) {
  console.log('User profile:', data);
}
```

### `updateUserProfile(userId: string, updates: Partial<UserProfile>)`

Update user profile fields.

**Usage:**
```typescript
import { updateUserProfile } from '@/lib/auth/profile';

const { data, error } = await updateUserProfile('user-123', {
  name: 'New Name',
  city: 'San Francisco',
  state: 'California',
});
```

## Default Values for New Users

When creating a new user profile, the following defaults are set:

```typescript
{
  role: 'buyer',              // Default role
  is_active: true,            // Active by default
  rating: 0.0,                // No rating yet
  total_transactions: 0,      // No transactions yet
  listing_limit: -1,          // Unlimited listings
  books_sold: 0,              // No books sold yet
  books_bought: 0,            // No books bought yet
  trees_saved: 0.0,           // No environmental impact yet
  water_saved_liters: 0.0,
  co2_reduced_kg: 0.0,
}
```

## Error Handling

### Uniqueness Violation (23505)

If a user tries to sign in with OAuth credentials that are already linked to another account:

```typescript
const { data, error } = await syncUserProfileServer(user);
if (error?.message.includes('OAuth provider already exists')) {
  // Handle duplicate OAuth account
  console.error('This OAuth account is already linked to another user');
}
```

### Profile Not Found (PGRST116)

This error is expected when checking for existing users and is handled internally:

```typescript
// Internal handling - not exposed to caller
if (fetchError && fetchError.code !== 'PGRST116') {
  throw new Error(`Failed to check existing user: ${fetchError.message}`);
}
```

## Integration with OAuth Callback

The profile sync is automatically called in the OAuth callback route:

```typescript
// frontend/src/app/auth/callback/route.ts
import { syncUserProfileServer } from '@/lib/auth/profile';

export async function GET(request: NextRequest) {
  // ... OAuth code exchange ...
  
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { error } = await syncUserProfileServer(user);
    if (error) {
      console.error('Profile sync error:', error);
      // Continue anyway - user is authenticated
    }
  }
  
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
}
```

## Database Schema

The users table schema (from `supabase/migrations/20240101000000_initial_schema.sql`):

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  oauth_provider TEXT NOT NULL CHECK (oauth_provider IN ('google', 'apple', 'microsoft')),
  oauth_provider_id TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  profile_picture TEXT,
  role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'admin')),
  -- ... other fields ...
  CONSTRAINT unique_oauth_provider UNIQUE (oauth_provider, oauth_provider_id)
);
```

## Row Level Security (RLS)

The users table has RLS policies that control access:

- **Users can view their own profile**: `auth.uid() = id`
- **Users can view public profiles**: All users can see basic profile info
- **Users can update their own profile**: `auth.uid() = id`
- **Users can insert their own profile**: `auth.uid() = id`
- **Admins can update user admin controls**: Only admins can modify roles, suspension, etc.

## Testing

Unit tests are provided in `__tests__/profile.test.ts`:

- ✅ Create new user profile on first sign-in
- ✅ Update existing user profile on subsequent sign-in
- ✅ Handle OAuth provider uniqueness violation
- ✅ Extract name from email if no name provided
- ✅ Map Azure provider to Microsoft
- ✅ Handle Apple OAuth provider
- ✅ Set default values for new users
- ✅ Enforce unique (oauth_provider, oauth_provider_id) constraint

## Requirements Validation

This implementation satisfies the following requirements:

### Requirement 1.4: Find or Create User Account
✅ When a verified OAuth profile is received, the system finds or creates a user account in the users table

### Requirement 1.5: OAuth Uniqueness
✅ When a user account is created from OAuth, the system ensures the combination of (oauth_provider, oauth_provider_id) is unique

## Example Usage Scenarios

### Scenario 1: First-Time Google Sign-In

```typescript
// User signs in with Google for the first time
const user = {
  id: 'new-user-123',
  email: 'john@gmail.com',
  app_metadata: { provider: 'google' },
  user_metadata: {
    full_name: 'John Doe',
    avatar_url: 'https://lh3.googleusercontent.com/...',
    provider_id: 'google-12345',
  },
};

const { data, error } = await syncUserProfileServer(user);
// Result: New user profile created with default values
```

### Scenario 2: Returning User Sign-In

```typescript
// User signs in again with updated profile
const user = {
  id: 'existing-user-123',
  email: 'john.doe@gmail.com', // Email changed
  app_metadata: { provider: 'google' },
  user_metadata: {
    full_name: 'John M. Doe', // Name updated
    avatar_url: 'https://lh3.googleusercontent.com/new-avatar',
    provider_id: 'google-12345',
  },
};

const { data, error } = await syncUserProfileServer(user);
// Result: Existing profile updated with new email and name
```

### Scenario 3: Duplicate OAuth Account

```typescript
// Another user tries to sign in with same Google account
const user = {
  id: 'different-user-456',
  email: 'john@gmail.com',
  app_metadata: { provider: 'google' },
  user_metadata: {
    provider_id: 'google-12345', // Same provider ID
  },
};

const { data, error } = await syncUserProfileServer(user);
// Result: Error - "User with this OAuth provider already exists"
```

## Security Considerations

1. **OAuth Provider Verification**: The system trusts OAuth providers to verify user identity
2. **Unique Constraints**: Database enforces uniqueness at the schema level
3. **RLS Policies**: Row-level security prevents unauthorized access
4. **Session Management**: Supabase handles secure session tokens
5. **Profile Updates**: Only authenticated users can update their own profiles

## Future Enhancements

Potential improvements for future iterations:

- [ ] Support for linking multiple OAuth providers to one account
- [ ] Profile merge functionality for duplicate accounts
- [ ] OAuth provider unlinking
- [ ] Profile verification status
- [ ] Email verification for OAuth accounts
- [ ] Profile completeness scoring
- [ ] Automatic profile picture optimization
