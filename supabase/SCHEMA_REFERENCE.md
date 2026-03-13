# Database Schema Quick Reference

## Table Relationships

```
auth.users (Supabase)
    ↓ (extends)
users
    ↓ (seller_id)
listings ← books
    ↓ (listing_id)
orders
    ├→ payments
    ├→ shipping
    └→ reviews

users
    ├→ wishlist ← books
    └→ moderation_logs (admin_id)

categories (hierarchical)
    ↓ (parent_id)
categories

books
    ↓ (category_id)
categories

listings
    ↓ (listing_id)
ai_scans
```

## Table Columns Reference

### users
```sql
id                  UUID PRIMARY KEY (references auth.users)
oauth_provider      TEXT (google|apple|microsoft)
oauth_provider_id   TEXT UNIQUE
email               TEXT UNIQUE
name                TEXT
profile_picture     TEXT
role                TEXT (buyer|seller|admin)
city, state, pincode, latitude, longitude
rating              DECIMAL(3,2) [0.0-5.0]
total_transactions  INTEGER
is_active           BOOLEAN
suspended_until     TIMESTAMP
listing_limit       INTEGER (-1 = unlimited)
books_sold, books_bought, trees_saved, water_saved_liters, co2_reduced_kg
created_at, updated_at
```

### categories
```sql
id          UUID PRIMARY KEY
name        TEXT
type        TEXT (school|competitive_exam|college|general)
parent_id   UUID (self-reference)
metadata    JSONB (type-specific fields)
created_at, updated_at
```

### books
```sql
id                UUID PRIMARY KEY
isbn              TEXT UNIQUE
title             TEXT
author            TEXT
publisher         TEXT
edition           TEXT
publication_year  INTEGER
category_id       UUID → categories
subject           TEXT
description       TEXT
cover_image       TEXT
created_at, updated_at
```

### listings
```sql
id                    UUID PRIMARY KEY
book_id               UUID → books
seller_id             UUID → users
original_price        DECIMAL(10,2)
condition_score       INTEGER [1-5]
suggested_price       DECIMAL(10,2)
final_price           DECIMAL(10,2)
delivery_cost         DECIMAL(10,2)
platform_commission   DECIMAL(10,2)
payment_fees          DECIMAL(10,2)
seller_payout         DECIMAL(10,2)
condition_details     JSONB
status                TEXT (pending_approval|active|sold|rejected|rescan_required|inactive)
rejection_reason      TEXT
approved_at           TIMESTAMP
approved_by           UUID → users
images                TEXT[] [1-10 items]
city, state, pincode, latitude, longitude
views                 INTEGER
is_featured           BOOLEAN
created_at, updated_at
```

### orders
```sql
id                    UUID PRIMARY KEY
listing_id            UUID UNIQUE → listings
buyer_id              UUID → users
seller_id             UUID → users
book_id               UUID → books
price                 DECIMAL(10,2)
delivery_cost         DECIMAL(10,2)
platform_commission   DECIMAL(10,2)
payment_fees          DECIMAL(10,2)
seller_payout         DECIMAL(10,2)
status                TEXT (pending_payment|paid|shipped|delivered|cancelled)
delivery_address      JSONB
pickup_address        JSONB
tracking_id           TEXT UNIQUE
payment_id            TEXT
payment_status        TEXT (pending|completed|failed|refunded)
created_at, updated_at, paid_at, shipped_at, delivered_at, cancelled_at
```

### payments
```sql
id                  UUID PRIMARY KEY
order_id            UUID → orders
payment_intent_id   TEXT UNIQUE
amount              DECIMAL(10,2)
currency            TEXT (default: INR)
payment_method      TEXT
payment_gateway     TEXT (stripe|razorpay)
status              TEXT (pending|processing|completed|failed|refunded)
gateway_fees        DECIMAL(10,2)
refund_amount       DECIMAL(10,2)
refund_reason       TEXT
created_at, updated_at, completed_at, refunded_at
```

### shipping
```sql
id                      UUID PRIMARY KEY
order_id                UUID UNIQUE → orders
tracking_id             TEXT UNIQUE
courier_name            TEXT
courier_service         TEXT
shipping_label_url      TEXT
weight_kg               DECIMAL(5,2)
dimensions              JSONB {length_cm, width_cm, height_cm}
pickup_scheduled_at     TIMESTAMP
picked_up_at            TIMESTAMP
in_transit_at           TIMESTAMP
out_for_delivery_at     TIMESTAMP
delivered_at            TIMESTAMP
delivery_attempts       INTEGER
current_location        TEXT
estimated_delivery      TIMESTAMP
actual_delivery         TIMESTAMP
created_at, updated_at
```

