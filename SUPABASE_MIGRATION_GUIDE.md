# Supabase Migration Guide - Task 2.4

## Overview

This guide will help you:
1. Create a Supabase project
2. Configure environment variables
3. Apply database migrations
4. Verify the setup

## Step 1: Create a Supabase Project

### 1.1 Sign Up / Log In to Supabase

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign up for a free account or log in if you already have one
3. Click "New Project"

### 1.2 Create Your Project

Fill in the project details:
- **Name**: `second-hand-book-marketplace` (or your preferred name)
- **Database Password**: Choose a strong password (save this securely!)
- **Region**: Choose the closest region to your users (e.g., `ap-south-1` for India)
- **Pricing Plan**: Free tier is sufficient for development

Click "Create new project" and wait 2-3 minutes for provisioning.

## Step 2: Get Your Supabase Credentials

Once your project is ready:

1. Go to **Settings** → **API** in the left sidebar
2. You'll see:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **Project API keys**:
     - `anon` `public` key (this is safe to use in the browser)
     - `service_role` key (keep this secret, only use server-side)

## Step 3: Configure Environment Variables

### 3.1 Update Frontend Environment Variables

Edit `frontend/.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Replace:
- `https://xxxxxxxxxxxxx.supabase.co` with your actual Project URL
- `your-actual-anon-key-here` with your actual anon/public key

### 3.2 Update Backend Environment Variables (if needed)

If you have backend-specific Supabase operations, create `backend/.env`:

```bash
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=your-actual-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**⚠️ IMPORTANT**: Never commit the service role key to version control!

## Step 4: Apply Database Migrations

You have two options to apply the migrations:

### Option A: Using Supabase Dashboard (Recommended for First Time)

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Apply migrations in order:

#### Migration 1: Initial Schema

1. Open `supabase/migrations/20240101000000_initial_schema.sql`
2. Copy the entire contents
3. Paste into the SQL Editor
4. Click **Run** (or press Ctrl+Enter)
5. Wait for "Success. No rows returned" message

#### Migration 2: RLS Policies

1. Open `supabase/migrations/20240101000001_rls_policies.sql`
2. Copy the entire contents
3. Paste into the SQL Editor
4. Click **Run**
5. Wait for success message

#### Migration 3: Functions and Triggers

1. Open `supabase/migrations/20240101000002_functions_and_triggers.sql`
2. Copy the entire contents
3. Paste into the SQL Editor
4. Click **Run**
5. Wait for success message

### Option B: Using Supabase CLI (Advanced)

If you prefer using the CLI:

#### 4.1 Install Supabase CLI

```bash
npm install -g supabase
```

#### 4.2 Link to Your Project

```bash
supabase link --project-ref your-project-ref
```

You can find your project ref in the Project Settings → General → Reference ID

#### 4.3 Push Migrations

```bash
supabase db push
```

This will apply all migrations in the `supabase/migrations/` directory.

## Step 5: Verify Database Setup

### 5.1 Check Tables in Supabase Dashboard

1. Go to **Table Editor** in the left sidebar
2. You should see all 12 tables:
   - ✅ users
   - ✅ categories
   - ✅ books
   - ✅ listings
   - ✅ orders
   - ✅ payments
   - ✅ shipping
   - ✅ reviews
   - ✅ wishlist
   - ✅ moderation_logs
   - ✅ platform_stats
   - ✅ ai_scans

### 5.2 Verify RLS Policies

1. Click on any table (e.g., `listings`)
2. Click the **Policies** tab
3. You should see multiple RLS policies listed

### 5.3 Verify Functions and Triggers

1. Go to **Database** → **Functions** in the left sidebar
2. You should see functions like:
   - `calculate_environmental_impact`
   - `calculate_listing_pricing`
   - `get_condition_multiplier`
   - `update_user_eco_impact`
   - And many more...

3. Go to **Database** → **Triggers**
4. You should see triggers like:
   - `update_users_updated_at`
   - `calculate_pricing_on_listing_change`
   - `update_eco_impact_on_delivery`
   - And more...

## Step 6: Test Database Connection from Next.js

### 6.1 Run the Verification Script

From the project root, run:

```bash
cd frontend
npm install
npm run dev
```

### 6.2 Test Supabase Connection

Open your browser and go to `http://localhost:3000`

The app should load without Supabase connection errors.

### 6.3 Run Backend Tests (Optional)

```bash
cd backend
npm install
npm test
```

The unique ID assignment property test should pass, confirming database connectivity.

## Step 7: Seed Initial Data (Optional)

To populate the database with sample categories:

1. Go to **SQL Editor** in Supabase Dashboard
2. Open `supabase/seeds/20240101000000_seed_categories.sql`
3. Copy and paste the contents
4. Click **Run**

This will create sample categories for:
- School books (CBSE, ICSE, State Boards)
- Competitive exams (JEE, NEET, UPSC)
- College textbooks (Engineering, Medical, Commerce)
- General reading

## Troubleshooting

### Issue: "relation does not exist" error

**Solution**: Make sure you applied migrations in the correct order:
1. Initial schema first
2. RLS policies second
3. Functions and triggers third

### Issue: "permission denied" error

**Solution**: Check that:
- You're using the correct API keys
- RLS policies are enabled
- You're authenticated when required

### Issue: Connection timeout

**Solution**: 
- Check your internet connection
- Verify the Supabase URL is correct
- Ensure your Supabase project is active (not paused)

### Issue: Migrations fail with syntax errors

**Solution**:
- Make sure you're copying the entire migration file
- Check that you're not missing any semicolons
- Try running migrations one at a time

## Next Steps

After completing this guide:

✅ Task 2.4 is complete!

You can now proceed to:
- **Task 3**: Configure Supabase Auth with OAuth providers
- **Task 4**: Set up Supabase Storage for images
- **Task 5**: Set up Meilisearch for search

## Security Reminders

🔒 **Never commit these to version control**:
- Service role keys
- Database passwords
- Production API keys

✅ **Safe to commit**:
- `.env.example` files with placeholder values
- Migration files
- Public/anon keys (these are meant to be public)

## Support

If you encounter issues:
1. Check the [Supabase Documentation](https://supabase.com/docs)
2. Review the migration files in `supabase/migrations/`
3. Check the Supabase Dashboard logs
4. Verify your environment variables are correct

---

**Estimated Time**: 15-20 minutes for first-time setup
