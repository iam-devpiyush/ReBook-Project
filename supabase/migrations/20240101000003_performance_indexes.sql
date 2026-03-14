-- Performance Optimization: Additional Indexes
-- Requirements: 22.1-22.6
--
-- These indexes target the most common query patterns identified in the API routes:
--   - Active listings by status (search, browse)
--   - Listings by seller + status (seller portal)
--   - Orders by buyer/seller + status (order views)
--   - Moderation logs by date range (admin dashboard)
--   - Full-text search fallback on books

-- ============================================================================
-- LISTINGS: composite indexes for common filter combinations
-- ============================================================================

-- Active listings sorted by price (search results, browse)
CREATE INDEX IF NOT EXISTS idx_listings_status_price
  ON public.listings(status, final_price)
  WHERE status = 'active';

-- Active listings sorted by creation date (newest first)
CREATE INDEX IF NOT EXISTS idx_listings_status_created
  ON public.listings(status, created_at DESC)
  WHERE status = 'active';

-- Active listings by location (proximity search fallback)
CREATE INDEX IF NOT EXISTS idx_listings_status_location
  ON public.listings(status, city, state)
  WHERE status = 'active';

-- Seller portal: listings by seller + status
CREATE INDEX IF NOT EXISTS idx_listings_seller_status
  ON public.listings(seller_id, status);

-- Pending approval queue (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_listings_pending
  ON public.listings(created_at DESC)
  WHERE status = 'pending_approval';

-- ============================================================================
-- ORDERS: composite indexes for buyer/seller views
-- ============================================================================

-- Buyer order history sorted by date
CREATE INDEX IF NOT EXISTS idx_orders_buyer_status_date
  ON public.orders(buyer_id, status, created_at DESC);

-- Seller order history sorted by date
CREATE INDEX IF NOT EXISTS idx_orders_seller_status_date
  ON public.orders(seller_id, status, created_at DESC);

-- Revenue aggregation (admin stats — delivered orders)
CREATE INDEX IF NOT EXISTS idx_orders_delivered
  ON public.orders(created_at DESC)
  WHERE status = 'delivered';

-- ============================================================================
-- BOOKS: full-text search fallback (Meilisearch unavailable)
-- ============================================================================

-- GIN index for fast ILIKE / full-text on title and author
CREATE INDEX IF NOT EXISTS idx_books_title_gin
  ON public.books USING GIN(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(author, '')));

-- ============================================================================
-- MODERATION LOGS: date-range queries for admin audit
-- ============================================================================

-- Admin + date range (most common admin log filter)
CREATE INDEX IF NOT EXISTS idx_moderation_logs_admin_date
  ON public.moderation_logs(admin_id, created_at DESC);

-- ============================================================================
-- PLATFORM STATS: recent stats lookup
-- ============================================================================

-- Already has idx_platform_stats_date; add partial for recent 30 days
-- (no partial index needed — date DESC covers it)

-- ============================================================================
-- REVIEWS: average rating calculation
-- ============================================================================

-- Reviewee + rating for fast AVG computation
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_rating
  ON public.reviews(reviewee_id, rating);
