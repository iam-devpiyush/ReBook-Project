# Task 2.4: Run Supabase Migrations - Instructions

## Task Overview

**Task**: 2.4 Run Supabase migrations
- Apply migrations to Supabase database
- Verify all tables and RLS policies are created
- Test database connection from Next.js app
- **Requirements**: 20.1

## Current Status

✅ **Migrations are ready** - All SQL migration files have been created:
- `supabase/migrations/20240101000000_initial_schema.sql` - Creates all 12 tables
- `supabase/migrations/20240101000001_rls_policies.sql` - Sets up Row Level Security
- `supabase/migrations/20240101000002_functions_and_triggers.sql` - Adds business logic

⏳ **Waiting for Supabase project setup** - You need to create a Supabase project and apply the migrations.

## What You Need to Do

### Step 1: Create a Supabase Project

Follow the detailed guide in `SUPABASE_MIGRATION_GUIDE.md`:

```bash
# Open the guide
cat SUPABASE_MIGRATION_GUIDE.md
```

**Quick summary**:
1. Go to https://app.supabase.com
2. Create a new project
3. Wait for provisioning (2-3 minutes)
4. Get your Project URL and anon key from Settings → API

### Step 2: Configure Environment Variables

Edit `frontend/.env.local` with your actual Supabase credentials:

```bash
# Before (placeholder values)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# After (your actual values)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 3: Apply Migrations

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Apply each migration file in order:

   **Migration 1**: Copy contents of `supabase/migrations/20240101000000_initial_schema.sql`
   - Paste into SQL Editor
   - Click **Run**
   - Wait for success message

   **Migration 2**: Copy contents of `supabase/migrations/20240101000001_rls_policies.sql`
   - Paste into SQL Editor
   - Click **Run**
   - Wait for success message

   **Migration 3**: Copy contents of `supabase/migrations/20240101000002_functions_and_triggers.sql`
   - Paste into SQL Editor
   - Click **Run**
   - Wait for success message

**Option B: Using Supabase CLI**

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### Step 4: Verify Setup

After applying migrations, run the verification script:

```bash
# Install dependencies first
npm install

