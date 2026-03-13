-- Business Logic Functions and Triggers
-- This migration adds helper functions and triggers for automated business logic

-- ============================================================================
-- ENVIRONMENTAL IMPACT CALCULATION FUNCTIONS
-- ============================================================================

-- Calculate environmental impact for a given number of books
CREATE OR REPLACE FUNCTION calculate_environmental_impact(books_count INTEGER)
RETURNS TABLE(
  trees_saved DECIMAL(10, 2),
  water_saved_liters DECIMAL(10, 2),
  co2_reduced_kg DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY SELECT
    ROUND((books_count::DECIMAL / 30.0)::NUMERIC, 2) AS trees_saved,
    ROUND((books_count::DECIMAL * 50.0)::NUMERIC, 2) AS water_saved_liters,
    ROUND((books_count::DECIMAL * 2.5)::NUMERIC, 2) AS co2_reduced_kg;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update user environmental impact when they sell or buy a book
CREATE OR REPLACE FUNCTION update_user_eco_impact()
RETURNS TRIGGER AS $$
DECLARE
  eco_impact RECORD;
BEGIN
  -- Update seller's eco impact
  SELECT * INTO eco_impact FROM calculate_environmental_impact(
    (SELECT books_sold FROM public.users WHERE id = NEW.seller_id)
  );
  
  UPDATE public.users
  SET 
    trees_saved = eco_impact.trees_saved,
    water_saved_liters = eco_impact.water_saved_liters,
    co2_reduced_kg = eco_impact.co2_reduced_kg
  WHERE id = NEW.seller_id;
  
  -- Update buyer's eco impact
  SELECT * INTO eco_impact FROM calculate_environmental_impact(
    (SELECT books_bought FROM public.users WHERE id = NEW.buyer_id)
  );
  
  UPDATE public.users
  SET 
    trees_saved = eco_impact.trees_saved,
    water_saved_liters = eco_impact.water_saved_liters,
    co2_reduced_kg = eco_impact.co2_reduced_kg
  WHERE id = NEW.buyer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update eco impact when order is delivered
CREATE TRIGGER update_eco_impact_on_delivery
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'delivered' AND OLD.status != 'delivered')
  EXECUTE FUNCTION update_user_eco_impact();

-- ============================================================================
-- PRICING CALCULATION FUNCTIONS
-- ============================================================================

-- Get condition multiplier based on condition score
CREATE OR REPLACE FUNCTION get_condition_multiplier(score INTEGER)
RETURNS DECIMAL(4, 2) AS $$
BEGIN
  RETURN CASE score
    WHEN 5 THEN 0.80  -- Like New
    WHEN 4 THEN 0.70  -- Very Good
    WHEN 3 THEN 0.60  -- Good
    WHEN 2 THEN 0.40  -- Acceptable
    WHEN 1 THEN 0.25  -- Poor
    ELSE 0.50
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate pricing breakdown for a listing
CREATE OR REPLACE FUNCTION calculate_listing_pricing(
  p_original_price DECIMAL(10, 2),
  p_condition_score INTEGER,
  p_delivery_cost DECIMAL(10, 2) DEFAULT 0.0
)
RETURNS TABLE(
  base_price DECIMAL(10, 2),
  platform_commission DECIMAL(10, 2),
  payment_fees DECIMAL(10, 2),
  final_price DECIMAL(10, 2),
  seller_payout DECIMAL(10, 2)
) AS $$
DECLARE
  v_multiplier DECIMAL(4, 2);
  v_base_price DECIMAL(10, 2);
  v_commission DECIMAL(10, 2);
  v_payment_fees DECIMAL(10, 2);
  v_final_price DECIMAL(10, 2);
  v_seller_payout DECIMAL(10, 2);
BEGIN
  -- Get condition multiplier
  v_multiplier := get_condition_multiplier(p_condition_score);
  
  -- Calculate base price
  v_base_price := ROUND((p_original_price * v_multiplier)::NUMERIC, 2);
  
  -- Calculate platform commission (10% of base price)
  v_commission := ROUND((v_base_price * 0.10)::NUMERIC, 2);
  
  -- Calculate payment fees (2.5% + ₹3)
  v_payment_fees := ROUND(((v_base_price * 0.025) + 3.00)::NUMERIC, 2);
  
  -- Calculate final price
  v_final_price := ROUND((v_base_price + p_delivery_cost + v_commission + v_payment_fees)::NUMERIC, 0);
  
  -- Calculate seller payout
  v_seller_payout := ROUND((v_base_price - v_commission)::NUMERIC, 2);
  
  RETURN QUERY SELECT
    v_base_price,
    v_commission,
    v_payment_fees,
    v_final_price,
    v_seller_payout;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Auto-calculate pricing when listing is created or updated
