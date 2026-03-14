# Quick Start Guide - Supabase Setup

This is a condensed version of the Supabase setup. For detailed instructions, see `SUPABASE_SETUP.md`.

## 1. Create Supabase Project (5 minutes)

1. Go to https://app.supabase.com
2. Click **"New Project"**
3. Fill in:
   - Name: `second-hand-book-marketplace`
   - Database Password: (choose a strong password)
   - Region: Mumbai (or closest to you)
4. Click **"Create new project"**
5. Wait 1-2 minutes for provisioning

## 2. Get Credentials (1 minute)

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these two values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (long string)

## 3. Configure Environment (1 minute)

1. Open `frontend/.env.local` in your editor
2. Replace the placeholder values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

3. Save the file

## 4. Start Development Server

```bash
cd frontend
npm run dev
```

Visit http://localhost:3001 - the app should load without errors!

## 5. Optional: Install Supabase CLI

```bash
npm install -g supabase
supabase login
cd frontend
supabase link --project-ref your-project-id
```

## What's Next?

- **Configure OAuth**: See `SUPABASE_SETUP.md` → Step 5
- **Set up Storage**: See `SUPABASE_SETUP.md` → Step 6
- **Create Database Schema**: Proceed to Task 2.2

## Troubleshooting

**"Invalid API key" error?**
- Double-check you copied the correct values
- Make sure there are no extra spaces
- Restart the dev server: `npm run dev`

**"Failed to fetch" error?**
- Verify your Project URL is correct
- Check your Supabase project is running (not paused)

## Need Help?

- Full setup guide: `SUPABASE_SETUP.md`
- Integration docs: `README_SUPABASE.md`
- Supabase docs: https://supabase.com/docs
