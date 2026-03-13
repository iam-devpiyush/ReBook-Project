# Migration Guide

## Quick Start

### 1. Prerequisites
- Supabase project created
- Supabase CLI installed: `npm install -g supabase`
- Project credentials from Supabase dashboard

### 2. Apply Migrations

#### Option A: Using Supabase CLI (Recommended)
```bash
# Link to your project
supabase link --project-ref your-project-ref

# Apply all migrations
supabase db push
```

#### Option B: Using Supabase Dashboard
1. Open SQL Editor in Supabase dashboard
2. Run migrations in order:
   - `20240101000000_initial_schema.sql`
   - `20240101000001_rls_policies.sql`
   - `20240101000002_functions_and_triggers.sql`

### 3. Verify Installation
```sql
-- Check tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check RLS enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public';
```

### 4. Generate TypeScript Types
```bash
npx supabase gen types typescript --project-id your-project-id > frontend/src/types/database.ts
```

## Migration Details

### Migration 1: Initial Schema
Creates 12 tables with relationships, indexes, and constraints.

### Migration 2: RLS Policies
Enables Row Level Security on all tables with comprehensive access control.

### Migration 3: Functions & Triggers
Implements automated business logic for pricing, environmental impact, and validations.

## Post-Migration Steps

1. Create admin user in Supabase Auth
2. Update admin user role in users table
3. Seed initial categories
4. Configure storage buckets for images
5. Set up Supabase Realtime subscriptions

## Troubleshooting

### Common Issues
- **Permission denied**: Ensure you're using the service role key
- **Table already exists**: Drop existing tables or use a fresh database
- **RLS blocking queries**: Use service role for admin operations

For detailed schema reference, see `SCHEMA_REFERENCE.md`.
