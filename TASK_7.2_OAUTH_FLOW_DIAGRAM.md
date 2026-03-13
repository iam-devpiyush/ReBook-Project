# OAuth Sign-In Flow Diagram

## Complete OAuth Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         OAuth Sign-In Flow                               │
└─────────────────────────────────────────────────────────────────────────┘

1. User Visits Sign-In Page
   ┌──────────────┐
   │    User      │
   └──────┬───────┘
          │ Navigate to /auth/signin
          ▼
   ┌──────────────────────┐
   │  Sign-In Page        │
   │  - Google Button     │
   │  - Apple Button      │
   │  - Microsoft Button  │
   └──────┬───────────────┘
          │ Click OAuth Button
          ▼

2. OAuth Flow Initiation
   ┌──────────────────────┐
   │ signInWithOAuth()    │
   │ - Provider: google   │
   │ - Redirect: callback │
   └──────┬───────────────┘
          │ Call Supabase Auth
          ▼
   ┌──────────────────────┐
   │  Supabase Auth       │
   │  signInWithOAuth()   │
   └──────┬───────────────┘
          │ Generate OAuth URL
          ▼

3. Provider Authorization
   ┌──────────────────────┐
   │  OAuth Provider      │
   │  (Google/Apple/MS)   │
   │  - Login Screen      │
   │  - Consent Screen    │
   └──────┬───────────────┘
          │ User grants permission
          ▼
   ┌──────────────────────┐
   │  Authorization Code  │
   │  Generated           │
   └──────┬───────────────┘
          │ Redirect with code
          ▼

4. OAuth Callback
   ┌──────────────────────┐
   │  /auth/callback      │
   │  - Receive code      │
   │  - Exchange for      │
   │    session           │
   └──────┬───────────────┘
          │ exchangeCodeForSession()
          ▼
   ┌──────────────────────┐
   │  Supabase Auth       │
   │  - Verify tokens     │
   │  - Create session    │
   │  - Generate JWT      │
   └──────┬───────────────┘
          │ Session created
          ▼

5. User Record Creation
   ┌──────────────────────┐
   │  Check User Exists   │
   └──────┬───────────────┘
          │
          ├─ Yes ──────────┐
          │                │
          ├─ No ───────────┤
          │                │
          ▼                ▼
   ┌──────────────┐  ┌──────────────┐
   │ Use Existing │  │ Create User  │
   │ User Record  │  │ Record in DB │
   └──────┬───────┘  └──────┬───────┘
          │                 │
          └────────┬────────┘
                   ▼

6. Redirect to Dashboard
   ┌──────────────────────┐
   │  Redirect to         │
   │  /dashboard          │
   └──────┬───────────────┘
          │
          ▼
   ┌──────────────────────┐
   │  Dashboard Page      │
   │  - User Profile      │
   │  - Quick Actions     │
   │  - Sign Out Button   │
   └──────────────────────┘

7. Auth State Update
   ┌──────────────────────┐
   │  AuthProvider        │
   │  - Update user       │
   │  - Update session    │
   │  - Broadcast change  │
   └──────────────────────┘
          │
          ▼
   ┌──────────────────────┐
   │  All Components      │
   │  Receive Auth Update │
   └──────────────────────┘
```

## Error Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         OAuth Error Flow                                 │
└─────────────────────────────────────────────────────────────────────────┘

1. OAuth Error Occurs
   ┌──────────────────────┐
   │  Error Source        │
   │  - User denies       │
   │  - Provider error    │
   │  - Code exchange     │
   │    fails             │
   └──────┬───────────────┘
          │
          ▼

2. Error Detection
   ┌──────────────────────┐
   │  /auth/callback      │
   │  - Detect error      │
   │  - Extract message   │
   └──────┬───────────────┘
          │ Redirect with error
          ▼

3. Error Display
   ┌──────────────────────┐
   │  /auth/error         │
   │  - Show error        │
   │  - Retry button      │
   │  - Home button       │
   └──────┬───────────────┘
          │
          ├─ Retry ────────┐
          │                │
          ├─ Home ─────────┤
          │                │
          ▼                ▼
   ┌──────────────┐  ┌──────────────┐
   │ /auth/signin │  │      /       │
   └──────────────┘  └──────────────┘
```

## Component Interaction

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Component Interaction Flow                            │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│   Root Layout        │
│   <AuthProvider>     │
└──────┬───────────────┘
       │ Provides auth state
       │
       ├─────────────────────────────────────────┐
       │                                         │
       ▼                                         ▼
┌──────────────────────┐              ┌──────────────────────┐
│   Home Page          │              │   Sign-In Page       │
│   - useAuth()        │              │   - signInWithOAuth()│
│   - Show sign-in     │              │   - OAuth buttons    │
│     or dashboard     │              │   - Error display    │
└──────────────────────┘              └──────────────────────┘
       │                                         │
       │                                         │
       ▼                                         ▼
