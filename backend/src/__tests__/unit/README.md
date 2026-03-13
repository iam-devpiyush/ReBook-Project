# Unit Tests

This directory contains unit tests for the Second-Hand Book Marketplace backend.

## Test Files

### auth-configuration.test.ts (Task 3.2)

**Purpose**: Tests OAuth configuration, session token validation, and auth state management.

**Requirements Validated**: 1.1-1.9

**Test Coverage**:

#### OAuth Redirect URLs
- ✓ Validates correct callback URL format (`{SUPABASE_URL}/auth/v1/callback`)
- ✓ Verifies Supabase URL format (HTTPS for production, HTTP allowed for localhost)
- ✓ Tests multiple OAuth provider redirect URLs (Google, Apple, Microsoft/Azure)

#### Session Token Validation
- ✓ Validates session token structure (access_token, refresh_token, expires_at, user)
- ✓ Rejects invalid session tokens
- ✓ Handles expired session tokens correctly
- ✓ Validates JWT token format (3 parts: header.payload.signature)

#### Auth State Management
- ✓ Initializes auth state correctly
- ✓ Handles auth state changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.)
- ✓ Supports OAuth provider configuration (Google, Apple, Azure/Microsoft)
- ✓ Handles sign out correctly
- ✓ Validates OAuth provider uniqueness constraint
- ✓ Handles session refresh
- ✓ Validates user profile structure after OAuth
- ✓ Enforces session expiration time (7 days)

#### Environment Configuration
- ✓ Verifies required environment variables are set
- ✓ Validates Supabase credentials format

## Running Tests

### Run all unit tests
```bash
npm test
```

### Run only auth configuration tests
```bash
npm test -- auth-configuration.test.ts
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

## Test Environment Setup

Tests require a `.env.test` file in the `backend` directory with the following variables:

```env
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

For local development, use Supabase CLI:

```bash
# Start local Supabase
supabase start

# Copy the connection details to .env.test
```

## Test Design Principles

1. **Environment Agnostic**: Tests work with both local (HTTP) and production (HTTPS) Supabase instances
2. **No Side Effects**: Tests don't modify database state or create real OAuth sessions
3. **Graceful Handling**: Tests handle missing sessions and authentication gracefully
4. **Comprehensive Coverage**: Tests cover all aspects of auth configuration per requirements 1.1-1.9

## Notes

- These tests verify the **configuration** of OAuth, not the actual OAuth flow (which requires browser interaction)
- Session-dependent tests gracefully handle cases where no active session exists
- JWT validation tests work with both real JWT tokens and test placeholder values
- All tests pass in both local development and CI/CD environments
