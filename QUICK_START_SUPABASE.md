# Quick Start: Supabase Setup (Task 2.4)

## 🚀 Quick Steps

### 1. Create Supabase Project (5 min)
```
1. Go to: https://app.supabase.com
2. Click "New Project"
3. Fill in details and wait for provisioning
4. Go to Settings → API
5. Copy Project URL and anon key
```

### 2. Configure Environment (2 min)
Edit `frontend/.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

### 3. Apply Migrations (5 min)
In Supabase Dashboard → SQL Editor:

**Run Migration 1:**
```sql
-- Copy/paste: supabase/migrations/20240101000000_initial_schema.sql
-- Click Run
```

**Run Migration 2:**
```sql
-- Copy/paste: supabase/migrations/20240101000001_rls_policies.sql
-- Click Run
```

**Run Migration 3:**
```sql
-- Copy/paste: supabase/migrations/20240101000002_functions_and_triggers.sql
-- Click Run
```

### 4. Verify Setup (3 min)
```bash
npm install
npm run verify:supabase
```

## ✅ Success Criteria

You should see:
- ✅ 12 tables in Table Editor
- ✅ RLS policies on each table
- ✅ Functions in Database → Functions
- ✅ Triggers in Database → Triggers
- ✅ Verification script passes all checks

## 📚 Detailed Guides

- **Full Guide**: `SUPABASE_MIGRATION_GUIDE.md`
- **Task Instructions**: `TASK_2.4_INSTRUCTIONS.md`
- **Schema Reference**: `supabase/SCHEMA_REFERENCE.md`

## 🆘 Quick Troubleshooting

**"relation does not exist"**
→ Apply migrations in order (1, 2, 3)

**"permission denied"**
→ Check API keys in `.env.local`

**Connection timeout**
→ Verify Supabase URL is correct

**Verification fails**
→ Check all migrations applied successfully

## 📞 Need Help?

1. Check `SUPABASE_MIGRATION_GUIDE.md`
2. Review migration files in `supabase/migrations/`
3. Check Supabase Dashboard logs
4. Run `npm run verify:supabase` for diagnostics

---

**Total Time**: ~15 minutes
**Difficulty**: Easy
**Prerequisites**: Supabase account (free)
