-- Demo Admin Account Setup
-- This seed creates a demo admin user directly in the database.
-- The auth.users entry must be created via the seed script (scripts/seed-demo-data.ts)
-- or via Supabase Dashboard → Authentication → Users.
--
-- After creating the auth user with email admin@rebook.demo,
-- run this to ensure the public.users record has admin role.

-- Update existing demo admin to admin role (safe to run multiple times)
UPDATE public.users
SET role = 'admin'
WHERE email = 'admin@rebook.demo';

-- Create some pending listings for admin approval testing
-- These reference seller1@rebook.demo's user ID.
-- The seed script handles this dynamically; this SQL is a reference only.

-- Verify admin exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.users WHERE email = 'admin@rebook.demo' AND role = 'admin') THEN
    RAISE NOTICE 'Admin account verified: admin@rebook.demo (role=admin)';
  ELSE
    RAISE WARNING 'Admin account not found. Run: npm run seed:demo first.';
  END IF;
END $$;
