# Property-Based Tests

This directory contains property-based tests using `fast-check` to verify system properties hold for randomly generated inputs.

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up Test Database

You have two options for running tests:

#### Option A: Local Supabase (Recommended for Development)

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Start local Supabase instance:
```bash
cd .. # Go to project root
supabase start
```

3. The CLI will output connection details. Copy them to `backend/.env.test`:
```env
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=<service_role_key_from_output>
SUPABASE_ANON_KEY=<anon_key_from_output>
```

4. Apply migrations:
```bash
supabase db reset
```

#### Option B: Test Supabase Project

1. Create a separate Supabase project for testing at https://app.supabase.com

2. Copy the connection details to `backend/.env.test`:
```env
SUPABASE_URL=https://your-test-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
SUPABASE_ANON_KEY=<your_anon_key>
```

3. Apply migrations to the test database using the Supabase dashboard or CLI

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Property-Based Tests Only
```bash
npm run test:properties
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

## Test Structure

### Property Tests (`properties/`)

Property-based tests that verify system invariants hold for randomly generated inputs:

- `unique-id-assignment.test.ts` - **Validates: Requirements 20.1**
  - Verifies all database records receive unique UUIDs
  - Tests UUID format compliance (RFC 4122)
  - Verifies no ID collisions occur across tables
  - Tests concurrent insertion scenarios

## Writing New Property Tests

1. Create a new test file in `properties/` directory
2. Import `fast-check` and necessary dependencies
3. Use `fc.assert()` with `fc.asyncProperty()` for async tests
4. Include the requirement validation comment: `**Validates: Requirements X.Y**`
5. Clean up test data after each test run

Example:
```typescript
/**
 * Property-Based Test: Your Property Name
 * **Validates: Requirements X.Y**
 */

import * as fc from 'fast-check';

describe('Property: Your Property Name', () => {
  it('should verify the property', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(), // Your generators
        async (input) => {
          // Your test logic
          expect(result).toBe(expected);
        }
      ),
      {
        numRuns: 100,
        timeout: 30000,
      }
    );
  });
});
```

## Troubleshooting

### Connection Errors

If you see connection errors:
1. Verify `.env.test` has correct Supabase credentials
2. Check that Supabase instance is running (for local setup)
3. Verify migrations have been applied to the test database

### Timeout Errors

If tests timeout:
1. Increase `timeout` in test configuration
2. Reduce `numRuns` for faster execution during development
3. Check database performance and connection latency

### UUID Collision Errors

If UUID collision tests fail:
1. Verify the database is using `uuid_generate_v4()` for ID generation
2. Check that the `uuid-ossp` extension is enabled
3. Ensure migrations have been applied correctly
