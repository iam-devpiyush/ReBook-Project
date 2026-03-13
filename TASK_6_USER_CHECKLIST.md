# Task 6: User Configuration Checklist

## Overview
All code and infrastructure is complete. You just need to configure external services with your credentials.

## Quick Status Check

Run this command to see what needs configuration:
```bash
npm run verify:foundation
```

## Configuration Checklist

### ☐ Step 1: Configure Supabase (REQUIRED)

**Time: 5-10 minutes**

1. ☐ Create Supabase project at https://supabase.com (if not already done)

2. ☐ Get your credentials:
   - Go to: Project Settings → API
   - Copy: Project URL
   - Copy: anon/public key

3. ☐ Update `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

4. ☐ Apply database migrations:
   - Go to: Supabase Dashboard → SQL Editor
   - Run: `supabase/migrations/20240101000000_initial_schema.sql`
   - Run: `supabase/migrations/20240101000001_rls_policies.sql`
   - Run: `supabase/migrations/20240101000002_functions_and_triggers.sql`
   - Run: `supabase/seeds/20240101000000_seed_categories.sql`

5. ☐ Verify:
   ```bash
   npm run verify:supabase
   ```

### ☐ Step 2: Start Meilisearch (REQUIRED)

**Time: 2 minutes**

Choose one option:

**Option A: Docker (Recommended)**
```bash
docker run -d -p 7700:7700 \
  -e MEILI_MASTER_KEY="aSampleMasterKey" \
  --name meilisearch \
  getmeili/meilisearch:latest
```

**Option B: Homebrew (macOS)**
```bash
brew install meilisearch
meilisearch --master-key="aSampleMasterKey"
```

**Option C: Direct Download**
```bash
curl -L https://install.meilisearch.com | sh
./meilisearch --master-key="aSampleMasterKey"
```

Update `backend/.env`:
```env
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=aSampleMasterKey
```

Verify:
```bash
npm run verify:meilisearch
```

### ☐ Step 3: Configure OAuth (OPTIONAL - Can do later)

**Time: 15-30 minutes per provider**

Follow detailed guide: `TASK_3.1_OAUTH_SETUP.md`

- ☐ Google OAuth
- ☐ Apple Sign In
- ☐ Microsoft Azure AD

Verify:
```bash
npm run verify:oauth
```

### ☐ Step 4: Create Storage Bucket (OPTIONAL - Can do later)

**Time: 2-5 minutes**

Follow guide: `supabase/storage/SETUP_GUIDE.md`

1. ☐ Go to: Supabase Dashboard → Storage
2. ☐ Create new bucket: `book-images`
3. ☐ Make it public
4. ☐ Set file size limit: 5MB
5. ☐ Allowed types: image/jpeg, image/png
6. ☐ Apply storage policies from `supabase/storage/storage_policies.sql`

Verify:
```bash
npm run verify:storage
```

## Final Verification

After completing Steps 1 and 2 (required):

```bash
npm run verify:foundation
```

Expected result:
```
✅ All checks passed! (16/16) or (10/16 if optional steps skipped)

Phase 1 is complete. Ready to proceed to Phase 2.
```

## Test the Application

### Start Development Servers

**Terminal 1 - Frontend:**
```bash
cd frontend
npm run dev
```
Opens at: http://localhost:3000

**Terminal 2 - Backend:**
```bash
cd backend
npm run dev
```
Runs at: http://localhost:3001

### Test Basic Functionality

1. ☐ Open http://localhost:3000
2. ☐ Page loads without errors
3. ☐ Check browser console for errors
4. ☐ Test backend health: http://localhost:3001/health

## Troubleshooting

### Supabase Connection Failed
- ✓ Check URL format: `https://xxxxx.supabase.co`
- ✓ Verify anon key (not service role key)
- ✓ Ensure migrations are applied
- ✓ Check project is not paused

### Meilisearch Connection Failed
- ✓ Check server is running: `curl http://localhost:7700/health`
- ✓ Verify port 7700 is available
- ✓ Check MEILISEARCH_HOST in backend/.env
- ✓ Restart Meilisearch server

### Next.js Build Errors
- ✓ Run: `npm install` in root directory
- ✓ Clear cache: `rm -rf frontend/.next`
- ✓ Check frontend/.env.local exists
- ✓ Verify TypeScript: `cd frontend && npx tsc --noEmit`

### Backend Errors
- ✓ Check backend/.env exists
- ✓ Verify TypeScript: `cd backend && npx tsc --noEmit`
- ✓ Check logs: `backend/logs/error.log`

## Need Help?

### Documentation
- **Setup Guide**: `SETUP.md`
- **Quick Start**: `TASK_6_QUICK_START.md`
- **Supabase**: `QUICK_START_SUPABASE.md`
- **OAuth**: `TASK_3.1_OAUTH_SETUP.md`
- **Storage**: `supabase/storage/SETUP_GUIDE.md`
- **Meilisearch**: `MEILISEARCH_SETUP.md`
- **Testing**: `backend/TESTING.md`

### Verification Commands
```bash
npm run verify:foundation    # All checks
npm run verify:supabase      # Supabase only
npm run verify:oauth         # OAuth only
npm run verify:storage       # Storage only
npm run verify:meilisearch   # Meilisearch only
```

## What's Next?

Once verification passes:

1. ✅ Phase 1 is complete!
2. 🚀 Start building features
3. 📝 Proceed to Phase 2: Authentication and User Management
4. 🎯 Begin Task 7: Implement Supabase Auth integration

## Summary

- ✅ All code is written and tested
- ✅ All infrastructure is configured
- ⚠️ Just need your service credentials
- 🎯 Should take 10-15 minutes total

**You're almost there! Just add your credentials and you're ready to build!**