### reviews
```sql
id            UUID PRIMARY KEY
order_id      UUID UNIQUE → orders
reviewer_id   UUID → users
reviewee_id   UUID → users
rating        INTEGER [1-5]
comment       TEXT [1-500 chars]
created_at, updated_at
```

### wishlist
```sql
id          UUID PRIMARY KEY
user_id     UUID → users
book_id     UUID → books
created_at
UNIQUE(user_id, book_id)
```

### moderation_logs
```sql
id           UUID PRIMARY KEY
admin_id     UUID → users
action       TEXT (approve|reject|request_rescan|suspend_user|warn_seller|limit_listings)
target_type  TEXT (listing|user|order)
target_id    UUID
reason       TEXT
notes        TEXT
created_at
```

### platform_stats
```sql
id                          UUID PRIMARY KEY
date                        DATE UNIQUE
total_books_listed          INTEGER
total_books_sold            INTEGER
active_listings             INTEGER
total_users                 INTEGER
total_buyers                INTEGER
total_sellers               INTEGER
revenue_generated           DECIMAL(12,2)
platform_commission_earned  DECIMAL(12,2)
trees_saved                 DECIMAL(10,2)
water_saved_liters          DECIMAL(10,2)
co2_reduced_kg              DECIMAL(10,2)
created_at, updated_at
```

### ai_scans
```sql
id                  UUID PRIMARY KEY
listing_id          UUID → listings
images              TEXT[]
detected_isbn       TEXT
fetched_metadata    JSONB
condition_analysis  JSONB
scan_status         TEXT (in_progress|completed|failed)
progress_percentage INTEGER [0-100]
error_message       TEXT
created_at, completed_at
```

## Common Queries

### Get Active Listings with Book Details
```sql
SELECT l.*, b.title, b.author, b.isbn, u.name as seller_name
FROM listings l
JOIN books b ON l.book_id = b.id
JOIN users u ON l.seller_id = u.id
WHERE l.status = 'active'
ORDER BY l.created_at DESC;
```

### Get User's Orders with Tracking
```sql
SELECT o.*, s.tracking_id, s.courier_name, l.images[1] as cover_image, b.title
FROM orders o
JOIN listings l ON o.listing_id = l.id
JOIN books b ON l.book_id = b.id
LEFT JOIN shipping s ON o.id = s.order_id
WHERE o.buyer_id = 'user-uuid'
ORDER BY o.created_at DESC;
```

### Get Seller's Listings by Status
```sql
SELECT l.*, b.title, b.author
FROM listings l
JOIN books b ON l.book_id = b.id
WHERE l.seller_id = 'seller-uuid'
  AND l.status = 'active'
ORDER BY l.created_at DESC;
```

### Get Pending Listings for Admin
```sql
SELECT l.*, b.title, b.author, u.name as seller_name, u.email as seller_email
FROM listings l
JOIN books b ON l.book_id = b.id
JOIN users u ON l.seller_id = u.id
WHERE l.status = 'pending_approval'
ORDER BY l.created_at ASC;
```

### Get User's Environmental Impact
```sql
SELECT 
  name,
  books_sold,
  books_bought,
  trees_saved,
  water_saved_liters,
  co2_reduced_kg
FROM users
WHERE id = 'user-uuid';
```

### Get Platform Statistics for Date Range
```sql
SELECT * FROM get_platform_stats_summary('2024-01-01', '2024-12-31');
```

### Get Nearby Listings
```sql
SELECT * FROM get_nearby_listings(
  28.6139,  -- user latitude
  77.2090,  -- user longitude
  50,       -- max distance in km
  20        -- limit
);
```

### Calculate Pricing for Listing
```sql
SELECT * FROM calculate_listing_pricing(
  500.00,  -- original price
  4,       -- condition score
  50.00    -- delivery cost
);
```

## Indexes

### Performance-Critical Indexes
- `idx_listings_status` - Fast filtering by listing status
- `idx_listings_location` - Location-based searches
- `idx_orders_buyer_id` - User order history
- `idx_orders_seller_id` - Seller order management
- `idx_books_isbn` - ISBN lookups
- `idx_users_email` - User authentication

### Search Optimization
- `idx_books_title` - Book title searches
- `idx_books_author` - Author searches
- `idx_listings_condition_score` - Condition filtering
- `idx_listings_final_price` - Price range filtering

## Constraints

