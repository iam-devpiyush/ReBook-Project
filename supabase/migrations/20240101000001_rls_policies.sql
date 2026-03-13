-- Row Level Security (RLS) Policies
-- This migration sets up comprehensive RLS policies for all tables

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_scans ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can view other users' public profiles (limited fields)
CREATE POLICY "Users can view public profiles"
  ON public.users FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Only admins can update user roles and admin controls
CREATE POLICY "Admins can update user admin controls"
  ON public.users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- New users can insert their profile (triggered by auth.users creation)
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- CATEGORIES TABLE POLICIES
-- ============================================================================

-- Everyone can view categories
CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT
  USING (true);

-- Only admins can manage categories
CREATE POLICY "Admins can insert categories"
  ON public.categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update categories"
  ON public.categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete categories"
  ON public.categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- BOOKS TABLE POLICIES
-- ============================================================================

-- Everyone can view books
CREATE POLICY "Anyone can view books"
  ON public.books FOR SELECT
  USING (true);

-- Authenticated users can create books (when creating listings)
CREATE POLICY "Authenticated users can insert books"
  ON public.books FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admins can update books
CREATE POLICY "Admins can update books"
  ON public.books FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- LISTINGS TABLE POLICIES
-- ============================================================================

-- Everyone can view active listings
CREATE POLICY "Anyone can view active listings"
  ON public.listings FOR SELECT
  USING (status = 'active' OR seller_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Sellers can create listings (if not suspended and within limit)
CREATE POLICY "Sellers can create listings"
  ON public.listings FOR INSERT
  WITH CHECK (
    auth.uid() = seller_id AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() 
        AND is_active = true
        AND (suspended_until IS NULL OR suspended_until < NOW())
        AND (
          listing_limit = -1 OR
          (SELECT COUNT(*) FROM public.listings WHERE seller_id = auth.uid() AND status IN ('active', 'pending_approval')) < listing_limit
        )
    )
  );

-- Sellers can update their own listings (if not sold)
CREATE POLICY "Sellers can update own listings"
  ON public.listings FOR UPDATE
  USING (
    auth.uid() = seller_id AND
    status IN ('pending_approval', 'active', 'rescan_required', 'rejected')
  )
  WITH CHECK (
    auth.uid() = seller_id AND
    status IN ('pending_approval', 'active', 'rescan_required', 'rejected')
  );

-- Admins can update any listing (for approval/rejection)
CREATE POLICY "Admins can update listings"
  ON public.listings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Sellers can delete their own listings (if not sold)
CREATE POLICY "Sellers can delete own listings"
  ON public.listings FOR DELETE
  USING (
    auth.uid() = seller_id AND
    status != 'sold'
  );

-- ============================================================================
-- ORDERS TABLE POLICIES
-- ============================================================================

-- Buyers and sellers can view their own orders
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (
    auth.uid() = buyer_id OR 
    auth.uid() = seller_id OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Buyers can create orders
CREATE POLICY "Buyers can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (
    auth.uid() = buyer_id AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() 
        AND is_active = true
        AND (suspended_until IS NULL OR suspended_until < NOW())
    )
  );

-- Orders can be updated by buyers, sellers, or admins (for status changes)
CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  USING (
    auth.uid() = buyer_id OR 
    auth.uid() = seller_id OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- PAYMENTS TABLE POLICIES
-- ============================================================================

-- Users can view payments for their orders
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = payments.order_id
        AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- System can insert payments (via service role)
CREATE POLICY "Service role can insert payments"
  ON public.payments FOR INSERT
  WITH CHECK (true);

-- System can update payments (via service role)
CREATE POLICY "Service role can update payments"
  ON public.payments FOR UPDATE
  USING (true);

-- ============================================================================
-- SHIPPING TABLE POLICIES
-- ============================================================================

-- Users can view shipping for their orders
CREATE POLICY "Users can view own shipping"
  ON public.shipping FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = shipping.order_id
        AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- System can insert shipping records (via service role)
CREATE POLICY "Service role can insert shipping"
  ON public.shipping FOR INSERT
  WITH CHECK (true);

-- System can update shipping records (via service role)
CREATE POLICY "Service role can update shipping"
  ON public.shipping FOR UPDATE
  USING (true);

-- ============================================================================
-- REVIEWS TABLE POLICIES
-- ============================================================================

-- Everyone can view reviews
CREATE POLICY "Anyone can view reviews"
  ON public.reviews FOR SELECT
  USING (true);

-- Buyers can create reviews for their delivered orders
CREATE POLICY "Buyers can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = reviews.order_id
        AND orders.buyer_id = auth.uid()
        AND orders.status = 'delivered'
    )
  );

-- Reviewers can update their own reviews
CREATE POLICY "Reviewers can update own reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

-- Reviewers can delete their own reviews
CREATE POLICY "Reviewers can delete own reviews"
  ON public.reviews FOR DELETE
  USING (auth.uid() = reviewer_id);

-- ============================================================================
-- WISHLIST TABLE POLICIES
-- ============================================================================

-- Users can view their own wishlist
CREATE POLICY "Users can view own wishlist"
  ON public.wishlist FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add to their wishlist
CREATE POLICY "Users can add to wishlist"
  ON public.wishlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove from their wishlist
CREATE POLICY "Users can remove from wishlist"
  ON public.wishlist FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- MODERATION_LOGS TABLE POLICIES
-- ============================================================================

-- Only admins can view moderation logs
CREATE POLICY "Admins can view moderation logs"
  ON public.moderation_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can create moderation logs
CREATE POLICY "Admins can create moderation logs"
  ON public.moderation_logs FOR INSERT
  WITH CHECK (
    auth.uid() = admin_id AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- PLATFORM_STATS TABLE POLICIES
-- ============================================================================

-- Everyone can view platform stats
CREATE POLICY "Anyone can view platform stats"
  ON public.platform_stats FOR SELECT
  USING (true);

-- Only admins can manage platform stats
CREATE POLICY "Admins can insert platform stats"
  ON public.platform_stats FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update platform stats"
  ON public.platform_stats FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- AI_SCANS TABLE POLICIES
-- ============================================================================

-- Users can view their own AI scans
CREATE POLICY "Users can view own ai scans"
  ON public.ai_scans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = ai_scans.listing_id
        AND listings.seller_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Authenticated users can create AI scans
CREATE POLICY "Users can create ai scans"
  ON public.ai_scans FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- System can update AI scans (via service role)
CREATE POLICY "Service role can update ai scans"
  ON public.ai_scans FOR UPDATE
  USING (true);

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is suspended
CREATE OR REPLACE FUNCTION is_user_suspended(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_uuid 
      AND (is_active = false OR (suspended_until IS NOT NULL AND suspended_until > NOW()))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check listing limit
CREATE OR REPLACE FUNCTION check_listing_limit(seller_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_limit INTEGER;
  current_count INTEGER;
BEGIN
  SELECT listing_limit INTO user_limit
  FROM public.users
  WHERE id = seller_uuid;
  
  IF user_limit = -1 THEN
    RETURN true;
  END IF;
  
  SELECT COUNT(*) INTO current_count
  FROM public.listings
  WHERE seller_id = seller_uuid 
    AND status IN ('active', 'pending_approval');
  
  RETURN current_count < user_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
