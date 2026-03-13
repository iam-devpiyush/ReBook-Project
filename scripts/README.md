# Scripts Directory

This directory contains utility scripts for the Second-Hand Academic Book Marketplace project.

## Available Scripts

### verify-supabase-setup.ts

**Purpose**: Verifies that Supabase is properly configured and all migrations have been applied.

**Usage**:
```bash
npm run verify:supabase
```

**Related Task**: Task 2.4

---

### verify-oauth-setup.ts

**Purpose**: Verifies that OAuth providers (Google, Apple, Microsoft) are correctly configured in Supabase.

**Usage**:
```bash
npm run verify:oauth
```

**What it checks**:
- ✅ Environment variables are configured
- ✅ Supabase connection is working
- ✅ Redirect URL format is correct
- ✅ Database tables exist (users table)
- 📋 Manual verification checklist for OAuth providers

**When to run**:
- After configuring OAuth providers in Supabase dashboard (Task 3.1)
- Before testing OAuth sign-in flows
- When troubleshooting OAuth authentication issues

**Output**:
The script provides:
- Automated checks for environment and connection
- Manual verification checklist for OAuth providers
- Testing instructions for each provider
- Troubleshooting guidance

**Related Task**: Task 3.1

---

### verify-storage-setup.ts

**Purpose**: Verifies that Supabase Storage is properly configured for book images.

**Usage**:
```bash
npm run verify:storage
```

**What it checks**:
- ✅ Environment variables are configured
- ✅ Supabase client initialized
- ✅ Storage bucket 'book-images' exists
- ✅ Bucket is public (read-only)
- ✅ File size limit is 5MB
- ✅ Allowed MIME types: image/jpeg, image/png

**When to run**:
- After creating the book-images storage bucket (Task 4)
- After applying storage policies
- Before implementing image upload functionality
- When troubleshooting image upload issues

**Output**:
The script provides:
- Automated checks for bucket configuration
- Clear pass/fail indicators
- Configuration details
- Note about upload/delete tests requiring authentication

**Example output**:
```
🔍 Verifying Supabase Storage Setup...

✓ Environment variables configured
✓ Supabase client initialized
✓ Bucket 'book-images' exists
✓ Bucket is public
✓ File size limit is 5MB
✓ Allowed MIME types: image/jpeg, image/png

📝 Note: Upload/delete tests require authentication.
   These will be tested during actual usage.

==================================================

✅ All checks passed! (6/6)

Supabase Storage is properly configured.
```

**Related Task**: Task 4

---

### verify-supabase-setup.ts (continued)

**Purpose**: Verifies that Supabase is properly configured and all migrations have been applied.

**Related Task**: Task 2.4

**Usage**:
```bash
npm run verify:supabase
```

**What it checks**:
- ✅ Environment variables are configured
- ✅ Supabase connection is working
- ✅ All 12 database tables exist
- ✅ Row Level Security (RLS) policies are enabled
- ✅ Database functions are installed
- ✅ Basic CRUD operations work

**When to run**:
- After creating a Supabase project
- After applying database migrations
- After updating environment variables
- When troubleshooting database connection issues

**Output**:
The script provides colored terminal output:
- 🟢 Green checkmarks for successful checks
- 🔴 Red X marks for failures
- 🟡 Yellow warnings for potential issues
- 🔵 Blue info messages for guidance

**Example output**:
```
🔍 Verifying Supabase Setup for Task 2.4

Step 1: Checking environment variables...
✅ Environment variables are configured

Step 2: Testing Supabase connection...
✅ Successfully connected to Supabase

Step 3: Verifying database tables...
✅ Table 'users' exists
✅ Table 'categories' exists
...

✨ Supabase Setup Verification Complete!
```

## Requirements

The scripts require the following dependencies (installed automatically):
- `@supabase/supabase-js` - Supabase client library
- `dotenv` - Environment variable loading
- `ts-node` - TypeScript execution
- `typescript` - TypeScript compiler
- `@types/node` - Node.js type definitions

## Configuration

Scripts read environment variables from `frontend/.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key

## Adding New Scripts

To add a new script:

1. Create a new `.ts` file in this directory
2. Add a shebang at the top: `#!/usr/bin/env ts-node`
3. Add the script to `package.json` scripts section
4. Document it in this README

Example:
```typescript
#!/usr/bin/env ts-node

// Your script code here
console.log('Hello from my script!');
```

Then in `package.json`:
```json
{
  "scripts": {
    "my-script": "ts-node scripts/my-script.ts"
  }
}
```

## Troubleshooting

### "Cannot find module '@supabase/supabase-js'"

**Solution**: Run `npm install` in the project root

### "Environment variables not configured"

**Solution**: Update `frontend/.env.local` with your Supabase credentials

### "Connection failed"

**Solution**: 
1. Verify Supabase URL is correct
2. Check that your Supabase project is active
3. Ensure migrations have been applied

## Related Documentation

- `SUPABASE_MIGRATION_GUIDE.md` - How to set up Supabase
- `TASK_2.4_INSTRUCTIONS.md` - Task 2.4 completion guide
- `QUICK_START_SUPABASE.md` - Quick reference
