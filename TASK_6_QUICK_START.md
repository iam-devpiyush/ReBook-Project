# Task 6: Quick Start Guide

## What Was Completed

✅ **All development infrastructure is in place:**
- TypeScript configuration and compilation verified
- Next.js app structure complete
- Backend Express server configured
- Testing infrastructure ready
- Database schema and migrations created
- Verification scripts available

## What You Need to Do

To complete the foundation setup, you need to configure external services with your credentials:

### 1. Configure Supabase (Required)

**Time: 5-10 minutes**

1. Create a Supabase project at https://supabase.com (if you haven't already)

2. Get your credentials:
   - Go to Project Settings → API
   - Copy the Project URL
   - Copy the anon/public key

3. Update `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

4. Apply database migrations:
   - Option A: Via Supabase Dashboard → SQL Editor → paste migration files
   - Option B: Via Supabase CLI (if installed)

5. Verify: `npm run verify:supabase`

### 2. Start Meilisearch (Required for Search)

**Time: 2 minutes**

**Option A: Using Docker (Recommended)**
```bash
docker run -d -p 7700:7700 \
  -e MEILI_MASTER_KEY="your-master-key-here" \
  --name meilisearch \
  getmeili/meilisearch:latest
```

**Option B: Direct Installation**
```bash
# Install Meilisearch
curl -L https://install.meilisearch.com | sh

# Start server
./meilisearch --master-key="your-master-key-here"
```

**Option C: Using Homebrew (macOS)**
```bash
brew install meilisearch
meilisearch --master-key="your-master-key-here"
```

Update `backend/.env`:
```env
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your-master-key-here
```

Verify: `npm run verify:meilisearch`

### 3. Configure OAuth Providers (Optional for now)

**Time: 15-30 minutes per provider**

Follow the detailed guide: `TASK_3.1_OAUTH_SETUP.md`

Providers to configure:
- Google OAuth
- Apple Sign In
- Microsoft Azure AD

Verify: `npm run verify:oauth`

### 4. Set Up Storage Bucket (Optional for now)

**Time: 2-5 minutes**

Follow the guide: `supabase/storage/SETUP_GUIDE.md`

1. Go to Supabase Dashboard → Storage
2. Create bucket named `book-images`
3. Make it public
4. Apply storage policies

Verify: `npm run verify:storage`

## Verification Commands

### Check Everything
```bash
npm run verify:foundation
```

### Check Individual Components
```bash
npm run verify:supabase      # Supabase connection and tables
npm run verify:oauth         # OAuth providers
npm run verify:storage       # Storage bucket
npm run verify:meilisearch   # Meilisearch connection
```

### Test TypeScript Compilation
```bash
# Frontend
cd frontend && npx tsc --noEmit

# Backend
cd backend && npx tsc --noEmit
```

### Start Development Servers
```bash
# Frontend (Next.js)
cd frontend && npm run dev
# Opens at http://localhost:3000

# Backend (Express)
cd backend && npm run dev
# Runs at http://localhost:3001
```

## Current Status

Run `npm run verify:foundation` to see current status:

- ✅ **10/16 checks passing** (63%)
- ⚠️ **6 checks require user configuration**

### Passing Checks:
- TypeScript configuration
- Type definitions
- Project structure
- Dependencies installed
- Next.js setup
- Backend configuration

### Requires Configuration:
- Supabase credentials (REQUIRED)
- Meilisearch server (REQUIRED for search)
- OAuth providers (optional, can configure later)
- Storage bucket (optional, can configure later)

## Priority Order

### Must Do Now:
1. ✅ Configure Supabase credentials
2. ✅ Start Meilisearch server

### Can Do Later:
3. ⏸️ Configure OAuth providers (needed for user authentication)
4. ⏸️ Set up storage bucket (needed for image uploads)

## Expected Result

After configuring Supabase and Meilisearch:

```bash
npm run verify:foundation
```

Should show:
```
✅ All checks passed! (16/16)

Phase 1 is complete. Ready to proceed to Phase 2 (Authentication).
```

## Troubleshooting

### Supabase Connection Failed
- Verify URL format: `https://xxxxx.supabase.co`
- Check anon key is correct (not service role key)
- Ensure migrations are applied

### Meilisearch Connection Failed
- Check server is running: `curl http://localhost:7700/health`
- Verify port 7700 is not in use
- Check MEILISEARCH_HOST in backend/.env

### TypeScript Errors
- Run: `npm install` in root directory
- Clear cache: `rm -rf node_modules && npm install`

### Next.js Won't Start
- Check frontend/.env.local exists
- Run: `cd frontend && npm install`
- Clear Next.js cache: `rm -rf frontend/.next`

## Need Help?

- **Supabase Setup**: See `QUICK_START_SUPABASE.md`
- **OAuth Setup**: See `TASK_3.1_OAUTH_SETUP.md`
- **Storage Setup**: See `supabase/storage/SETUP_GUIDE.md`
- **Meilisearch Setup**: See `MEILISEARCH_SETUP.md`
- **Testing**: See `backend/TESTING.md`

## Next Steps

Once verification passes:
1. Start development servers
2. Test the application
3. Proceed to Phase 2: Authentication and User Management