CREATE OR REPLACE FUNCTION auto_calculate_listing_pricing()
RETURNS TRIGGER AS $$
DECLARE
  pricing RECORD;
BEGIN
  -- Calculate pricing breakdown
  SELECT * INTO pricing FROM calculate_listing_pricing(
    NEW.original_price,
    NEW.condition_score,
    COALESCE(NEW.delivery_cost, 0.0)
  );
  
  -- Update listing with calculated values
  NEW.final_price := pricing.final_price;
  NEW.platform_commission := pricing.platform_commission;
  NEW.payment_fees := pricing.payment_fees;
  NEW.seller_payout := pricing.seller_payout;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate pricing on listing insert/update
CREATE TRIGGER calculate_pricing_on_listing_change
  BEFORE INSERT OR UPDATE OF original_price, condition_score, delivery_cost
  ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_listing_pricing();

-- ============================================================================
-- LISTING STATUS MANAGEMENT
-- ============================================================================

-- Prevent invalid listing status transitions
CREATE OR REPLACE FUNCTION validate_listing_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow any status on insert
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Validate status transitions
  IF OLD.status = 'sold' AND NEW.status != 'sold' THEN
    RAISE EXCEPTION 'Cannot change status of sold listing';
  END IF;
  
  IF OLD.status = 'pending_approval' AND NEW.status NOT IN ('active', 'rejected', 'rescan_required', 'pending_approval') THEN
    RAISE EXCEPTION 'Invalid status transition from pending_approval to %', NEW.status;
  END IF;
  
  IF OLD.status = 'active' AND NEW.status NOT IN ('sold', 'inactive', 'active') THEN
    RAISE EXCEPTION 'Invalid status transition from active to %', NEW.status;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate listing status transitions
CREATE TRIGGER validate_listing_status
  BEFORE UPDATE OF status ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION validate_listing_status_transition();

-- Copy seller location to listing on creation
CREATE OR REPLACE FUNCTION copy_seller_location_to_listing()
RETURNS TRIGGER AS $$
BEGIN
  SELECT city, state, pincode, latitude, longitude
  INTO NEW.city, NEW.state, NEW.pincode, NEW.latitude, NEW.longitude
  FROM public.users
  WHERE id = NEW.seller_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to copy location on listing creation
CREATE TRIGGER copy_location_on_listing_insert
  BEFORE INSERT ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION copy_seller_location_to_listing();

-- ============================================================================
-- ORDER MANAGEMENT
-- ============================================================================

-- Ensure listing is available before order creation
CREATE OR REPLACE FUNCTION validate_order_creation()
RETURNS TRIGGER AS $$
DECLARE
  listing_status TEXT;
BEGIN
  -- Check if listing exists and is active
  SELECT status INTO listing_status
  FROM public.listings
  WHERE id = NEW.listing_id
  FOR UPDATE; -- Lock the row to prevent concurrent orders
  
  IF listing_status IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;
  
  IF listing_status != 'active' THEN
    RAISE EXCEPTION 'Listing is not available for purchase';
  END IF;
  
  -- Update listing status to sold atomically
  UPDATE public.listings
  SET status = 'sold'
  WHERE id = NEW.listing_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate and update listing on order creation
CREATE TRIGGER validate_order_on_insert
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_creation();

-- Update user transaction counts when order is delivered
CREATE OR REPLACE FUNCTION update_user_transaction_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment seller's books_sold
  UPDATE public.users
  SET 
    books_sold = books_sold + 1,
    total_transactions = total_transactions + 1
  WHERE id = NEW.seller_id;
  
  -- Increment buyer's books_bought
  UPDATE public.users
  SET 
    books_bought = books_bought + 1,
    total_transactions = total_transactions + 1
  WHERE id = NEW.buyer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update transaction counts on order delivery
CREATE TRIGGER update_transaction_counts_on_delivery
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'delivered' AND OLD.status != 'delivered')
  EXECUTE FUNCTION update_user_transaction_counts();

-- ============================================================================
-- REVIEW MANAGEMENT
-- ============================================================================

-- Update user rating when review is created or updated
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating DECIMAL(3, 2);
BEGIN
  -- Calculate average rating for reviewee
  SELECT ROUND(AVG(rating)::NUMERIC, 2) INTO avg_rating
  FROM public.reviews
  WHERE reviewee_id = NEW.reviewee_id;
  
  -- Update user's rating
  UPDATE public.users
  SET rating = avg_rating
  WHERE id = NEW.reviewee_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update rating on review insert/update