┌──────────────────────┐              ┌──────────────────────┐
│   Dashboard          │              │   Callback Route     │
│   - useAuth()        │◄─────────────│   - Exchange code    │
│   - Protected route  │  Redirect    │   - Create user      │
│   - User profile     │              │   - Redirect         │
└──────────────────────┘              └──────────────────────┘
```

## Session Management Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Session Management Flow                             │
└─────────────────────────────────────────────────────────────────────────┘

1. Session Creation
   ┌──────────────────────┐
   │  OAuth Sign-In       │
   └──────┬───────────────┘
          │
          ▼
   ┌──────────────────────┐
   │  Supabase Auth       │
   │  - Generate JWT      │
   │  - Set cookie        │
   └──────┬───────────────┘
          │
          ▼
   ┌──────────────────────┐
   │  Session Active      │
   │  - httpOnly cookie   │
   │  - Auto refresh      │
   └──────────────────────┘

2. Session Refresh
   ┌──────────────────────┐
   │  Token Expiring      │
   └──────┬───────────────┘
          │
          ▼
   ┌──────────────────────┐
   │  Supabase Auth       │
   │  - Auto refresh      │
   │  - New JWT           │
   └──────┬───────────────┘
          │
          ▼
   ┌──────────────────────┐
   │  Session Refreshed   │
   │  - Updated cookie    │
   └──────────────────────┘

3. Sign Out
   ┌──────────────────────┐
   │  User Clicks         │
   │  Sign Out            │
   └──────┬───────────────┘
          │
          ▼
   ┌──────────────────────┐
   │  signOut()           │
   └──────┬───────────────┘
          │
          ▼
   ┌──────────────────────┐
   │  Supabase Auth       │
   │  - Invalidate token  │
   │  - Clear cookie      │
   └──────┬───────────────┘
          │
          ▼
   ┌──────────────────────┐
   │  Session Ended       │
   │  - Redirect to home  │
   └──────────────────────┘
```

## Real-Time Auth State Updates

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   Real-Time Auth State Updates                           │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│  Supabase Auth       │
│  Event Emitter       │
└──────┬───────────────┘
       │ Auth state change
       │
       ▼
┌──────────────────────┐
│  AuthProvider        │
│  - onAuthStateChange │
│  - Update state      │
└──────┬───────────────┘
       │ Broadcast to subscribers
       │
       ├─────────────────────────────────────────┐
       │                                         │
       ▼                                         ▼
┌──────────────────────┐              ┌──────────────────────┐
│   useAuth() Hook     │              │   useAuthContext()   │
│   - Receives update  │              │   - Receives update  │
│   - Re-render        │              │   - Re-render        │
└──────────────────────┘              └──────────────────────┘
       │                                         │
       ▼                                         ▼
┌──────────────────────┐              ┌──────────────────────┐
│   Component A        │              │   Component B        │
│   - Updated UI       │              │   - Updated UI       │
└──────────────────────┘              └──────────────────────┘
```

## Database Integration Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Database Integration Flow                             │
└─────────────────────────────────────────────────────────────────────────┘

1. New User Sign-In
   ┌──────────────────────┐
   │  OAuth Profile       │
   │  - id                │
   │  - email             │
   │  - name              │
   │  - avatar            │
   │  - provider          │
   └──────┬───────────────┘
          │
          ▼
   ┌──────────────────────┐
   │  Check User Exists   │
   │  SELECT * FROM users │
   │  WHERE id = ?        │
   └──────┬───────────────┘
          │
          ├─ Not Found ────┐
          │                │
          ▼                │
   ┌──────────────────────┐│
   │  Create User Record  ││
   │  INSERT INTO users   ││
   │  - id                ││
   │  - email             ││
   │  - name              ││
   │  - profile_picture   ││
   │  - oauth_provider    ││
   │  - oauth_provider_id ││
   │  - role: 'buyer'     ││
   │  - is_active: true   ││
   └──────┬───────────────┘│
          │                │
          └────────┬───────┘
                   ▼
   ┌──────────────────────┐
   │  User Record Ready   │
   └──────────────────────┘

2. Existing User Sign-In
   ┌──────────────────────┐
   │  OAuth Profile       │
   └──────┬───────────────┘
          │
          ▼
   ┌──────────────────────┐
   │  Check User Exists   │
   └──────┬───────────────┘
          │
          ├─ Found ────────┐
          │                │
          ▼                │
   ┌──────────────────────┐│
   │  Use Existing Record ││
   └──────┬───────────────┘│
          │                │
          └────────┬───────┘
                   ▼
   ┌──────────────────────┐
   │  Session Created     │
   └──────────────────────┘
```
