-- Second-Hand Academic Book Marketplace - Initial Database Schema
-- This migration creates all tables, relationships, indexes, and RLS policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for location-based features (optional, for future geo queries)
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  oauth_provider TEXT NOT NULL CHECK (oauth_provider IN ('google', 'apple', 'microsoft')),
  oauth_provider_id TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  profile_picture TEXT,
  role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'admin')),
  
  -- Location fields
  city TEXT,
  state TEXT,
  pincode TEXT CHECK (pincode ~ '^\d{6}$'),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- User metrics
  rating DECIMAL(3, 2) DEFAULT 0.0 CHECK (rating >= 0.0 AND rating <= 5.0),
  total_transactions INTEGER DEFAULT 0 CHECK (total_transactions >= 0),
  
  -- Admin controls
  is_active BOOLEAN DEFAULT TRUE,
  suspended_until TIMESTAMP WITH TIME ZONE,
  listing_limit INTEGER DEFAULT -1, -- -1 means unlimited
  
  -- Environmental impact tracking
  books_sold INTEGER DEFAULT 0 CHECK (books_sold >= 0),
  books_bought INTEGER DEFAULT 0 CHECK (books_bought >= 0),
  trees_saved DECIMAL(10, 2) DEFAULT 0.0 CHECK (trees_saved >= 0),
  water_saved_liters DECIMAL(10, 2) DEFAULT 0.0 CHECK (water_saved_liters >= 0),
  co2_reduced_kg DECIMAL(10, 2) DEFAULT 0.0 CHECK (co2_reduced_kg >= 0),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_oauth_provider UNIQUE (oauth_provider, oauth_provider_id)
);

-- Index for location-based queries
CREATE INDEX idx_users_location ON public.users(city, state, pincode);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_email ON public.users(email);

-- ============================================================================
-- CATEGORIES TABLE (hierarchical structure)
-- ============================================================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('school', 'competitive_exam', 'college', 'general')),
  parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  
  -- Type-specific metadata (JSONB for flexibility)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for category queries
CREATE INDEX idx_categories_type ON public.categories(type);
CREATE INDEX idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX idx_categories_metadata ON public.categories USING GIN(metadata);

-- ============================================================================
-- BOOKS TABLE (book metadata)
-- ============================================================================
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  isbn TEXT UNIQUE,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  publisher TEXT,
  edition TEXT,
  publication_year INTEGER,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  subject TEXT,
  description TEXT,
  cover_image TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for book searches
CREATE INDEX idx_books_isbn ON public.books(isbn);
CREATE INDEX idx_books_title ON public.books(title);
CREATE INDEX idx_books_author ON public.books(author);
CREATE INDEX idx_books_category_id ON public.books(category_id);

-- ============================================================================
-- LISTINGS TABLE (books for sale)
-- ============================================================================
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Pricing fields
  original_price DECIMAL(10, 2) NOT NULL CHECK (original_price > 0),
  condition_score INTEGER NOT NULL CHECK (condition_score >= 1 AND condition_score <= 5),
  suggested_price DECIMAL(10, 2),
  final_price DECIMAL(10, 2),
  delivery_cost DECIMAL(10, 2),
  platform_commission DECIMAL(10, 2),
  payment_fees DECIMAL(10, 2),
  seller_payout DECIMAL(10, 2),
  
  -- Condition details (JSONB for structured data)
  condition_details JSONB DEFAULT '{}'::jsonb,
  
  -- Status and approval
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (
    status IN ('pending_approval', 'active', 'sold', 'rejected', 'rescan_required', 'inactive')
  ),
  rejection_reason TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Images (array of URLs)
  images TEXT[] NOT NULL CHECK (array_length(images, 1) >= 1 AND array_length(images, 1) <= 10),
  
  -- Location (copied from seller for performance)
  city TEXT,
  state TEXT,
  pincode TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Metrics
  views INTEGER DEFAULT 0 CHECK (views >= 0),
  is_featured BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for listing queries