# Run verification
npm run verify:supabase
```

The script will check:
- ✅ Environment variables are configured
- ✅ Database connection is working
- ✅ All 12 tables are created
- ✅ RLS policies are enabled
- ✅ Database functions are installed

### Step 5: Verify in Supabase Dashboard

1. Go to **Table Editor** - You should see all 12 tables:
   - users
   - categories
   - books
   - listings
   - orders
   - payments
   - shipping
   - reviews
   - wishlist
   - moderation_logs
   - platform_stats
   - ai_scans

2. Click on any table → **Policies** tab - You should see RLS policies

3. Go to **Database** → **Functions** - You should see helper functions

4. Go to **Database** → **Triggers** - You should see automated triggers

## Expected Results

After completing these steps:

✅ **All tables created** - 12 tables with proper schema
✅ **RLS policies active** - Security policies enforcing access control
✅ **Functions installed** - Helper functions for calculations
✅ **Triggers working** - Automated business logic
✅ **Connection verified** - Next.js app can connect to Supabase

## Database Schema Summary

### Core Tables (12 total)

1. **users** - User profiles extending Supabase auth.users
   - OAuth provider information
   - Location data
   - Environmental impact metrics
   - Admin controls (suspension, listing limits)

2. **categories** - Hierarchical category structure
   - School books (K-12)
   - Competitive exams (JEE, NEET, UPSC)
   - College textbooks
   - General reading

3. **books** - Book metadata
   - ISBN, title, author, publisher
   - Category reference
   - Cover image

4. **listings** - Books for sale
   - Pricing breakdown
   - Condition score (1-5)
   - Status workflow (pending_approval → active → sold)
   - Admin approval tracking
   - Image gallery

5. **orders** - Purchase transactions
   - Buyer and seller references
   - Complete pricing breakdown
   - Payment and shipping tracking
   - Status workflow

6. **payments** - Payment gateway integration
   - Payment intent tracking
   - Gateway fees
   - Refund management

7. **shipping** - Courier integration
   - Tracking ID and shipping label
   - Package details
   - Delivery timeline

8. **reviews** - Buyer feedback
   - Rating (1-5 stars)
   - Comment
   - One review per order

9. **wishlist** - Saved books
   - User and book references

10. **moderation_logs** - Admin action audit trail
    - Action type
    - Target type and ID
    - Reason and notes

11. **platform_stats** - Daily aggregated statistics
    - Book metrics
    - User metrics
    - Revenue metrics
    - Environmental impact

12. **ai_scans** - AI scanner tracking
    - Uploaded images
    - Detected ISBN
    - Condition analysis
    - Progress tracking

### Key Features

**Automated Pricing Calculation**:
- Base price = Original price × Condition multiplier
- Platform commission = Base price × 10%
- Payment fees = (Base price × 2.5%) + ₹3
- Final price = Base price + Delivery cost + Commission + Payment fees

**Environmental Impact Tracking**:
- Trees saved = Books reused / 30
- Water saved = Books reused × 50 liters
- CO₂ reduced = Books reused × 2.5 kg

**Row Level Security**:
- Users can only view/edit their own data
- Active listings are publicly visible
- Orders visible only to buyer, seller, and admins
- Admin actions require admin role

## Troubleshooting

### Issue: "relation does not exist" error

**Solution**: Apply migrations in the correct order (initial schema → RLS policies → functions)

### Issue: "permission denied" error

**Solution**: Check API keys are correct and RLS policies are enabled

### Issue: Connection timeout

**Solution**: Verify Supabase URL is correct and project is active

### Issue: Verification script fails

**Solution**: 
1. Check environment variables in `frontend/.env.local`
2. Ensure migrations were applied successfully
3. Verify Supabase project is not paused

## Next Steps

After Task 2.4 is complete:

- **Task 3**: Configure Supabase Auth with OAuth providers
- **Task 4**: Set up Supabase Storage for images
- **Task 5**: Set up Meilisearch for search

## Files Created/Modified

### New Files:
- ✅ `SUPABASE_MIGRATION_GUIDE.md` - Detailed setup guide
- ✅ `TASK_2.4_INSTRUCTIONS.md` - This file
- ✅ `scripts/verify-supabase-setup.ts` - Verification script

### Modified Files:
- ✅ `package.json` - Added `verify:supabase` script

### Existing Migration Files:
- ✅ `supabase/migrations/20240101000000_initial_schema.sql`
- ✅ `supabase/migrations/20240101000001_rls_policies.sql`
- ✅ `supabase/migrations/20240101000002_functions_and_triggers.sql`

## Validation Checklist

Before marking Task 2.4 as complete, verify:

- [ ] Supabase project created
- [ ] Environment variables configured in `frontend/.env.local`
- [ ] Migration 1 (initial schema) applied successfully
- [ ] Migration 2 (RLS policies) applied successfully
- [ ] Migration 3 (functions and triggers) applied successfully
- [ ] All 12 tables visible in Supabase Table Editor
- [ ] RLS policies visible on tables
- [ ] Database functions visible in Supabase Dashboard
- [ ] Verification script runs successfully: `npm run verify:supabase`
- [ ] No connection errors when starting Next.js app

## Time Estimate

- **Supabase project creation**: 5 minutes
- **Environment configuration**: 2 minutes
- **Applying migrations**: 5 minutes
- **Verification**: 3 minutes
- **Total**: ~15 minutes

## Support

If you encounter issues:
1. Check `SUPABASE_MIGRATION_GUIDE.md` for detailed instructions
2. Review migration files in `supabase/migrations/`
3. Check Supabase Dashboard logs
4. Verify environment variables are correct
5. Run `npm run verify:supabase` for diagnostics

---

**Task Status**: ⏳ Waiting for user to complete Supabase setup

Once you've completed the steps above, run the verification script and confirm that all checks pass. Then Task 2.4 will be complete! ✅