### Unique Constraints
- `users.email` - One account per email
- `users.(oauth_provider, oauth_provider_id)` - One account per OAuth identity
- `books.isbn` - One book record per ISBN
- `orders.listing_id` - One order per listing
- `orders.tracking_id` - Unique tracking IDs
- `reviews.order_id` - One review per order
- `wishlist.(user_id, book_id)` - One wishlist entry per user-book pair
- `platform_stats.date` - One stats record per day

### Check Constraints
- `users.rating` - Between 0.0 and 5.0
- `users.pincode` - 6-digit format
- `listings.condition_score` - Between 1 and 5
- `listings.images` - Array length 1-10
- `reviews.rating` - Between 1 and 5
- `reviews.comment` - Length 1-500 characters

### Foreign Key Constraints
All foreign keys use appropriate ON DELETE actions:
- `CASCADE` - Delete dependent records (e.g., user deletion cascades to listings)
- `RESTRICT` - Prevent deletion if referenced (e.g., can't delete book with orders)
- `SET NULL` - Set to null on deletion (e.g., approved_by when admin deleted)

## RLS Policy Summary

### Public Access
- Categories (read-only)
- Books (read-only)
- Active listings (read-only)
- Reviews (read-only)
- Platform stats (read-only)

### User Access
- Own profile (read/update)
- Own listings (create/read/update/delete)
- Own orders (create/read/update)
- Own wishlist (create/read/delete)
- Own reviews (create/read/update/delete)

### Admin Access
- All listings (read/update for moderation)
- All orders (read/update for dispute resolution)
- All users (read/update for management)
- Moderation logs (create/read)
- Platform stats (create/read/update)

### Service Role Access
- Payments (create/update via payment gateway)
- Shipping (create/update via shipping API)
- AI scans (create/update via AI service)

## Triggers

### Automated Updates
- `updated_at` - Auto-update on all table modifications
- `auto_calculate_listing_pricing` - Calculate pricing on listing changes
- `copy_seller_location_to_listing` - Copy location on listing creation
- `validate_listing_status` - Enforce valid status transitions
- `validate_order_creation` - Ensure listing availability and atomicity
- `update_user_transaction_counts` - Increment counts on order delivery
- `update_user_eco_impact` - Calculate environmental impact
- `update_user_rating` - Recalculate rating on review changes
- `validate_payment_status` - Enforce valid payment transitions

## Functions Reference

### Pricing Functions
```sql
get_condition_multiplier(score INTEGER) → DECIMAL(4,2)
calculate_listing_pricing(original_price, condition_score, delivery_cost) → TABLE
```

### Environmental Functions
```sql
calculate_environmental_impact(books_count INTEGER) → TABLE
```

### Validation Functions
```sql
is_admin() → BOOLEAN
is_user_suspended(user_uuid UUID) → BOOLEAN
check_listing_limit(seller_uuid UUID) → BOOLEAN
can_user_create_listing(user_uuid UUID) → BOOLEAN
```

### Utility Functions
```sql
calculate_distance(lat1, lon1, lat2, lon2) → DECIMAL(10,2)
get_nearby_listings(lat, lon, max_distance, limit) → TABLE
get_seller_active_listings_count(seller_uuid UUID) → INTEGER
get_platform_stats_summary(start_date, end_date) → TABLE
```

## Data Types

### JSONB Structures

#### condition_details
```json
{
  "cover_damage": 1-5,
  "page_quality": 1-5,
  "binding_quality": 1-5,
  "markings": 1-5,
  "discoloration": 1-5,
  "overall_notes": "string"
}
```

#### delivery_address / pickup_address
```json
{
  "name": "string",
  "phone": "string",
  "address_line1": "string",
  "address_line2": "string",
  "city": "string",
  "state": "string",
  "pincode": "string",
  "landmark": "string"
}
```

#### dimensions
```json
{
  "length_cm": number,
  "width_cm": number,
  "height_cm": number
}
```

#### category metadata (type-specific)
```json
// School
{
  "board": "CBSE|ICSE|State",
  "class_level": 1-12
}

// Competitive Exam
{
  "exam_type": "JEE|NEET|UPSC|..."
}

// College
{
  "stream": "Engineering|Medical|...",
  "year_semester": "string"
}

// General
{
  "genre": "Fiction|Non-fiction|..."
}
```

#### fetched_metadata
```json
{
  "title": "string",
  "author": "string",
  "publisher": "string",
  "edition": "string",
  "publication_year": number,
  "isbn": "string",
  "cover_image": "url"
}
```

#### condition_analysis
```json
{
  "cover_damage": 1-5,
  "page_quality": 1-5,
  "binding_quality": 1-5,
  "markings": 1-5,
  "discoloration": 1-5,
  "overall_score": 1-5,
  "confidence": 0.0-1.0,
  "notes": "string"
}
```
