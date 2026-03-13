# Supabase Database Schema

This directory contains SQL migration files for the Second-Hand Academic Book Marketplace database schema.

## Overview

The database schema is designed for a Supabase PostgreSQL database and includes:

- **12 main tables** with comprehensive relationships
- **Row Level Security (RLS) policies** for all tables
- **Automated triggers** for business logic
- **Helper functions** for calculations and validations
- **Indexes** for optimized queries

## Migration Files

### 1. `20240101000000_initial_schema.sql`
Creates all database tables with:
- Users table (extends Supabase auth.users)
- Categories table (hierarchical structure)
- Books table (book metadata)
- Listings table (books for sale)
- Orders table (purchase transactions)
- Payments table (payment gateway integration)
- Shipping table (courier integration)
- Reviews table (buyer feedback)
- Wishlist table (saved books)
- Moderation logs table (admin actions audit)
- Platform stats table (daily aggregated statistics)
- AI scans table (AI scanner tracking)

### 2. `20240101000001_rls_policies.sql`
Sets up Row Level Security policies for:
- User profile access control
- Listing visibility and management
- Order access restrictions
- Payment and shipping data protection
- Review and wishlist privacy
- Admin-only access to moderation logs and stats

### 3. `20240101000002_functions_and_triggers.sql`
Implements business logic with:
- Environmental impact calculations
- Automated pricing calculations
- Listing status validation
- Order creation validation
- User rating updates
- Transaction count tracking
- Distance calculation for location-based features

## Database Schema

### Core Tables

#### Users
Extends Supabase `auth.users` with:
- OAuth provider information
- Location data (city, state, pincode, coordinates)
- User metrics (rating, total transactions)
- Admin controls (suspension, listing limits)
- Environmental impact tracking

#### Categories
Hierarchical category structure supporting:
- School books (K-12)
- Competitive exam materials (JEE, NEET, UPSC)
- College textbooks
- General reading materials

#### Books
Book metadata including:
- ISBN (unique identifier)
- Title, author, publisher, edition
- Category reference
- Cover image URL

#### Listings
Books for sale with:
- Pricing breakdown (original price, condition-based pricing, delivery cost, commission, fees)
- Condition score (1-5) with detailed analysis
- Status workflow (pending_approval → active → sold)
- Admin approval tracking
- Location data for proximity search
- Image gallery (4-10 images)

#### Orders
Purchase transactions with:
- Buyer and seller references
- Complete pricing breakdown
- Payment and shipping tracking
- Status workflow (pending_payment → paid → shipped → delivered)
- Delivery and pickup addresses

#### Payments
Payment gateway integration with:
- Payment intent tracking
- Gateway fees calculation
- Refund management
- Status tracking

#### Shipping
Courier integration with:
- Tracking ID and shipping label
- Package details (weight, dimensions)
- Delivery timeline tracking
- Current location updates

#### Reviews
Buyer feedback system with:
- Rating (1-5 stars)
- Comment (max 500 characters)
- One review per order constraint

#### Wishlist
Saved books with:
- User and book references
- Unique constraint per user-book pair

#### Moderation Logs
Admin action audit trail with:
- Action type (approve, reject, suspend, etc.)
- Target type and ID
- Reason and notes
- Timestamp tracking

#### Platform Stats
Daily aggregated statistics with:
- Book metrics (listed, sold, active)
- User metrics (total, buyers, sellers)
- Revenue metrics (generated, commission earned)
- Environmental impact (trees saved, water saved, CO₂ reduced)

#### AI Scans
AI scanner tracking with:
- Uploaded images
- Detected ISBN
- Fetched metadata
- Condition analysis
- Progress tracking

## Key Features

### 1. Automated Pricing Calculation
Listings automatically calculate:
- Base price = Original price × Condition multiplier
- Platform commission = Base price × 10%
- Payment fees = (Base price × 2.5%) + ₹3
- Final price = Base price + Delivery cost + Commission + Payment fees
- Seller payout = Base price - Commission

Condition multipliers:
- 5 (Like New): 80%
- 4 (Very Good): 70%
- 3 (Good): 60%
- 2 (Acceptable): 40%
- 1 (Poor): 25%

