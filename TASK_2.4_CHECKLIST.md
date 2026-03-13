# Task 2.4 Completion Checklist

Use this checklist to track your progress through Task 2.4.

## Pre-Setup

- [ ] Read `QUICK_START_SUPABASE.md` for overview
- [ ] Have a Supabase account (or create one at https://app.supabase.com)

## Step 1: Create Supabase Project

- [ ] Go to https://app.supabase.com
- [ ] Click "New Project"
- [ ] Enter project name: `second-hand-book-marketplace`
- [ ] Choose a strong database password (save it securely!)
- [ ] Select region (e.g., `ap-south-1` for India)
- [ ] Click "Create new project"
- [ ] Wait for provisioning (2-3 minutes)

## Step 2: Get Credentials

- [ ] Go to Settings → API in Supabase Dashboard
- [ ] Copy Project URL (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
- [ ] Copy anon/public key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## Step 3: Configure Environment

- [ ] Open `frontend/.env.local` in your editor
- [ ] Replace `your-supabase-project-url` with your actual Project URL
- [ ] Replace `your-supabase-anon-key` with your actual anon key
- [ ] Save the file

## Step 4: Apply Migrations

### Migration 1: Initial Schema
- [ ] Go to Supabase Dashboard → SQL Editor
- [ ] Click "New Query"
- [ ] Open `supabase/migrations/20240101000000_initial_schema.sql`
- [ ] Copy entire contents
- [ ] Paste into SQL Editor
- [ ] Click "Run" (or press Ctrl+Enter)
- [ ] Verify "Success. No rows returned" message

### Migration 2: RLS Policies
- [ ] Click "New Query" again
- [ ] Open `supabase/migrations/20240101000001_rls_policies.sql`
- [ ] Copy entire contents
- [ ] Paste into SQL Editor
- [ ] Click "Run"
- [ ] Verify success message

### Migration 3: Functions and Triggers
- [ ] Click "New Query" again
- [ ] Open `supabase/migrations/20240101000002_functions_and_triggers.sql`
- [ ] Copy entire contents
- [ ] Paste into SQL Editor
- [ ] Click "Run"
- [ ] Verify success message

## Step 5: Verify in Dashboard

### Check Tables
- [ ] Go to Table Editor in Supabase Dashboard
- [ ] Verify you see all 12 tables:
  - [ ] users
  - [ ] categories
  - [ ] books
  - [ ] listings
  - [ ] orders
  - [ ] payments
  - [ ] shipping
  - [ ] reviews
  - [ ] wishlist
  - [ ] moderation_logs
  - [ ] platform_stats
  - [ ] ai_scans

### Check RLS Policies
- [ ] Click on `listings` table
- [ ] Click "Policies" tab
- [ ] Verify you see multiple RLS policies listed

### Check Functions
- [ ] Go to Database → Functions
- [ ] Verify you see functions like:
  - [ ] calculate_environmental_impact
  - [ ] calculate_listing_pricing
  - [ ] get_condition_multiplier

### Check Triggers
- [ ] Go to Database → Triggers
- [ ] Verify you see triggers like:
  - [ ] update_users_updated_at
  - [ ] calculate_pricing_on_listing_change

## Step 6: Run Verification Script

- [ ] Open terminal in project root
- [ ] Run: `npm install`
- [ ] Run: `npm run verify:supabase`
- [ ] Verify all checks pass:
  - [ ] ✅ Environment variables configured
  - [ ] ✅ Successfully connected to Supabase
  - [ ] ✅ All 12 tables exist
  - [ ] ✅ RLS policies are working
  - [ ] ✅ Database functions are installed

## Step 7: Test Connection

- [ ] Run: `cd frontend && npm run dev`
- [ ] Open browser to `http://localhost:3000`
- [ ] Verify no Supabase connection errors in console

## Final Verification

- [ ] All migrations applied successfully
- [ ] All tables visible in Supabase Dashboard
- [ ] RLS policies active
- [ ] Functions and triggers installed
- [ ] Verification script passes
- [ ] Next.js app connects without errors

## Task Complete! 🎉

- [ ] Mark Task 2.4 as complete
- [ ] Proceed to Task 3: Configure Supabase Auth with OAuth providers

---

**Estimated Time**: 15-20 minutes
**Difficulty**: Easy

If you encounter any issues, refer to:
- `SUPABASE_MIGRATION_GUIDE.md` for detailed instructions
- `TASK_2.4_INSTRUCTIONS.md` for troubleshooting
