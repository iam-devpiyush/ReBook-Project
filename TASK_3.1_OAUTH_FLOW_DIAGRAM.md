# OAuth Flow Diagram - Task 3.1

## Overview

This document provides visual representations of the OAuth authentication flow for the Second-Hand Book Marketplace.

---

## High-Level OAuth Flow

```
┌─────────────┐
│    User     │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. Click "Sign in with Google/Apple/Microsoft"
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│              Your Next.js Application                   │
│                (localhost:3000)                         │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 2. Redirect to Supabase Auth
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│              Supabase Auth Service                      │
│        (your-project.supabase.co/auth)                  │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 3. Redirect to OAuth Provider
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│         OAuth Provider (Google/Apple/Microsoft)         │
│              (accounts.google.com, etc.)                │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 4. User grants permission
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│              Supabase Auth Service                      │
│         (receives authorization code)                   │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 5. Exchange code for tokens
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│         OAuth Provider (Google/Apple/Microsoft)         │
│           (returns access token + ID token)             │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 6. Verify tokens & create/find user
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│              Supabase PostgreSQL                        │
│            (users table with OAuth data)                │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 7. Generate session token (JWT)
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│              Your Next.js Application                   │
│         (receives session + user data)                  │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 8. Store session in cookie
       │
       ▼
┌─────────────┐
│    User     │
│ (Logged In) │
└─────────────┘
```

---

## Detailed Configuration Flow

### Google OAuth Configuration

```
┌──────────────────────────────────────────────────────────┐
│              Google Cloud Console                        │
│         (console.cloud.google.com)                       │
└──────┬───────────────────────────────────────────────────┘
       │
       │ 1. Create Project
       │    └─> "second-hand-book-marketplace"
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│           Configure OAuth Consent Screen                 │
│  ┌────────────────────────────────────────────────┐     │
│  │ App Name: Second-Hand Book Marketplace         │     │
│  │ Scopes: email, profile, openid                 │     │
│  │ User Type: External                            │     │
│  └────────────────────────────────────────────────┘     │
└──────┬───────────────────────────────────────────────────┘
       │
       │ 2. Create OAuth Client ID
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│              OAuth Credentials                           │
│  ┌────────────────────────────────────────────────┐     │
│  │ Type: Web Application                          │     │
│  │ Authorized Origins:                            │     │
│  │   - https://xxx.supabase.co                    │     │
│  │   - http://localhost:3000                      │     │
│  │ Redirect URIs:                                 │     │
│  │   - https://xxx.supabase.co/auth/v1/callback   │     │
│  │   - http://localhost:3000/auth/callback        │     │
│  └────────────────────────────────────────────────┘     │
└──────┬───────────────────────────────────────────────────┘
       │
       │ 3. Copy Credentials
       │    ├─> Client ID
       │    └─> Client Secret
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│              Supabase Dashboard                          │
│         Authentication → Providers → Google              │
│  ┌────────────────────────────────────────────────┐     │
│  │ Enable: ✓ ON                                   │     │
│  │ Client ID: [paste]                             │     │
│  │ Client Secret: [paste]                         │     │
│  └────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

### Apple OAuth Configuration

```
┌──────────────────────────────────────────────────────────┐
│           Apple Developer Portal                         │
│         (developer.apple.com/account)                    │
└──────┬───────────────────────────────────────────────────┘
       │
       │ 1. Create App ID
       │    └─> Enable "Sign in with Apple"
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│              Create Services ID                          │
│  ┌────────────────────────────────────────────────┐     │
│  │ Identifier: com.yourcompany.bookmarketplace.web│     │
│  │ Domains: xxx.supabase.co, localhost            │     │
│  │ Return URLs:                                   │     │
│  │   - https://xxx.supabase.co/auth/v1/callback   │     │
│  │   - http://localhost:3000/auth/callback        │     │
│  └────────────────────────────────────────────────┘     │
└──────┬───────────────────────────────────────────────────┘
       │
       │ 2. Create Private Key
       │    └─> Download .p8 file
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│              Copy Credentials                            │
│  ┌────────────────────────────────────────────────┐     │
│  │ Services ID: com.yourcompany.bookmarketplace...│     │
│  │ Team ID: XXXXXXXXXX                            │     │
│  │ Key ID: YYYYYYYYYY                             │     │
│  │ Private Key: [contents of .p8 file]           │     │
│  └────────────────────────────────────────────────┘     │
└──────┬───────────────────────────────────────────────────┘
       │
       │ 3. Configure in Supabase
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│              Supabase Dashboard                          │
│         Authentication → Providers → Apple               │
│  ┌────────────────────────────────────────────────┐     │
│  │ Enable: ✓ ON                                   │     │
│  │ Services ID: [paste]                           │     │
│  │ Team ID: [paste]                               │     │
│  │ Key ID: [paste]                                │     │
│  │ Private Key: [paste .p8 contents]             │     │
│  └────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

