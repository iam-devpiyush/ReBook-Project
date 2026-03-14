# Supabase Setup Guide

This guide will help you set up Supabase for the Second-Hand Book Marketplace project.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (sign up at https://supabase.com)

## Step 1: Create a Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in the project details:
   - **Name**: second-hand-book-marketplace (or your preferred name)
   - **Database Password**: Choose a strong password (save this securely)
   - **Region**: Choose the region closest to your users (e.g., Mumbai for India)
   - **Pricing Plan**: Free tier is sufficient for development
4. Click "Create new project"
5. Wait for the project to be provisioned (takes 1-2 minutes)

## Step 2: Get Your Supabase Credentials

1. Once your project is ready, go to **Settings** → **API**
2. You'll find two important values:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon/public key**: A long string starting with `eyJ...`

## Step 3: Configure Environment Variables

1. Open `frontend/.env.local` in your editor
2. Replace the placeholder values with your actual credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=http://localhost:3001
```

3. Save the file

## Step 4: Install Supabase CLI (Optional but Recommended)

The Supabase CLI allows you to manage your database schema, run migrations, and generate TypeScript types.

### Install globally:
```bash
npm install -g supabase
```

### Login to Supabase:
```bash
supabase login
```

### Link your project:
```bash
cd frontend
supabase link --project-ref your-project-id
```

You can find your project ID in the Supabase dashboard URL or in Settings → General.

## Step 5: Configure OAuth Providers

To enable OAuth authentication with Google, Apple, and Microsoft:

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Enable the providers you want to use:

### Google OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen
6. Add authorized redirect URIs:
   - `https://your-project-id.supabase.co/auth/v1/callback`
7. Copy the **Client ID** and **Client Secret**
8. Paste them in Supabase dashboard under Google provider settings

### Apple OAuth:
1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Create a new Service ID
3. Configure Sign in with Apple
4. Add redirect URI: `https://your-project-id.supabase.co/auth/v1/callback`
5. Copy the credentials and paste in Supabase dashboard

### Microsoft OAuth:
1. Go to [Azure Portal](https://portal.azure.com)
2. Register a new application
3. Add redirect URI: `https://your-project-id.supabase.co/auth/v1/callback`
4. Copy the credentials and paste in Supabase dashboard

## Step 6: Set Up Storage Buckets

1. Go to **Storage** in your Supabase dashboard
2. Click "Create a new bucket"
3. Create a bucket named `book-images`
4. Set it to **Public** (so book images can be viewed without authentication)
5. Configure upload policies:
   - Max file size: 5MB
   - Allowed MIME types: image/jpeg, image/png

## Step 7: Verify Setup

1. Start the development server:
```bash
cd frontend
npm run dev
```

2. The app should start without errors
3. Check the browser console for any Supabase connection errors

## Step 8: Generate TypeScript Types (After Schema Creation)

Once you've created your database schema (Task 2.2), generate TypeScript types:

```bash
supabase gen types typescript --project-id your-project-id > src/types/database.ts
```

This will update the `database.ts` file with your actual schema types.

## Troubleshooting

### "Invalid API key" error
- Double-check that you copied the correct anon key from Supabase dashboard
- Make sure there are no extra spaces or line breaks in the `.env.local` file

### "Failed to fetch" error
- Verify your project URL is correct
- Check that your Supabase project is running (not paused)
- Ensure you have internet connectivity

### OAuth redirect errors
- Verify redirect URIs are correctly configured in both Supabase and OAuth provider
- Check that the provider is enabled in Supabase dashboard

## Next Steps

After completing this setup:
1. Proceed to Task 2.2: Define database schema with SQL migrations
2. Configure Row Level Security (RLS) policies
3. Test authentication flows

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Helpers for Next.js](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
