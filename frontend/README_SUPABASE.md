# Supabase Integration Documentation

This document explains how Supabase is integrated into the Second-Hand Book Marketplace frontend application.

## Overview

The application uses Supabase as the primary backend infrastructure, providing:
- **PostgreSQL Database**: Relational data storage
- **Authentication**: OAuth with Google, Apple, and Microsoft
- **Storage**: File storage for book images
- **Realtime**: Live subscriptions for updates

## Architecture

```
Frontend (Next.js)
├── Supabase Client (Browser)
│   └── Used in React components
├── Supabase Server Client (Node.js)
│   └── Used in API routes and server components
└── Supabase Middleware
    └── Handles session refresh on every request
```

## File Structure

```
frontend/
├── .env.local                          # Environment variables (Supabase credentials)
├── middleware.ts                       # Next.js middleware entry point
├── src/
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts              # Client-side Supabase client
│   │       ├── server.ts              # Server-side Supabase client
│   │       ├── middleware.ts          # Session refresh middleware
│   │       └── index.ts               # Exports
│   ├── hooks/
│   │   └── useSupabase.ts             # React hooks for Supabase
│   └── types/
│       └── database.ts                # TypeScript types for database schema
```

## Usage Examples

### 1. Using Supabase in Client Components

```typescript
'use client';

import { useSupabase, useUser } from '@/hooks/useSupabase';

export default function MyComponent() {
  const supabase = useSupabase();
  const { user, loading } = useUser();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;

  return <div>Welcome, {user.email}</div>;
}
```

### 2. Using Supabase in Server Components

```typescript
import { createServerClient } from '@/lib/supabase/server';

export default async function ServerComponent() {
  const supabase = createServerClient();
  
  const { data: listings } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'active');

  return <div>{/* Render listings */}</div>;
}
```

### 3. Using Supabase in API Routes

```typescript
import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('listings')
    .select('*');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
```

### 4. Authentication

```typescript
'use client';

import { useSupabase } from '@/hooks/useSupabase';

export default function LoginButton() {
  const supabase = useSupabase();

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) console.error('Error signing in:', error);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error);
  };

  return (
    <>
      <button onClick={signInWithGoogle}>Sign in with Google</button>
      <button onClick={signOut}>Sign out</button>
    </>
  );
}
```

### 5. Realtime Subscriptions

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@/hooks/useSupabase';

export default function RealtimeComponent() {
  const supabase = useSupabase();
  const [listings, setListings] = useState([]);

  useEffect(() => {
    // Subscribe to changes
    const channel = supabase
      .channel('listings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'listings',
        },
        (payload) => {
          console.log('Change received!', payload);
          // Update state based on payload
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return <div>{/* Render listings */}</div>;
}
```

### 6. File Upload to Storage

```typescript
'use client';

import { useSupabase } from '@/hooks/useSupabase';

export default function ImageUpload() {
  const supabase = useSupabase();

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `book-images/${fileName}`;

    const { data, error } = await supabase.storage
      .from('book-images')
      .upload(filePath, file);

    if (error) {
      console.error('Error uploading:', error);
      return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('book-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  return (
    <input
      type="file"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) uploadImage(file);
      }}
    />
  );
}
```

## Environment Variables

The following environment variables must be set in `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Security Considerations

### Row Level Security (RLS)

All tables in Supabase should have RLS policies enabled. Example policies:

```sql
-- Users can only read their own data
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Anyone can view active listings
CREATE POLICY "Anyone can view active listings"
  ON listings FOR SELECT
  USING (status = 'active');

-- Sellers can create listings
CREATE POLICY "Sellers can create listings"
  ON listings FOR INSERT
  WITH CHECK (auth.uid() = seller_id);
```

### API Keys

- **Anon Key**: Safe to use in client-side code, respects RLS policies
- **Service Role Key**: Should NEVER be exposed to the client, bypasses RLS

## TypeScript Types

After creating your database schema, generate TypeScript types:

```bash
supabase gen types typescript --project-id your-project-id > src/types/database.ts
```

This provides full type safety for database operations:

```typescript
import type { Database } from '@/types/database';

type Listing = Database['public']['Tables']['listings']['Row'];
type ListingInsert = Database['public']['Tables']['listings']['Insert'];
type ListingUpdate = Database['public']['Tables']['listings']['Update'];
```

## Middleware

The middleware automatically refreshes the user's session on every request:

```typescript
// frontend/middleware.ts
export { middleware, config } from './src/lib/supabase/middleware';
```

This ensures users stay authenticated without manual intervention.

## Best Practices

1. **Always use the appropriate client**:
   - Client components → `useSupabase()` hook
   - Server components → `createServerClient()`
   - API routes → `createServerClient()`

2. **Handle errors gracefully**:
   ```typescript
   const { data, error } = await supabase.from('listings').select('*');
   if (error) {
     console.error('Database error:', error);
     // Handle error appropriately
   }
   ```

3. **Use TypeScript types**:
   ```typescript
   const { data } = await supabase
     .from('listings')
     .select('*')
     .returns<Listing[]>();
   ```

4. **Implement proper RLS policies** to secure your data

5. **Use Realtime subscriptions** for live updates instead of polling

## Troubleshooting

### "Invalid API key" error
- Check that `.env.local` has the correct credentials
- Restart the dev server after changing environment variables

### "Failed to fetch" error
- Verify the Supabase project URL is correct
- Check that the project is not paused in Supabase dashboard

### Session not persisting
- Ensure middleware is properly configured
- Check browser cookies are enabled

### RLS policy errors
- Review your RLS policies in Supabase dashboard
- Use the SQL editor to test policies

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
