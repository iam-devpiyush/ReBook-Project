# Testing Guide for Second-Hand Book Marketplace Backend

This guide explains how to set up and run tests for the backend, including property-based tests.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account (for integration tests) or Supabase CLI (for local testing)

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up Test Environment

#### Option A: Local Supabase (Recommended)

This option runs a complete Supabase stack locally using Docker.

1. **Install Supabase CLI**:
```bash
npm install -g supabase
```

2. **Initialize Supabase** (from project root):
```bash
cd ..
supabase init
```

3. **Start Local Supabase**:
```bash
supabase start
```

This will start:
- PostgreSQL database on `localhost:54322`
- Supabase API on `localhost:54321`
- Supabase Studio on `localhost:54323`

4. **Copy Connection Details**:

After `supabase start`, you'll see output like:
```
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
anon key: eyJh...
service_role key: eyJh...
```

5. **Create `.env.test` file** in the `backend` directory:
```env
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=<service_role_key_from_output>
SUPABASE_ANON_KEY=<anon_key_from_output>
```

6. **Apply Migrations**:
```bash
supabase db reset
```

This will apply all migrations from the `supabase/migrations` directory.

#### Option B: Remote Test Database

Use a separate Supabase project for testing.

1. **Create Test Project**:
   - Go to https://app.supabase.com
   - Create a new project (e.g., "book-marketplace-test")

2. **Get Connection Details**:
   - Go to Project Settings > API
   - Copy the URL and keys

3. **Create `.env.test` file** in the `backend` directory:
```env
SUPABASE_URL=https://your-test-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
SUPABASE_ANON_KEY=<your_anon_key>
```

4. **Apply Migrations**:
   - Use Supabase Dashboard > SQL Editor
   - Run each migration file from `supabase/migrations` in order

### 3. Run Tests

```bash
# Run all tests
npm test

# Run only property-based tests
npm run test:properties

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

```
backend/src/__tests__/
├── README.md                    # Test documentation
├── setup.ts                     # Jest setup configuration
└── properties/                  # Property-based tests
    └── unique-id-assignment.test.ts  # UUID uniqueness tests
```

## Property-Based Tests

Property-based tests use `fast-check` to verify that system properties hold for randomly generated inputs.

### Current Property Tests

#### 1. Unique ID Assignment (`unique-id-assignment.test.ts`)

**Validates: Requirements 20.1**

Tests that verify UUID uniqueness:

- **Single Table Uniqueness**: Verifies all records in a table receive unique UUIDs
- **Cross-Table Uniqueness**: Verifies UUIDs are unique across different tables
- **Concurrent Insertion**: Verifies no collisions occur during concurrent insertions

**Test Configuration**:
- Runs 100 test cases per property (single table)
- Runs 50 test cases for cross-table and concurrent tests
- 30-second timeout per test
- Automatic cleanup of test data

**What It Tests**:
1. UUID format compliance (RFC 4122)
2. No duplicate IDs within a single insertion batch
3. No duplicate IDs across multiple tables
4. No collisions during concurrent insertions

## Writing New Tests

### Unit Tests

Create test files next to the source files with `.test.ts` extension:

```typescript
// src/services/pricing.test.ts
import { calculateFinalPrice } from './pricing';

describe('PricingService', () => {
  it('should calculate final price correctly', () => {
    const result = calculateFinalPrice({
      originalPrice: 100,
      conditionScore: 5,
      deliveryCost: 50,
    });
    
    expect(result.finalPrice).toBeGreaterThan(0);
  });
});
```

### Property-Based Tests

Create test files in `__tests__/properties/` directory:

```typescript
/**
 * Property-Based Test: Your Property Name
 * **Validates: Requirements X.Y**
 */

import * as fc from 'fast-check';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('Property: Your Property Name', () => {
  it('should verify the property holds', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Define your generators
        fc.integer({ min: 1, max: 100 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        
        async (number, text) => {
          // Test setup
          const testId = `test_${Date.now()}_${Math.random()}`;
          
          try {
            // Your test logic here
            const { data, error } = await supabase
              .from('your_table')
              .insert({ /* ... */ })
              .select();
            
            // Assertions
            expect(error).toBeNull();
            expect(data).toBeDefined();
            
            // Cleanup
            await supabase
              .from('your_table')
              .delete()
              .eq('id', testId);
              
          } catch (error) {
            // Cleanup on error
            await supabase
              .from('your_table')
              .delete()
              .eq('id', testId);
            throw error;
          }
        }
      ),
      {
        numRuns: 100,      // Number of test cases
        timeout: 30000,    // Timeout in ms
      }
    );
  });
});
```

## Troubleshooting

### "Cannot connect to Supabase"

**Solution**:
1. Verify `.env.test` exists and has correct credentials
2. For local setup: Run `supabase status` to check if services are running
3. For remote setup: Check project status in Supabase dashboard
4. Verify network connectivity

### "Table does not exist"

**Solution**:
1. Verify migrations have been applied
2. For local setup: Run `supabase db reset`
3. For remote setup: Check migrations in Supabase dashboard
4. Verify you're connecting to the correct database

### "Tests timeout"

**Solution**:
1. Increase timeout in test configuration
2. Reduce `numRuns` for faster execution during development
3. Check database performance
4. Verify network latency to remote database

### "UUID collision detected"

This should never happen if the database is configured correctly.

**Solution**:
1. Verify `uuid-ossp` extension is enabled:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```
2. Check that tables use `uuid_generate_v4()` for default IDs
3. Verify migrations were applied correctly

### "Permission denied"

**Solution**:
1. Verify you're using the `service_role` key (not `anon` key) in tests
2. Check Row Level Security (RLS) policies
3. For local setup: Service role key bypasses RLS by default

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
      
      - name: Start Supabase
        run: supabase start
      
      - name: Install dependencies
        run: |
          cd backend
          npm install
      
      - name: Create .env.test
        run: |
          cd backend
          echo "SUPABASE_URL=http://localhost:54321" > .env.test
          echo "SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o env | grep SERVICE_ROLE_KEY | cut -d '=' -f2)" >> .env.test
          echo "SUPABASE_ANON_KEY=$(supabase status -o env | grep ANON_KEY | cut -d '=' -f2)" >> .env.test
      
      - name: Run tests
        run: |
          cd backend
          npm test
```

## Best Practices

1. **Always clean up test data**: Use try-finally blocks to ensure cleanup
2. **Use unique identifiers**: Prefix test data with timestamps and random strings
3. **Isolate tests**: Each test should be independent and not rely on others
4. **Use appropriate timeouts**: Property-based tests may need longer timeouts
5. **Mock external services**: Don't call real payment or shipping APIs in tests
6. **Test edge cases**: Use property-based tests to discover edge cases
7. **Keep tests fast**: Use local Supabase for faster test execution

## Resources

- [Jest Documentation](https://jestjs.io/)
- [fast-check Documentation](https://fast-check.dev/)
- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Property-Based Testing Guide](https://fast-check.dev/docs/introduction/)
