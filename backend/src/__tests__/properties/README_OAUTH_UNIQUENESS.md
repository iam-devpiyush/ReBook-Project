# OAuth Authentication Uniqueness Property Test

## Overview

This property-based test validates **Requirement 1.5**: The combination of `(oauth_provider, oauth_provider_id)` must be unique across all users in the database.

## Test File

`oauth-uniqueness.test.ts`

## What It Tests

### Property 1: Uniqueness Enforcement
**Test:** `should enforce uniqueness of (oauth_provider, oauth_provider_id) combination`

Verifies that:
1. A user can be created with a specific `(oauth_provider, oauth_provider_id)` combination
2. Attempting to create another user with the same combination fails with PostgreSQL error code `23505` (unique constraint violation)
3. The uniqueness constraint is enforced across all three providers (Google, Apple, Microsoft)

**Test Strategy:**
- Generates 100 random combinations of provider, provider_id, emails, and names
- Creates first user with the combination (should succeed)
- Attempts to create second user with same `(oauth_provider, oauth_provider_id)` but different email (should fail)
- Validates error code is `23505` and error message mentions the unique constraint

### Property 2: Cross-Provider Uniqueness Scope
**Test:** `should allow same provider_id across different providers`

Verifies that:
- The uniqueness constraint is scoped to the combination, not just `provider_id` alone
- The same `provider_id` can exist for different providers (Google, Apple, Microsoft)
- Three users with the same `provider_id` but different providers can coexist

**Test Strategy:**
- Generates 50 random provider_id values
- Creates three users with the same `provider_id` but different providers (Google, Apple, Microsoft)
- All three insertions should succeed
- Validates all three users exist in the database

### Property 3: Concurrent Insertion Handling
**Test:** `should handle concurrent duplicate OAuth insertions correctly`

Verifies that:
- When multiple insertions with the same `(oauth_provider, oauth_provider_id)` are attempted concurrently
- Only one insertion succeeds
- All other insertions fail with error code `23505`

**Test Strategy:**
- Generates 30 random scenarios with 2-5 concurrent insertions
- Executes all insertions concurrently using `Promise.allSettled`
- Validates exactly one insertion succeeds
- Validates all other insertions fail with uniqueness violation

## Database Schema

The test validates the following database constraint:

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  oauth_provider TEXT NOT NULL CHECK (oauth_provider IN ('google', 'apple', 'microsoft')),
  oauth_provider_id TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  -- ... other fields ...
  
  CONSTRAINT unique_oauth_provider UNIQUE (oauth_provider, oauth_provider_id)
);
```

## Prerequisites

### 1. Supabase Instance
You need a running Supabase instance (local or remote) with the database schema applied.

**Option A: Local Supabase (Recommended for Testing)**
```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
supabase start

# The CLI will output:
# - API URL: http://localhost:54321
# - Service Role Key: eyJh... (long JWT token)
```

**Option B: Remote Supabase**
1. Create a project at https://app.supabase.com
2. Apply the database migrations from `supabase/migrations/`
3. Get your project URL and service role key from Settings > API

### 2. Environment Configuration

Update `backend/.env.test` with your Supabase credentials:

```env
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key
```

**Important:** Use the **service role key**, not the anon key, as the test needs to bypass RLS policies for testing.

### 3. Database Schema

Ensure the `users` table exists with the `unique_oauth_provider` constraint:

```bash
# If using local Supabase
cd supabase
supabase db reset

# If using remote Supabase
# Apply migrations via Supabase dashboard or CLI
```

## Running the Test

### Run Only This Test
```bash
cd backend
npm test -- oauth-uniqueness.test.ts --runInBand
```

### Run All Property Tests
```bash
cd backend
npm run test:properties
```

### Run with Verbose Output
```bash
cd backend
npm test -- oauth-uniqueness.test.ts --runInBand --verbose
```

## Expected Output

### Success
```
PASS  src/__tests__/properties/oauth-uniqueness.test.ts
  Property: OAuth Authentication Uniqueness
    ✓ should enforce uniqueness of (oauth_provider, oauth_provider_id) combination (2500ms)
    ✓ should allow same provider_id across different providers (1800ms)
    ✓ should handle concurrent duplicate OAuth insertions correctly (1200ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

### Failure (If Constraint Not Enforced)
If the database constraint is missing or not working, the test will fail with:

```
Property failed after X tests
Counterexample: [{"provider":"google","providerId":"abc123",...}]

expect(error2).not.toBeNull()
Expected: not null
Received: null
```

This indicates the second insertion succeeded when it should have failed.

## Test Configuration

- **Framework:** Jest + fast-check
- **Test Runs:** 
  - Property 1: 100 runs
  - Property 2: 50 runs
  - Property 3: 30 runs
- **Timeout:** 30 seconds per test
- **Execution:** Sequential (`--runInBand`) to avoid database conflicts

## Cleanup

The test automatically cleans up all test data:
- Uses unique prefixes for all test records
- Deletes test records after each test case
- Includes cleanup in error handlers

## Troubleshooting

### Error: "fetch failed" or "ECONNREFUSED"
**Cause:** Supabase is not running or URL is incorrect

**Solution:**
1. Check Supabase is running: `curl http://localhost:54321`
2. Verify `SUPABASE_URL` in `.env.test`
3. If using local Supabase, run `supabase start`

### Error: "relation 'users' does not exist"
**Cause:** Database schema not applied

**Solution:**
```bash
cd supabase
supabase db reset
```

### Error: "permission denied" or "RLS policy violation"
**Cause:** Using anon key instead of service role key

**Solution:**
Update `.env.test` with the **service role key** (starts with `eyJh...`)

### Test Timeout
**Cause:** Slow database connection or too many test runs

**Solution:**
1. Reduce `numRuns` in the test file
2. Increase timeout in `jest.config.js`
3. Use local Supabase for faster tests

## Integration with CI/CD

To run this test in CI/CD:

1. **Use Supabase CLI in CI:**
```yaml
# .github/workflows/test.yml
- name: Setup Supabase
  run: |
    npm install -g supabase
    supabase start
    
- name: Run Property Tests
  run: npm run test:properties
  working-directory: backend
```

2. **Or use a test database:**
```yaml
- name: Run Property Tests
  env:
    SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SUPABASE_KEY }}
  run: npm run test:properties
  working-directory: backend
```

## Related Files

- Database Schema: `supabase/migrations/20240101000000_initial_schema.sql`
- Requirements: `.kiro/specs/second-hand-book-marketplace/requirements.md` (Requirement 1.5)
- Design: `.kiro/specs/second-hand-book-marketplace/design.md` (Property 1)
- Profile Management: `frontend/src/lib/auth/profile.ts`

## Notes

- This test validates the **database constraint**, not the application logic
- The constraint is enforced at the PostgreSQL level, ensuring data integrity
- The test uses property-based testing to generate diverse test cases automatically
- Each test run generates different random inputs, increasing test coverage over time
