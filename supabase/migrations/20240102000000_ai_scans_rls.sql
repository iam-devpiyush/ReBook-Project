-- AI Scans RLS Policies
-- Adds user_id to ai_scans and enforces row-level security so that:
--   - Sellers can only SELECT/INSERT/UPDATE their own rows (user_id = auth.uid())
--   - Admins can SELECT all rows
--   - Unauthenticated requests are blocked at the API layer by requireAuth (HTTP 401)
--   - Cross-user access is blocked by RLS at the DB level (HTTP 403 via PostgREST)
--
-- Requirements: 9.2, 9.3, 9.4

-- ============================================================================
-- ADD user_id COLUMN TO ai_scans
-- ============================================================================
ALTER TABLE public.ai_scans
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_ai_scans_user_id ON public.ai_scans(user_id);

-- ============================================================================
-- DROP OLD INSUFFICIENT POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own ai scans" ON public.ai_scans;
DROP POLICY IF EXISTS "Users can create ai scans" ON public.ai_scans;
DROP POLICY IF EXISTS "Service role can update ai scans" ON public.ai_scans;

-- ============================================================================
-- SELLER POLICIES: own rows only (SELECT / INSERT / UPDATE)
-- ============================================================================

-- Sellers can SELECT their own scans (Requirement 9.2, 9.4)
CREATE POLICY "Sellers can select own ai scans"
  ON public.ai_scans FOR SELECT
  USING (user_id = auth.uid());

-- Sellers can INSERT scans for themselves (Requirement 9.2)
CREATE POLICY "Sellers can insert own ai scans"
  ON public.ai_scans FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Sellers can UPDATE their own scans (e.g. progress updates) (Requirement 9.2)
CREATE POLICY "Sellers can update own ai scans"
  ON public.ai_scans FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- ADMIN POLICY: SELECT all rows
-- ============================================================================

-- Admins can SELECT all ai_scans (Requirement 9.2)
CREATE POLICY "Admins can select all ai scans"
  ON public.ai_scans FOR SELECT
  USING (is_admin());
