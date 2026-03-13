# Task 7.4: OAuth Uniqueness Property Test - Setup Guide

## What Was Implemented

A comprehensive property-based test that validates **Requirement 1.5**: The combination of `(oauth_provider, oauth_provider_id)` must be unique across all users.

### Test Coverage

The test includes three property tests:

1. **Uniqueness Enforcement** (100 test runs)
   - Verifies duplicate `(oauth_provider, oauth_provider_id)` combinations are rejected
   - Validates PostgreSQL error code `23505` is returned
   - Tests across all three providers: Google, Apple, Microsoft

2. **Cross-Provider Uniqueness Scope** (50 test runs)
   - Verifies the same `provider_id` can exist for different providers
   - Ensures uniqueness is scoped to the combination, not just `provider_id`

3. **Concurrent Insertion Handling** (30 test runs)
   - Verifies only one insertion succeeds when multiple concurrent attempts are made
   - Tests race condition handling with 2-5 concurrent insertions

## Files Created

1. **Test File:** `backend/src/__tests__/properties/oauth-uniqueness.test.ts`
   - 350+ lines of comprehensive property-based tests
   - Uses fast-check for property-based testing
   - Includes automatic cleanup and error handling

2. **Documentation:** `backend/src/__tests__/properties/README_OAUTH_UNIQUENESS.md`
   - Detailed explanation of each test
   - Setup instructions
   - Troubleshooting guide
   - CI/CD integration examples

## Prerequisites to Run the Test

### Option 1: Local Supabase (Recommended)

```bash
# 1. Install Supabase CLI globally
npm install -g supabase

# 2. Navigate to project root
cd /path/to/project

# 3. Start local Supabase
supabase start

# 4. Copy the output values:
#    - API URL (usually http://localhost:54321)
#    - service_role key (long JWT token starting with eyJh...)

# 5. Update backend/.env.test
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=<paste-service-role-key-here>

# 6. Apply database migrations
supabase db reset

# 7. Run the test
cd backend
npm test -- oauth-uniqueness.test.ts --runInBand
```

### Option 2: Remote Supabase

```bash
# 1. Create a Supabase project at https://app.supabase.com

# 2. Apply migrations:
#    - Go to SQL Editor in Supabase dashboard
#    - Copy content from supabase/migrations/20240101000000_initial_schema.sql
#    - Execute the SQL

# 3. Get credentials from Settings > API:
#    - Project URL
#    - service_role key (NOT anon key)

# 4. Update backend/.env.test
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# 5. Run the test
cd backend
npm test -- oauth-uniqueness.test.ts --runInBand
```

## Running the Test

### Run Only OAuth Uniqueness Test
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

## Expected Output (Success)

```
PASS  src/__tests__/properties/oauth-uniqueness.test.ts
  Property: OAuth Authentication Uniqueness
    ✓ should enforce uniqueness of (oauth_provider, oauth_provider_id) combination (2500ms)
    ✓ should allow same provider_id across different providers (1800ms)
    ✓ should handle concurrent duplicate OAuth insertions correctly (1200ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Snapshots:   0 total
Time:        5.5s
```

## Current Status

⚠️ **Test requires Supabase configuration to run**

The test file is complete and ready to run, but requires:
1. A running Supabase instance (local or remote)
2. Database schema applied (users table with unique constraint)
3. Environment variables configured in `backend/.env.test`

## What the Test Validates

### Database Constraint
```sql
CONSTRAINT unique_oauth_provider UNIQUE (oauth_provider, oauth_provider_id)
```

### Test Scenarios

1. **First user with OAuth combo** → ✅ Should succeed
2. **Second user with same OAuth combo** → ❌ Should fail with error 23505
3. **Same provider_id, different provider** → ✅ Should succeed (3 users)
4. **Concurrent duplicate insertions** → ✅ Only 1 succeeds, others fail

## Troubleshooting

### Error: "fetch failed" or "ECONNREFUSED"
**Solution:** Supabase is not running. Start it with `supabase start`

### Error: "relation 'users' does not exist"
**Solution:** Apply database migrations with `supabase db reset`

### Error: "permission denied"
**Solution:** Use service_role key, not anon key in `.env.test`

### Test Timeout
**Solution:** 
- Use local Supabase for faster tests
- Or reduce `numRuns` in the test file

## Next Steps

1. **Configure Supabase:**
   - Follow Option 1 (Local) or Option 2 (Remote) above
   - Update `backend/.env.test` with credentials

2. **Run the Test:**
   ```bash
   cd backend
   npm test -- oauth-uniqueness.test.ts --runInBand
   ```

3. **Verify Success:**
   - All 3 tests should pass
   - Total test runs: 180 (100 + 50 + 30)
   - Expected time: 5-10 seconds

4. **Update PBT Status:**
   - If tests pass: Mark as passed
   - If tests fail: Review the counterexample and fix the constraint

## Integration with Existing Code

This test validates the database constraint that is used by:

- `frontend/src/lib/auth/profile.ts` - `syncUserProfileServer()` and `syncUserProfileClient()`
- Both functions check for error code `23505` when creating users
- The constraint ensures no duplicate OAuth accounts can be created

## Test Quality

- ✅ Uses property-based testing (fast-check)
- ✅ Generates random test data automatically
- ✅ Tests all three OAuth providers
- ✅ Tests concurrent scenarios
- ✅ Includes automatic cleanup
- ✅ Comprehensive error handling
- ✅ Well-documented with README

## References

- **Requirements:** `.kiro/specs/second-hand-book-marketplace/requirements.md` (1.5)
- **Design:** `.kiro/specs/second-hand-book-marketplace/design.md` (Property 1)
- **Schema:** `supabase/migrations/20240101000000_initial_schema.sql`
- **Profile Code:** `frontend/src/lib/auth/profile.ts`