CREATE INDEX idx_listings_seller_id ON public.listings(seller_id);
CREATE INDEX idx_listings_book_id ON public.listings(book_id);
CREATE INDEX idx_listings_status ON public.listings(status);
CREATE INDEX idx_listings_location ON public.listings(city, state, pincode);
CREATE INDEX idx_listings_condition_score ON public.listings(condition_score);
CREATE INDEX idx_listings_final_price ON public.listings(final_price);
CREATE INDEX idx_listings_created_at ON public.listings(created_at DESC);

-- ============================================================================
-- ORDERS TABLE (purchase transactions)
-- ============================================================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL UNIQUE REFERENCES public.listings(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE RESTRICT,
  
  -- Pricing breakdown
  price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
  delivery_cost DECIMAL(10, 2) NOT NULL CHECK (delivery_cost >= 0),
  platform_commission DECIMAL(10, 2) NOT NULL CHECK (platform_commission >= 0),
  payment_fees DECIMAL(10, 2) NOT NULL CHECK (payment_fees >= 0),
  seller_payout DECIMAL(10, 2) NOT NULL CHECK (seller_payout > 0),
  
  -- Order status
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (
    status IN ('pending_payment', 'paid', 'shipped', 'delivered', 'cancelled')
  ),
  
  -- Addresses (JSONB for structured data)
  delivery_address JSONB NOT NULL,
  pickup_address JSONB NOT NULL,
  
  -- Payment tracking
  tracking_id TEXT UNIQUE,
  payment_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'completed', 'failed', 'refunded')
  ),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for order queries
CREATE INDEX idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX idx_orders_listing_id ON public.orders(listing_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);

-- ============================================================================
-- PAYMENTS TABLE (payment gateway integration)
-- ============================================================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_intent_id TEXT UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_method TEXT,
  payment_gateway TEXT NOT NULL CHECK (payment_gateway IN ('stripe', 'razorpay')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'refunded')
  ),
  gateway_fees DECIMAL(10, 2) DEFAULT 0.0 CHECK (gateway_fees >= 0),
  
  -- Refund tracking
  refund_amount DECIMAL(10, 2),
  refund_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for payment queries
CREATE INDEX idx_payments_order_id ON public.payments(order_id);
CREATE INDEX idx_payments_payment_intent_id ON public.payments(payment_intent_id);
CREATE INDEX idx_payments_status ON public.payments(status);

-- ============================================================================
-- SHIPPING TABLE (courier integration)
-- ============================================================================
CREATE TABLE public.shipping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  tracking_id TEXT UNIQUE NOT NULL,
  courier_name TEXT NOT NULL,
  courier_service TEXT,
  shipping_label_url TEXT,
  
  -- Package details
  weight_kg DECIMAL(5, 2) CHECK (weight_kg > 0),
  dimensions JSONB, -- {length_cm, width_cm, height_cm}
  
  -- Tracking timestamps
  pickup_scheduled_at TIMESTAMP WITH TIME ZONE,
  picked_up_at TIMESTAMP WITH TIME ZONE,
  in_transit_at TIMESTAMP WITH TIME ZONE,
  out_for_delivery_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  
  -- Delivery details
  delivery_attempts INTEGER DEFAULT 0 CHECK (delivery_attempts >= 0),
  current_location TEXT,
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  actual_delivery TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for shipping queries
CREATE INDEX idx_shipping_order_id ON public.shipping(order_id);
CREATE INDEX idx_shipping_tracking_id ON public.shipping(tracking_id);

-- ============================================================================
-- REVIEWS TABLE (buyer feedback)
-- ============================================================================
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL CHECK (length(comment) > 0 AND length(comment) <= 500),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for review queries
CREATE INDEX idx_reviews_reviewee_id ON public.reviews(reviewee_id);
CREATE INDEX idx_reviews_reviewer_id ON public.reviews(reviewer_id);
CREATE INDEX idx_reviews_order_id ON public.reviews(order_id);