### 2. Environmental Impact Tracking
Automatically calculates:
- Trees saved = Books reused / 30
- Water saved = Books reused × 50 liters
- CO₂ reduced = Books reused × 2.5 kg

### 3. Listing Status Workflow
```
pending_approval → active (admin approval)
pending_approval → rejected (admin rejection)
pending_approval → rescan_required (admin request)
rescan_required → pending_approval (seller resubmission)
active → sold (order creation)
active → inactive (seller deactivation)
```

### 4. Order Status Workflow
```
pending_payment → paid (payment confirmation)
paid → shipped (shipping label generation)
shipped → delivered (delivery confirmation)
Any status → cancelled (cancellation)
```

### 5. Row Level Security
All tables have RLS policies ensuring:
- Users can only view/edit their own data
- Active listings are publicly visible
- Orders are visible only to buyer, seller, and admins
- Payment and shipping data is protected
- Admin actions require admin role

### 6. Concurrent Order Prevention
Database-level locking prevents multiple buyers from ordering the same listing:
- Row-level lock on listing during order creation
- Atomic status update from "active" to "sold"
- Subsequent order attempts fail with appropriate error

## Applying Migrations

### Using Supabase CLI

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Link to your Supabase project:
```bash
supabase link --project-ref your-project-ref
```

3. Apply migrations:
```bash
supabase db push
```

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste each migration file in order:
   - `20240101000000_initial_schema.sql`
   - `20240101000001_rls_policies.sql`
   - `20240101000002_functions_and_triggers.sql`
4. Execute each migration

### Manual Application

Connect to your PostgreSQL database and run:
```bash
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/20240101000000_initial_schema.sql
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/20240101000001_rls_policies.sql
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/20240101000002_functions_and_triggers.sql
```

## Database Indexes

The schema includes optimized indexes for:
- User lookups by email, role, location
- Book searches by ISBN, title, author, category
- Listing queries by status, location, price, condition
- Order queries by buyer, seller, status, date
- Review lookups by reviewee
- Moderation log filtering

## Helper Functions

### Pricing Functions
- `get_condition_multiplier(score)` - Returns multiplier for condition score
- `calculate_listing_pricing(...)` - Calculates complete pricing breakdown

### Environmental Functions
- `calculate_environmental_impact(books_count)` - Calculates eco metrics

### Validation Functions
- `can_user_create_listing(user_uuid)` - Checks if user can create listing
- `is_user_suspended(user_uuid)` - Checks suspension status
- `check_listing_limit(seller_uuid)` - Validates listing limit

### Utility Functions
- `calculate_distance(lat1, lon1, lat2, lon2)` - Haversine distance calculation
- `get_nearby_listings(lat, lon, max_distance, limit)` - Location-based search
- `get_platform_stats_summary(start_date, end_date)` - Aggregate statistics

## Security Considerations

1. **RLS Policies**: All tables have comprehensive RLS policies
2. **Service Role**: Some operations (payments, shipping) require service role
3. **Admin Verification**: Admin actions verify role before execution
4. **Suspension Checks**: User suspension is enforced at database level
5. **Listing Limits**: Enforced through database constraints and functions

## Performance Optimizations

1. **Indexes**: Strategic indexes on frequently queried columns
2. **JSONB**: Flexible metadata storage with GIN indexes
3. **Triggers**: Automated calculations reduce application logic
4. **Caching**: Platform stats cached with daily aggregation
5. **Location Queries**: Optimized with spatial indexes (PostGIS optional)

## Maintenance

### Regular Tasks
- Monitor platform_stats table growth
- Archive old moderation_logs periodically
- Vacuum and analyze tables regularly
- Review and optimize slow queries

### Backup Strategy
- Enable Supabase automatic backups
- Export critical data regularly
- Test restore procedures

## TypeScript Types

After applying migrations, generate TypeScript types:

```bash
npx supabase gen types typescript --project-id your-project-id > frontend/src/types/database.ts
```

## Support

For issues or questions:
1. Check Supabase documentation: https://supabase.com/docs
2. Review migration files for schema details
3. Test migrations in development environment first

## Version History

- **v1.0.0** (2024-01-01): Initial schema with all tables, RLS policies, and business logic
