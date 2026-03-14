# Integration Tests for /api/auth/me

## Overview

This document describes integration tests for the `/api/auth/me` endpoint that returns the current authenticated user's profile.

## Requirements Validation

**User profile access requirement**
- ✅ Returns current authenticated user from Supabase
- ✅ Includes user profile data (name, email, role, location)
- ✅ Includes eco_impact metrics (books sold/bought, environmental impact)
- ✅ Returns 401 for unauthenticated requests
- ✅ Returns 404 when user profile not found

## Test Scenarios

### 1. Authenticated User Profile Retrieval

**Setup:**
1. Create a test user via Supabase Auth
2. Create corresponding profile in public.users table
3. Obtain valid session token

**Test:**
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Cookie: sb-access-token=<valid-token>"
```

**Expected Response (200 OK):**
```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "test@example.com",
    "name": "Test User",
    "profile_picture": "https://example.com/avatar.jpg",
    "role": "seller",
    "oauth_provider": "google",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "latitude": 19.0760,
    "longitude": 72.8777,
    "rating": 4.5,
    "total_transactions": 10,
    "is_active": true,
    "suspended_until": null,
    "listing_limit": -1,
    "eco_impact": {
      "books_sold": 5,
      "books_bought": 3,
      "trees_saved": 0.27,
      "water_saved_liters": 400.0,
      "co2_reduced_kg": 20.0
    },
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T00:00:00Z"
  }
}
```

### 2. Unauthenticated Request

**Test:**
```bash
curl -X GET http://localhost:3001/api/auth/me
```

**Expected Response (401 Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "You must be logged in to access this resource"
}
```

### 3. Invalid Session Token

**Test:**
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Cookie: sb-access-token=invalid-token"
```

**Expected Response (401 Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "You must be logged in to access this resource"
}
```

### 4. User Profile Not Found

**Setup:**
1. Create a test user via Supabase Auth
2. Do NOT create corresponding profile in public.users table
3. Obtain valid session token

**Test:**
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Cookie: sb-access-token=<valid-token-without-profile>"
```

**Expected Response (404 Not Found):**
```json
{
  "error": "Not Found",
  "message": "User profile not found"
}
```

### 5. Eco Impact Metrics Validation

**Setup:**
1. Create user with specific eco_impact values
2. Authenticate and get session token

**Test:**
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Cookie: sb-access-token=<valid-token>"
```

**Validation:**
- Verify `eco_impact.books_sold` matches database value
- Verify `eco_impact.books_bought` matches database value
- Verify `eco_impact.trees_saved` matches database value
- Verify `eco_impact.water_saved_liters` matches database value
- Verify `eco_impact.co2_reduced_kg` matches database value

### 6. Different User Roles

**Test each role:**
- Buyer role
- Seller role
- Admin role

**Expected:**
- Each role should return correctly in the response
- All profile data should be accessible regardless of role

### 7. Suspended User

**Setup:**
1. Create user and set `suspended_until` to future date
2. Authenticate and get session token

**Test:**
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Cookie: sb-access-token=<valid-token>"
```

**Expected:**
- Should still return user profile (200 OK)
- `suspended_until` field should contain the suspension timestamp
- `is_active` might be false

### 8. User with Listing Limit

**Setup:**
1. Create user with `listing_limit` set to specific value (e.g., 10)
2. Authenticate and get session token

**Test:**
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Cookie: sb-access-token=<valid-token>"
```

**Expected:**
- `listing_limit` should match the database value
- Value of -1 indicates unlimited listings

## Running Integration Tests

### Prerequisites
1. Supabase instance running
2. Database migrations applied
3. Next.js dev server running on port 3001

### Manual Testing Steps

1. **Start the development server:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Authenticate a test user:**
   - Visit http://localhost:3001/auth/signin
   - Sign in with OAuth provider
   - Copy session cookie from browser DevTools

3. **Test the endpoint:**
   ```bash
   # Replace <session-cookie> with actual cookie value
   curl -X GET http://localhost:3001/api/auth/me \
     -H "Cookie: <session-cookie>" \
     -v
   ```

4. **Verify response:**
   - Check status code is 200
   - Verify user data matches database
   - Confirm eco_impact is properly nested

### Automated Testing

Create a test script:

```typescript
// scripts/test-auth-me.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testAuthMe() {
  // Sign in test user
  const { data: { session }, error } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'test-password',
  });
  
  if (error || !session) {
    console.error('Failed to authenticate:', error);
    return;
  }
  
  // Call /api/auth/me
  const response = await fetch('http://localhost:3001/api/auth/me', {
    headers: {
      'Cookie': `sb-access-token=${session.access_token}`,
    },
  });
  
  const data = await response.json();
  
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));
  
  // Validate response
  if (response.status === 200 && data.user) {
    console.log('✅ Test passed: User profile retrieved successfully');
    console.log('✅ Eco impact included:', !!data.user.eco_impact);
  } else {
    console.log('❌ Test failed');
  }
}

testAuthMe();
```

Run with:
```bash
tsx scripts/test-auth-me.ts
```

## Common Issues

### Issue: 401 Unauthorized with valid token
**Cause:** Cookie not being sent correctly
**Solution:** Ensure cookie name matches Supabase configuration

### Issue: 404 User profile not found
**Cause:** User exists in auth.users but not in public.users
**Solution:** Ensure profile creation happens during OAuth callback

### Issue: Missing eco_impact data
**Cause:** Database columns not populated
**Solution:** Check default values in migration and ensure they're applied

## Performance Considerations

- Response time should be < 100ms for authenticated requests
- Database query should use index on users.id (primary key)
- Consider caching user profile data for frequently accessed users

## Security Considerations

- ✅ Session token validated via Supabase Auth
- ✅ Only returns data for authenticated user (no user ID in URL)
- ✅ Sensitive data (oauth_provider_id) not exposed
- ✅ Error messages don't leak sensitive information