-- ============================================================================
-- WISHLIST TABLE (saved books)
-- ============================================================================
CREATE TABLE public.wishlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_wishlist_entry UNIQUE (user_id, book_id)
);

-- Indexes for wishlist queries
CREATE INDEX idx_wishlist_user_id ON public.wishlist(user_id);
CREATE INDEX idx_wishlist_book_id ON public.wishlist(book_id);

-- ============================================================================
-- MODERATION_LOGS TABLE (admin actions audit)
-- ============================================================================
CREATE TABLE public.moderation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (
    action IN ('approve', 'reject', 'request_rescan', 'suspend_user', 'warn_seller', 'limit_listings')
  ),
  target_type TEXT NOT NULL CHECK (target_type IN ('listing', 'user', 'order')),
  target_id UUID NOT NULL,
  reason TEXT,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for moderation log queries
CREATE INDEX idx_moderation_logs_admin_id ON public.moderation_logs(admin_id);
CREATE INDEX idx_moderation_logs_action ON public.moderation_logs(action);
CREATE INDEX idx_moderation_logs_target ON public.moderation_logs(target_type, target_id);
CREATE INDEX idx_moderation_logs_created_at ON public.moderation_logs(created_at DESC);

-- ============================================================================
-- PLATFORM_STATS TABLE (daily aggregated statistics)
-- ============================================================================
CREATE TABLE public.platform_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  
  -- Book metrics
  total_books_listed INTEGER DEFAULT 0 CHECK (total_books_listed >= 0),
  total_books_sold INTEGER DEFAULT 0 CHECK (total_books_sold >= 0),
  active_listings INTEGER DEFAULT 0 CHECK (active_listings >= 0),
  
  -- User metrics
  total_users INTEGER DEFAULT 0 CHECK (total_users >= 0),
  total_buyers INTEGER DEFAULT 0 CHECK (total_buyers >= 0),
  total_sellers INTEGER DEFAULT 0 CHECK (total_sellers >= 0),
  
  -- Revenue metrics
  revenue_generated DECIMAL(12, 2) DEFAULT 0.0 CHECK (revenue_generated >= 0),
  platform_commission_earned DECIMAL(12, 2) DEFAULT 0.0 CHECK (platform_commission_earned >= 0),
  
  -- Environmental impact
  trees_saved DECIMAL(10, 2) DEFAULT 0.0 CHECK (trees_saved >= 0),
  water_saved_liters DECIMAL(10, 2) DEFAULT 0.0 CHECK (water_saved_liters >= 0),
  co2_reduced_kg DECIMAL(10, 2) DEFAULT 0.0 CHECK (co2_reduced_kg >= 0),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for date-based queries
CREATE INDEX idx_platform_stats_date ON public.platform_stats(date DESC);

-- ============================================================================
-- AI_SCANS TABLE (AI scanner tracking)
-- ============================================================================
CREATE TABLE public.ai_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  
  -- Scan images
  images TEXT[] NOT NULL,
  
  -- Detection results
  detected_isbn TEXT,
  fetched_metadata JSONB,
  condition_analysis JSONB,
  
  -- Scan status
  scan_status TEXT NOT NULL DEFAULT 'in_progress' CHECK (
    scan_status IN ('in_progress', 'completed', 'failed')
  ),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for AI scan queries
CREATE INDEX idx_ai_scans_listing_id ON public.ai_scans(listing_id);
CREATE INDEX idx_ai_scans_scan_status ON public.ai_scans(scan_status);
CREATE INDEX idx_ai_scans_created_at ON public.ai_scans(created_at DESC);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipping_updated_at BEFORE UPDATE ON public.shipping
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_stats_updated_at BEFORE UPDATE ON public.platform_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