### Microsoft OAuth Configuration

```
┌──────────────────────────────────────────────────────────┐
│              Azure Portal                                │
│         (portal.azure.com)                               │
└──────┬───────────────────────────────────────────────────┘
       │
       │ 1. Register Application
       │    └─> Azure Active Directory → App registrations
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│              Configure Application                       │
│  ┌────────────────────────────────────────────────┐     │
│  │ Name: Second-Hand Book Marketplace             │     │
│  │ Account Types: Personal + Work accounts        │     │
│  │ Redirect URI:                                  │     │
│  │   - https://xxx.supabase.co/auth/v1/callback   │     │
│  │   - http://localhost:3000/auth/callback        │     │
│  └────────────────────────────────────────────────┘     │
└──────┬───────────────────────────────────────────────────┘
       │
       │ 2. Create Client Secret
       │    └─> Certificates & secrets
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│              Configure API Permissions                   │
│  ┌────────────────────────────────────────────────┐     │
│  │ Microsoft Graph - Delegated:                   │     │
│  │   ✓ openid                                     │     │
│  │   ✓ profile                                    │     │
│  │   ✓ email                                      │     │
│  │   ✓ User.Read                                  │     │
│  └────────────────────────────────────────────────┘     │
└──────┬───────────────────────────────────────────────────┘
       │
       │ 3. Copy Credentials
       │    ├─> Application (Client) ID
       │    ├─> Directory (Tenant) ID
       │    └─> Client Secret
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│              Supabase Dashboard                          │
│         Authentication → Providers → Azure               │
│  ┌────────────────────────────────────────────────┐     │
│  │ Enable: ✓ ON                                   │     │
│  │ Client ID: [paste]                             │     │
│  │ Client Secret: [paste]                         │     │
│  │ Tenant ID: [paste]                             │     │
│  │ Azure Tenant: common                           │     │
│  └────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

---

## Redirect URL Flow

### Understanding Redirect URLs

```
User clicks "Sign in with Google"
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ Your App: http://localhost:3000                         │
│ Initiates OAuth flow                                    │
└──────┬──────────────────────────────────────────────────┘
       │
       │ Redirect to:
       │ https://your-project.supabase.co/auth/v1/authorize?
       │   provider=google
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Supabase Auth                                           │
│ Redirects to OAuth provider                             │
└──────┬──────────────────────────────────────────────────┘
       │
       │ Redirect to:
       │ https://accounts.google.com/o/oauth2/v2/auth?
       │   client_id=xxx
       │   redirect_uri=https://your-project.supabase.co/auth/v1/callback
       │   scope=email+profile+openid
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Google OAuth (User grants permission)                   │
└──────┬──────────────────────────────────────────────────┘
       │
       │ Redirect back with code:
       │ https://your-project.supabase.co/auth/v1/callback?
       │   code=AUTHORIZATION_CODE
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Supabase Auth                                           │
│ Exchanges code for tokens                               │
│ Creates/finds user                                      │
│ Generates session                                       │
└──────┬──────────────────────────────────────────────────┘
       │
       │ Redirect to your app:
       │ http://localhost:3000/auth/callback?
       │   access_token=xxx
       │   refresh_token=yyy
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Your App: http://localhost:3000/auth/callback           │
│ Stores session in cookie                                │
│ Redirects to dashboard                                  │
└─────────────────────────────────────────────────────────┘
```

---

## Critical URLs to Configure

### For Each OAuth Provider

You must configure these **exact URLs** in each provider's console:

#### Development (localhost)

```
Authorized Origins:
  http://localhost:3000

Redirect URIs:
  https://YOUR-PROJECT.supabase.co/auth/v1/callback
  http://localhost:3000/auth/callback
```

#### Production (when deploying)

```
Authorized Origins:
  https://your-production-domain.com

Redirect URIs:
  https://YOUR-PROJECT.supabase.co/auth/v1/callback
  https://your-production-domain.com/auth/callback
```

### Common Mistakes

❌ **Wrong**: `http://localhost:3000/` (trailing slash)  
✅ **Correct**: `http://localhost:3000`

❌ **Wrong**: `https://YOUR-PROJECT.supabase.co/auth/callback` (missing /v1/)  
✅ **Correct**: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`

❌ **Wrong**: Mixed http/https  
✅ **Correct**: Use https for Supabase, http for localhost

---

## Data Flow: User Creation

```
OAuth Provider Returns:
┌────────────────────────────────────┐
│ ID Token (JWT)                     │
│ ├─ sub: "google-oauth2|123456"     │
│ ├─ email: "user@example.com"       │
│ ├─ name: "John Doe"                │
│ ├─ picture: "https://..."          │
│ └─ email_verified: true            │
└────────┬───────────────────────────┘
         │
         │ Supabase verifies token
         │
         ▼