CREATE TRIGGER update_rating_on_review_change
  AFTER INSERT OR UPDATE OF rating ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating();

-- Trigger to update rating on review delete
CREATE OR REPLACE FUNCTION update_user_rating_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating DECIMAL(3, 2);
BEGIN
  -- Calculate average rating for reviewee
  SELECT ROUND(AVG(rating)::NUMERIC, 2) INTO avg_rating
  FROM public.reviews
  WHERE reviewee_id = OLD.reviewee_id;
  
  -- Update user's rating (set to 0 if no reviews)
  UPDATE public.users
  SET rating = COALESCE(avg_rating, 0.0)
  WHERE id = OLD.reviewee_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rating_on_review_delete
  AFTER DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating_on_delete();

-- ============================================================================
-- PAYMENT STATUS VALIDATION
-- ============================================================================

-- Validate payment status transitions
CREATE OR REPLACE FUNCTION validate_payment_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Prevent invalid transitions
  IF OLD.status = 'refunded' THEN
    RAISE EXCEPTION 'Cannot change status of refunded payment';
  END IF;
  
  IF OLD.status = 'completed' AND NEW.status NOT IN ('completed', 'refunded') THEN
    RAISE EXCEPTION 'Completed payment can only be refunded';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate payment status transitions
CREATE TRIGGER validate_payment_status
  BEFORE UPDATE OF status ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION validate_payment_status_transition();

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to get active listings count for a seller
CREATE OR REPLACE FUNCTION get_seller_active_listings_count(seller_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  listing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO listing_count
  FROM public.listings
  WHERE seller_id = seller_uuid 
    AND status IN ('active', 'pending_approval');
  
  RETURN listing_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user can create listing
CREATE OR REPLACE FUNCTION can_user_create_listing(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_record RECORD;
  current_listings INTEGER;
BEGIN
  -- Get user details
  SELECT * INTO user_record
  FROM public.users
  WHERE id = user_uuid;
  
  -- Check if user exists
  IF user_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is active
  IF user_record.is_active = false THEN
    RETURN false;
  END IF;
  
  -- Check if user is suspended
  IF user_record.suspended_until IS NOT NULL AND user_record.suspended_until > NOW() THEN
    RETURN false;
  END IF;
  
  -- Check listing limit
  IF user_record.listing_limit != -1 THEN
    current_listings := get_seller_active_listings_count(user_uuid);
    IF current_listings >= user_record.listing_limit THEN
      RETURN false;
    END IF;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get platform statistics for a date range
CREATE OR REPLACE FUNCTION get_platform_stats_summary(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE(
  total_books_listed BIGINT,
  total_books_sold BIGINT,
  total_revenue DECIMAL(12, 2),
  total_commission DECIMAL(12, 2),
  total_trees_saved DECIMAL(10, 2),
  total_water_saved DECIMAL(10, 2),
  total_co2_reduced DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(ps.total_books_listed)::BIGINT,
    SUM(ps.total_books_sold)::BIGINT,
    SUM(ps.revenue_generated),
    SUM(ps.platform_commission_earned),
    SUM(ps.trees_saved),
    SUM(ps.water_saved_liters),
    SUM(ps.co2_reduced_kg)
  FROM public.platform_stats ps
  WHERE ps.date BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- SEARCH HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate distance between two coordinates (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DECIMAL(10, 8),
  lon1 DECIMAL(11, 8),
  lat2 DECIMAL(10, 8),
  lon2 DECIMAL(11, 8)
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  earth_radius CONSTANT DECIMAL := 6371; -- Earth radius in kilometers
  dlat DECIMAL;
  dlon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;
  
  dlat := RADIANS(lat2 - lat1);
  dlon := RADIANS(lon2 - lon1);
  
  a := SIN(dlat/2) * SIN(dlat/2) + 
       COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * 
       SIN(dlon/2) * SIN(dlon/2);
  
  c := 2 * ATAN2(SQRT(a), SQRT(1-a));
  
  RETURN ROUND((earth_radius * c)::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get nearby listings
CREATE OR REPLACE FUNCTION get_nearby_listings(
  user_lat DECIMAL(10, 8),
  user_lon DECIMAL(11, 8),
  max_distance_km DECIMAL DEFAULT 100,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE(
  listing_id UUID,
  distance_km DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    calculate_distance(user_lat, user_lon, l.latitude, l.longitude) AS distance
  FROM public.listings l
  WHERE l.status = 'active'
    AND l.latitude IS NOT NULL
    AND l.longitude IS NOT NULL
    AND calculate_distance(user_lat, user_lon, l.latitude, l.longitude) <= max_distance_km
  ORDER BY distance
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;