┌────────────────────────────────────┐
│ Supabase Auth                      │
│ Checks if user exists:             │
│ SELECT * FROM auth.users           │
│ WHERE email = 'user@example.com'   │
└────────┬───────────────────────────┘
         │
         ├─ User exists? → Update last_sign_in
         │
         └─ New user? → Create record
                        │
                        ▼
         ┌────────────────────────────────────┐
         │ Create in auth.users:              │
         │ ├─ id: UUID                        │
         │ ├─ email: "user@example.com"       │
         │ ├─ provider: "google"              │
         │ ├─ user_metadata: {                │
         │ │    name: "John Doe",             │
         │ │    picture: "https://..."        │
         │ │  }                               │
         │ └─ created_at: NOW()               │
         └────────┬───────────────────────────┘
                  │
                  │ Trigger: create_user_profile()
                  │
                  ▼
         ┌────────────────────────────────────┐
         │ Create in public.users:            │
         │ ├─ id: UUID (same as auth.users)   │
         │ ├─ oauth_provider: "google"        │
         │ ├─ oauth_provider_id: "123456"     │
         │ ├─ email: "user@example.com"       │
         │ ├─ name: "John Doe"                │
         │ ├─ profile_picture: "https://..."  │
         │ ├─ role: "buyer"                   │
         │ └─ eco_impact: {default values}    │
         └────────────────────────────────────┘
```

---

## Security Flow

```
┌─────────────────────────────────────────────────────────┐
│              OAuth Security Layers                       │
└─────────────────────────────────────────────────────────┘

Layer 1: HTTPS Encryption
├─ All OAuth traffic uses HTTPS
├─ Tokens encrypted in transit
└─ Prevents man-in-the-middle attacks

Layer 2: State Parameter
├─ Supabase generates random state
├─ Validates state on callback
└─ Prevents CSRF attacks

Layer 3: Token Verification
├─ Supabase verifies ID token signature
├─ Checks token expiration
├─ Validates issuer and audience
└─ Ensures token authenticity

Layer 4: Session Management
├─ Supabase generates JWT session token
├─ Stored in httpOnly cookie
├─ Auto-refresh before expiration
└─ Secure session handling

Layer 5: Row Level Security (RLS)
├─ PostgreSQL RLS policies
├─ Users can only access their own data
├─ Admin role for moderation
└─ Database-level security
```

---

## Testing Flow

```
┌─────────────────────────────────────────────────────────┐
│              Testing Checklist                           │
└─────────────────────────────────────────────────────────┘

1. Start Development Server
   └─> npm run dev

2. Test Google OAuth
   ├─> Click "Sign in with Google"
   ├─> Redirected to Google consent screen
   ├─> Grant permissions
   ├─> Redirected back to app
   └─> ✓ Logged in successfully

3. Check Supabase Dashboard
   ├─> Authentication → Users
   ├─> New user appears
   ├─> Provider: "google"
   └─> ✓ User metadata populated

4. Test Apple OAuth
   └─> (Same flow as Google)

5. Test Microsoft OAuth
   └─> (Same flow as Google)

6. Verify Session
   ├─> Check browser cookies
   ├─> Session token present
   ├─> httpOnly flag set
   └─> ✓ Secure session

7. Test Logout
   ├─> Click logout
   ├─> Session cleared
   └─> ✓ Redirected to login
```

---

## Troubleshooting Decision Tree

```
OAuth Sign-in Failed?
         │
         ├─ Error: "redirect_uri_mismatch"
         │  └─> Check redirect URIs match exactly
         │     ├─ In OAuth provider console
         │     ├─ In Supabase Auth settings
         │     └─> Fix: Update URIs to match
         │
         ├─ Error: "invalid_client"
         │  └─> Check credentials
         │     ├─ Client ID correct?
         │     ├─ Client Secret correct?
         │     └─> Fix: Re-copy credentials
         │
         ├─ Error: "access_denied"
         │  └─> User denied permission
         │     └─> Fix: User must grant permission
         │
         ├─ Error: "invalid_request"
         │  └─> Check OAuth configuration
         │     ├─ Scopes configured?
         │     ├─ Consent screen published?
         │     └─> Fix: Complete OAuth setup
         │
         └─ No error, but not logged in
            └─> Check Supabase logs
               ├─> Dashboard → Logs → Auth Logs
               └─> Look for error messages
```

---

## Summary

This diagram shows:
1. ✅ High-level OAuth flow
2. ✅ Configuration steps for each provider
3. ✅ Redirect URL flow
4. ✅ User creation process
5. ✅ Security layers
6. ✅ Testing procedures
7. ✅ Troubleshooting decision tree

Use this as a visual reference while following the detailed instructions in `TASK_3.1_OAUTH_SETUP.md`.

---

**Next Steps**: Follow the main guide to configure each OAuth provider.
