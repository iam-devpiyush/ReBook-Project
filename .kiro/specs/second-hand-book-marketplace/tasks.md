# Implementation Tasks: Second-Hand Academic Book Marketplace

## Overview

This implementation plan breaks down the Second-Hand Academic Book Marketplace into discrete coding tasks following a production-ready approach. The platform is a full-stack TypeScript application using Next.js for the frontend, Supabase as the primary backend infrastructure (PostgreSQL database, OAuth authentication, file storage, real-time subscriptions), Meilisearch for search, and integrations with payment gateways (Stripe/Razorpay) and shipping APIs (Delhivery/Shiprocket).

The implementation focuses on building a complete marketplace with admin moderation, AI-powered book scanning with ISBN detection, enhanced pricing with real-time delivery costs, secure payment processing, shipping integration, environmental impact tracking, and comprehensive analytics.

## Technology Stack

- **Frontend**: Next.js 14.x with TypeScript, Tailwind CSS
- **Backend Infrastructure**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Database**: Supabase PostgreSQL with Supabase JavaScript client
- **Search**: Meilisearch 1.5.x
- **Authentication**: Supabase Auth with OAuth 2.0 (Google, Apple, Microsoft)
- **Real-time**: Supabase Realtime subscriptions
- **Storage**: Supabase Storage for images
- **Business Logic**: Next.js API routes or Supabase Edge Functions
- **Payment**: Stripe or Razorpay SDK
- **Shipping**: Delhivery or Shiprocket API

## Tasks

### Phase 1: Foundation and Supabase Setup

- [x] 1. Initialize project structure and dependencies
  - Create Next.js project with TypeScript and Tailwind CSS
  - Configure tsconfig.json with strict type checking
  - Set up package.json scripts for development and build
  - Install core dependencies: @supabase/supabase-js, @supabase/auth-helpers-nextjs, react-query, zustand, axios, react-hook-form, zod
  - Install dev dependencies: @types/node, @types/react, eslint, prettier
  - _Requirements: Foundation for all subsequent tasks_

- [x] 2. Set up Supabase project and database schema
  - [x] 2.1 Initialize Supabase project
    - Create Supabase project via dashboard or CLI
    - Configure environment variables (.env.local) with Supabase URL and anon key
    - Install Supabase CLI for local development
    - Initialize Supabase client in Next.js app
    - _Requirements: 20.1_

  - [x] 2.2 Define database schema with SQL migrations
    - Create users table with OAuth fields, location, eco_impact (extends Supabase auth.users)
    - Create books table with ISBN, metadata fields
    - Create categories table with hierarchical structure
    - Create listings table with condition details, pricing fields, approval fields
    - Create orders table with payment and shipping fields
    - Create payments table with gateway integration fields
    - Create shipping table with tracking and courier fields
    - Create reviews, wishlist, moderation_logs, platform_stats, ai_scans tables
    - Define all relationships, indexes, and constraints
    - Set up Row Level Security (RLS) policies for all tables
    - _Requirements: All data model requirements_

  - [x] 2.3 Write property test for unique ID assignment
    - **Property: Unique ID Assignment**
    - **Validates: Requirements 20.1**

  - [x] 2.4 Run Supabase migrations
    - Apply migrations to Supabase database
    - Verify all tables and RLS policies are created
    - Test database connection from Next.js app
    - _Requirements: 20.1_

- [x] 3. Configure Supabase Auth with OAuth providers
  - [x] 3.1 Set up OAuth providers in Supabase dashboard
    - Configure Google OAuth provider with client ID and secret
    - Configure Apple OAuth provider with credentials
    - Configure Microsoft OAuth provider with credentials
    - Set up redirect URLs for each provider
    - Configure email templates for auth flows
    - _Requirements: 1.1, 1.2_

  - [x] 3.2 Write unit tests for auth configuration
    - Test OAuth redirect URLs are correct
    - Test session token validation
    - Test auth state management
    - _Requirements: 1.1-1.9_

- [x] 4. Set up Supabase Storage for images
  - Create storage bucket for book images (book-images)
  - Configure bucket policies for public read access
  - Set up upload policies requiring authentication
  - Configure image size limits (5MB max)
  - Set up automatic image optimization if available
  - _Requirements: 2.4, 21.1-21.7_

- [x] 5. Set up Meilisearch for search
  - [x] 5.1 Install and configure Meilisearch client
    - Install meilisearch SDK
    - Configure connection to Meilisearch instance
    - Create search index for listings
    - _Requirements: 5.1-5.11_

  - [x] 5.2 Configure search index settings
    - Set searchable attributes: title, author, subject, isbn
    - Set filterable attributes: category_id, condition_score, status, location
    - Set sortable attributes: final_price, created_at, condition_score
    - Configure typo tolerance and ranking rules
    - _Requirements: 5.1, 5.2_

- [x] 6. Checkpoint - Verify foundation setup
  - Ensure Next.js app starts without errors
  - Verify Supabase connection is successful
  - Verify Supabase Auth is configured
  - Verify Supabase Storage is accessible
  - Verify Meilisearch connection is successful
  - Confirm all TypeScript types compile without errors
  - Test that environment variables are loaded correctly

### Phase 2: Supabase Authentication and User Management

- [x] 7. Implement Supabase Auth integration
  - [x] 7.1 Create authentication utilities
    - Set up Supabase Auth helpers for Next.js
    - Create server-side auth utilities for API routes
    - Create client-side auth utilities for components
    - Configure auth state management with Supabase listeners
    - _Requirements: 1.1, 1.2_

  - [x] 7.2 Implement OAuth sign-in flows
    - Create sign-in functions for Google OAuth
    - Create sign-in functions for Apple OAuth
    - Create sign-in functions for Microsoft OAuth
    - Handle OAuth callbacks and redirects
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 7.3 Implement user profile management
    - Create function to sync OAuth profile to users table
    - Ensure (oauth_provider, oauth_provider_id) uniqueness via RLS
    - Create user profile on first sign-in
    - Update user profile on subsequent sign-ins
    - _Requirements: 1.4, 1.5_

  - [x] 7.4 Write property test for OAuth uniqueness
    - **Property: OAuth Authentication Uniqueness**
    - **Validates: Requirements 1.5**

- [x] 8. Implement session management with Supabase
  - [x] 8.1 Configure session handling
    - Set up Supabase session management with cookies
    - Configure session expiration (7 days)
    - Implement automatic session refresh
    - _Requirements: 1.6, 1.7, 23.3_

  - [x] 8.2 Create authentication middleware for API routes
    - Implement getUser middleware to verify session
    - Create requireAuth middleware for protected routes
    - Create requireSeller middleware for seller-only routes
    - Create requireAdmin middleware for admin-only routes
    - _Requirements: 1.6, 1.8_

  - [x] 8.3 Implement logout and session management
    - Create signOut function using Supabase Auth
    - Clear session cookies on logout
    - Handle session expiration gracefully
    - _Requirements: 1.8, 1.9_

- [x] 9. Create authentication API routes
  - [x] 9.1 Implement /api/auth/callback route
    - Handle OAuth callback from Supabase Auth
    - Exchange code for session
    - Redirect to dashboard after successful auth
    - _Requirements: 1.1, 1.2_

  - [x] 9.2 Implement /api/auth/signout route
    - Call Supabase signOut
    - Clear session cookies
    - Return success response
    - _Requirements: 1.8_

  - [x] 9.3 Implement /api/auth/me route
    - Return current authenticated user from Supabase
    - Include user profile and eco_impact
    - _Requirements: User profile access_

- [x] 10. Build frontend authentication components
  - [x] 10.1 Create AuthPage with OAuth buttons
    - Build OAuth login buttons for Google, Apple, Microsoft
    - Implement OAuth redirect flow using Supabase Auth
    - Handle OAuth callback and session storage
    - _Requirements: 1.1_

  - [x] 10.2 Implement authentication state management
    - Create auth store with Zustand
    - Subscribe to Supabase auth state changes
    - Implement login, logout actions
    - Create useAuth hook for components
    - _Requirements: 1.6, 1.7, 1.8_

  - [x] 10.3 Create protected route wrapper component
    - Check authentication status using Supabase
    - Redirect to login if not authenticated
    - Handle session refresh automatically
    - _Requirements: 1.9_

- [x] 11. Checkpoint - Verify authentication system
  - Test OAuth login flow for all providers
  - Verify session token generation and validation
  - Test protected routes require authentication
  - Verify logout clears session
  - Test automatic session refresh
  - Ensure all authentication tests pass

### Phase 3: Enhanced AI Scanner with ISBN Detection

- [x] 12. Implement image upload to Supabase Storage
  - [x] 12.1 Create image upload utilities
    - Create utility functions for Supabase Storage uploads
    - Implement image validation (JPEG, PNG, max 5MB)
    - Generate unique file names with UUIDs
    - Configure storage bucket paths
    - _Requirements: 2.4, 21.1-21.7_

  - [x] 12.2 Create /api/listings/images API route
    - Accept multipart/form-data image uploads
    - Validate image file type and size
    - Upload images to Supabase Storage book-images bucket
    - Generate multiple sizes: thumbnail (200x200), medium (600x600), full (1200x1200)
    - Strip EXIF data for privacy
    - Return Supabase Storage public URLs
    - _Requirements: 2.4, 17.4, 17.5, 21.2, 21.6_

  - [x] 12.3 Write property test for image upload constraints
    - **Property: Image Upload Constraints**
    - **Validates: Requirements 2.4, 17.4, 17.5**

- [x] 13. Implement Enhanced AI Scanner with ISBN detection
  - [x] 13.1 Create ISBN barcode detection service
    - Implement detectISBNBarcode function using OCR or barcode detection library
    - Analyze front cover and back cover images
    - Extract ISBN-10 or ISBN-13 from barcode
    - Return detected ISBN or null
    - _Requirements: 2.5, 2.6_

  - [x] 13.2 Implement book metadata fetching service
    - Integrate with book database API (Google Books API, Open Library, etc.)
    - Create fetchBookMetadata function accepting ISBN
    - Fetch title, author, publisher, edition, publication_year, cover_image
    - Return BookMetadata object
    - Handle API failures gracefully
    - _Requirements: 2.7, 2.12_

  - [x] 13.3 Create condition analysis algorithm
    - Implement analyzeBookCondition function
    - Analyze cover damage, page quality, binding quality, markings, discoloration
    - Assign component scores (1-5) for each factor
    - Calculate weighted average for overall condition score
    - Return ConditionAnalysis object
    - _Requirements: 2.8, 2.9, 2.10_

  - [x] 13.4 Write property test for condition score validity
    - **Property: Condition Score Validity**
    - **Validates: Requirements 2.10**

  - [x] 13.5 Create /api/ai/scan API route
    - Accept array of image URLs and scan_id
    - Subscribe to Supabase Realtime channel for progress updates
    - Publish progress: 0% -   ing scan
    - Detect ISBN from cover images
    - Publish progress: 25% - ISBN detected
    - Fetch book metadata if ISBN found
    - Publish progress: 50% - Metadata fetched
    - Analyze book condition
    - Publish progress: 90% - Condition analyzed
    - Save AI_Scan record to Supabase database
    - Publish progress: 100% - Scan complete
    - Return ScanResult with ISBN, metadata, condition
    - _Requirements: 2.5-2.11_

  - [x] 13.6 Write property test for ISBN detection accuracy
    - **Property: ISBN Detection Accuracy**
    - **Validates: Requirements 2.5, 2.6**

  - [x] 13.7 Write property test for metadata auto-fill
    - **Property: Metadata Auto-fill**
    - **Validates: Requirements 2.7**

- [x] 14. Build frontend AI scanner components
  - [x] 14.1 Create EnhancedAIScannerComponent
    - Detect platform (desktop vs mobile)
    - Generate QR code for desktop users
    - Open camera directly for mobile users
    - Implement image capture for: front cover, back cover, spine, pages
    - Upload images to Supabase Storage via API route
    - Subscribe to Supabase Realtime channel for progress updates
    - Display progress bar with messages
    - Show detected ISBN and auto-filled metadata
    - _Requirements: 2.1, 2.2, 2.3, 2.11_

  - [x] 14.2 Create QRCodeGenerator component
    - Generate QR code with mobile camera URL
    - Display QR code on desktop
    - Handle QR code scanning from mobile
    - _Requirements: 2.1_

  - [x] 14.3 Create CameraCapture component
    - Open device camera
    - Capture images for each book section
    - Show image previews
    - Allow retake if needed
    - _Requirements: 2.2, 2.3_

- [x] 15. Checkpoint - Verify AI scanner system
  - Test ISBN detection with sample book images
  - Verify metadata fetching from external API
  - Test condition analysis returns valid scores
  - Verify Supabase Realtime progress updates work
  - Test QR code generation for desktop
  - Test direct camera access on mobile
  - Ensure all AI scanner tests pass

### Phase 4: Enhanced Pricing Engine and Listing Management

- [x] 16. Implement Enhanced Pricing Engine with real costs
  - [x] 16.1 Create shipping API integration service
    - Integrate with Delhivery or Shiprocket API
    - Implement fetchDeliveryCost function
    - Accept origin and destination locations, estimated weight
    - Return real-time delivery cost from courier API
    - Handle API failures with cached estimates
    - _Requirements: 4.3, 7.1, 7.2, 19.4_

  - [x] 16.2 Create pricing calculation algorithm
    - Implement calculateEnhancedPricing function
    - Apply condition multipliers: 5→0.80, 4→0.70, 3→0.60, 2→0.40, 1→0.25
    - Calculate base_price = original_price × condition_multiplier
    - Fetch delivery_cost from shipping API
    - Calculate platform_commission = base_price × 0.10
    - Calculate payment_fees = (base_price × 0.025) + 3.00
    - Calculate final_price = base_price + delivery_cost + platform_commission + payment_fees
    - Calculate seller_payout = base_price - platform_commission
    - Round final_price to nearest rupee
    - Return PricingBreakdown object
    - _Requirements: 4.1-4.10_

  - [x] 16.3 Write property test for pricing formula correctness
    - **Property: Enhanced Pricing Formula Correctness**
    - **Validates: Requirements 4.1-4.10**

  - [x] 16.4 Write property test for seller payout calculation
    - **Property: Seller Payout Calculation**
    - **Validates: Requirements 4.7**

  - [x] 16.5 Create /api/pricing/calculate API route
    - Accept original_price, condition_score, seller_location, buyer_location
    - Call calculateEnhancedPricing function
    - Return pricing breakdown with all components
    - _Requirements: 4.1-4.10_

- [x] 17. Implement listing management with admin approval
  - [x] 17.1 Create /api/listings API route (POST)
    - Verify seller is authenticated via Supabase Auth
    - Validate listing data with Zod schema
    - Create listing in Supabase with status "pending_approval"
    - Store images, condition details, pricing
    - Return listing object
    - _Requirements: 2.1-2.10, 3.1, 3.2_

  - [x] 17.2 Create /api/listings/[id] API route (GET)
    - Fetch listing by ID from Supabase with book and seller data
    - Increment view count
    - Return listing details
    - _Requirements: Listing detail view_

  - [x] 17.3 Create /api/listings/seller/me API route (GET)
    - Fetch all listings for authenticated seller from Supabase
    - Filter by status if provided
    - Return listings with pagination
    - _Requirements: Seller portal_

  - [x] 17.4 Create /api/listings/[id] API route (PUT)
    - Verify seller owns the listing
    - Check listing status allows editing
    - Update listing in Supabase
    - Return updated listing
    - _Requirements: Listing editing_

  - [x] 17.5 Create /api/listings/[id] API route (DELETE)
    - Verify seller owns the listing
    - Check listing status is not "sold"
    - Delete listing from Supabase
    - Return success response
    - _Requirements: Listing deletion_

- [x] 18. Build frontend listing creation flow
  - [x] 18.1 Create CreateListingForm component (multi-step)
    - Step 1: Use EnhancedAIScannerComponent for image capture
    - Step 2: Display auto-filled book details (or manual entry if ISBN not detected)
    - Step 3: Review condition score and pricing breakdown
    - Step 4: Confirm and submit listing
    - Implement form state management with react-hook-form
    - Add validation with Zod schemas
    - _Requirements: 2.1-2.12_

  - [x] 18.2 Create ConditionBadge component
    - Display condition score (1-5) with visual indicators
    - Show color-coded badge (5=green, 4=light-green, 3=yellow, 2=orange, 1=red)
    - Display condition label (Like New, Very Good, Good, Acceptable, Poor)
    - _Requirements: Condition display_

  - [x] 18.3 Create PricingBreakdownDisplay component
    - Show original price
    - Show base price with condition multiplier
    - Show delivery cost
    - Show platform commission
    - Show payment fees
    - Show final price prominently
    - Show seller payout
    - Format all prices in Indian Rupees with ₹ symbol
    - _Requirements: 4.8, 4.9, 4.10_

- [x] 19. Checkpoint - Verify listing management system
  - Test listing creation flow end-to-end
  - Verify AI scanner integration works
  - Verify pricing calculation with real delivery costs
  - Test listing editing and deletion
  - Verify listings are created with "pending_approval" status
  - Ensure all listing management tests pass

### Phase 5: Admin Dashboard and Moderation System

- [x] 20. Implement admin approval service
  - [x] 20.1 Create admin approval algorithm
    - Implement processAdminApproval function
    - Validate listing is pending approval
    - Verify admin permissions
    - Handle approve, reject, request_rescan actions
    - Update listing status in Supabase
    - Set approved_at and approved_by for approved listings
    - Store rejection_reason for rejected listings
    - Create moderation log entry in Supabase
    - Publish Supabase Realtime notification to seller
    - Add/remove from Meilisearch index based on status
    - _Requirements: 3.3-3.11_

  - [x] 20.2 Write property test for admin approval requirement
    - **Property: Admin Approval Requirement**
    - **Validates: Requirements 3.4, 3.5**

  - [x] 20.3 Write property test for listing status transitions
    - **Property: Listing Status Transitions with Approval**
    - **Validates: Requirements 3.3-3.11**

- [x] 21. Create admin moderation API routes
  - [x] 21.1 Implement /api/admin/listings API route (GET)
    - Require admin authentication
    - Fetch listings by status from Supabase (pending_approval, active, rejected, etc.)
    - Return listings with pagination
    - _Requirements: 3.3, 9.2_

  - [x] 21.2 Implement /api/admin/listings/[id]/approve API route (PUT)
    - Require admin authentication
    - Call processAdminApproval with "approve" action
    - Return updated listing
    - _Requirements: 3.4, 3.5, 3.6_

  - [x] 21.3 Implement /api/admin/listings/[id]/reject API route (PUT)
    - Require admin authentication
    - Validate rejection reason is provided
    - Call processAdminApproval with "reject" action
    - Return updated listing
    - _Requirements: 3.7_

  - [x] 21.4 Implement /api/admin/listings/[id]/request-rescan API route (PUT)
    - Require admin authentication
    - Call processAdminApproval with "request_rescan" action
    - Return updated listing
    - _Requirements: 3.8_

- [x] 22. Implement admin user management
  - [x] 22.1 Create /api/admin/users API route (GET)
    - Require admin authentication
    - Fetch users from Supabase with filters
    - Return users with pagination
    - _Requirements: 9.3_

  - [x] 22.2 Create /api/admin/users/[id]/suspend API route (PUT)
    - Require admin authentication
    - Set suspended_until timestamp in Supabase
    - Create moderation log entry
    - Send notification to user via Supabase Realtime
    - _Requirements: 9.3, 9.4, 24.5_

  - [x] 22.3 Create /api/admin/users/[id]/warn API route (POST)
    - Require admin authentication
    - Send warning notification to seller via Supabase Realtime
    - Create moderation log entry
    - _Requirements: 9.5_

  - [x] 22.4 Create /api/admin/users/[id]/limit-listings API route (PUT)
    - Require admin authentication
    - Set listing_limit for seller in Supabase
    - Create moderation log entry
    - _Requirements: 9.6, 9.7, 18.6_

  - [x] 22.5 Write property test for user suspension enforcement
    - **Property: User Suspension Enforcement**
    - **Validates: Requirements 9.4, 24.5**

  - [x] 22.6 Write property test for listing limit enforcement
    - **Property: Listing Limit Enforcement**
    - **Validates: Requirements 9.6, 9.7, 18.6**

- [x] 23. Implement platform statistics and analytics
  - [x] 23.1 Create platform stats calculation service
    - Implement calculatePlatformStats function
    - Aggregate total_books_listed, total_books_sold, active_listings from Supabase
    - Calculate total_users, total_buyers, total_sellers
    - Calculate revenue_generated and platform_commission_earned
    - Calculate environmental impact metrics
    - Store daily stats in platform_stats table
    - _Requirements: 9.1, 16.1-16.6_

  - [x] 23.2 Create /api/admin/stats API route (GET)
    - Require admin authentication
    - Fetch platform statistics from Supabase
    - Implement application-level caching (15 minutes)
    - Return stats with charts data
    - _Requirements: 9.1, 16.4_

  - [x] 23.3 Create /api/admin/analytics API route (GET)
    - Require admin authentication
    - Generate charts: daily sales, listings per day, revenue by category
    - Return analytics data
    - _Requirements: 9.12_

  - [x] 23.4 Write property test for platform stats accuracy
    - **Property: Platform Stats Accuracy**
    - **Validates: Requirements 16.1-16.3**

- [x] 24. Implement moderation logging
  - [x] 24.1 Create moderation log service
    - Implement logModerationAction function
    - Store admin_id, action, target_type, target_id, reason, notes, timestamp in Supabase
    - _Requirements: 3.9, 24.1, 24.2_

  - [x] 24.2 Create /api/admin/moderation-logs API route (GET)
    - Require admin authentication
    - Fetch moderation logs from Supabase with filters (date range, admin, action type)
    - Return logs with pagination
    - _Requirements: 9.11, 24.3_

  - [x] 24.3 Write property test for moderation log completeness
    - **Property: Moderation Log Completeness**
    - **Validates: Requirements 3.9, 24.1, 24.2**

- [x] 25. Build admin dashboard frontend
  - [x] 25.1 Create AdminDashboard component
    - Display platform overview with key metrics
    - Show charts for daily sales, listings, revenue
    - Display environmental impact metrics
    - _Requirements: 9.1, 9.12_

  - [x] 25.2 Create PendingListingsTable component
    - Display pending listings with book details, seller info
    - Add approve, reject, request rescan buttons
    - Implement modal for rejection reason input
    - _Requirements: 9.2, 3.3-3.8_

  - [x] 25.3 Create UserManagementTable component
    - Display users with filters
    - Add suspend, warn, limit listings actions
    - Implement modals for action inputs
    - _Requirements: 9.3-9.7_

  - [x] 25.4 Create ModerationLogsTable component
    - Display moderation logs with filters
    - Show admin, action, target, reason, timestamp
    - _Requirements: 9.11, 24.3_

  - [x] 25.5 Create AnalyticsCharts component
    - Display daily sales chart
    - Display listings per day chart
    - Display revenue by category chart
    - Use chart library (recharts or chart.js)
    - _Requirements: 9.12_

- [x] 26. Checkpoint - Verify admin dashboard system
  - Test admin approval flow for listings
  - Verify Supabase Realtime notifications sent to sellers
  - Test user suspension and listing limits
  - Verify moderation logs are created
  - Test platform statistics calculation
  - Verify analytics charts display correctly
  - Ensure all admin dashboard tests pass

### Phase 6: Meilisearch-Powered Search and Discovery

- [x] 27. Implement Meilisearch indexing service
  - [x] 27.1 Create search index management functions
    - Implement addToMeilisearchIndex function
    - Implement updateMeilisearchIndex function
    - Implement removeFromMeilisearchIndex function
    - Index listing with book data, location, pricing
    - _Requirements: 5.10, 5.11_

  - [x] 27.2 Integrate indexing with listing lifecycle
    - Add to index when listing approved (status → active)
    - Remove from index when listing status changes from active
    - Update index when listing details change
    - _Requirements: 5.10, 5.11_

  - [x] 27.3 Write property test for search index consistency
    - **Property: Meilisearch Index Consistency**
    - **Validates: Requirements 5.10, 5.11**

- [x] 28. Implement search service with filters
  - [x] 28.1 Create search function with Meilisearch
    - Implement searchListings function
    - Perform typo-tolerant full-text search on title, author, subject, ISBN
    - Apply filters: category, condition_score, price_range
    - Calculate proximity scores based on user location
    - Sort by relevance, price, condition, date, proximity
    - Return only listings with status "active"
    - Implement pagination
    - _Requirements: 5.1-5.9_

  - [x] 28.2 Write property test for search result relevance
    - **Property: Search Result Relevance**
    - **Validates: Requirements 5.1-5.7**

  - [x] 28.3 Implement autocomplete function
    - Create getAutocomplete function
    - Return suggestions from titles and authors
    - Limit to 10 suggestions
    - _Requirements: Search UX_

  - [x] 28.4 Implement faceted search
    - Return facets for categories, condition scores, price ranges
    - Show counts for each facet value
    - _Requirements: Search filtering_

- [x] 29. Create search API routes
  - [x] 29.1 Implement /api/search API route (GET)
    - Accept query, filters, user location, sort_by, page, page_size
    - Call searchListings function
    - Return search results with pagination metadata
    - Implement application-level caching for popular queries (5-minute TTL)
    - _Requirements: 5.1-5.9, 22.1, 22.7_

  - [x] 29.2 Implement /api/search/autocomplete API route (GET)
    - Accept partial query string
    - Call getAutocomplete function
    - Return suggestions
    - _Requirements: Search autocomplete_

  - [x] 29.3 Implement /api/search/facets API route (GET)
    - Accept current search query and filters
    - Return facets with counts
    - _Requirements: Faceted search_

- [x] 30. Implement category management
  - [x] 30.1 Create category CRUD API routes
    - Implement /api/categories API route (GET - public)
    - Implement /api/admin/categories API route (POST - admin only)
    - Implement /api/admin/categories/[id] API route (PUT - admin only)
    - Implement /api/admin/categories/[id] API route (DELETE - admin only)
    - Validate category hierarchy (no circular references)
    - _Requirements: 9.10, 14.1-14.9_

  - [x] 30.2 Write property test for category hierarchy validity
    - **Property: Category Hierarchy Validity**
    - **Validates: Requirements 14.7, 14.8**

- [x] 31. Build frontend search and discovery components
  - [x] 31.1 Create SearchPage component
    - Integrate SearchBar with autocomplete
    - Integrate FilterPanel for categories, condition, price
    - Integrate SortDropdown for sorting options
    - Display search results in grid
    - Implement pagination or infinite scroll
    - _Requirements: 5.1-5.9_

  - [x] 31.2 Create SearchBar component
    - Implement search input with autocomplete
    - Fetch suggestions on typing
    - Handle search submission
    - _Requirements: 5.1_

  - [x] 31.3 Create FilterPanel component
    - Build category filter dropdown
    - Build condition score filter
    - Build price range filters
    - Apply filters on change
    - _Requirements: 5.3, 5.4, 5.5_

  - [x] 31.4 Create ListingCard component
    - Display book image, title, author
    - Show condition badge
    - Display final price
    - Show location and distance
    - Add click handler to navigate to detail page
    - _Requirements: Search results display_

  - [x] 31.5 Create BookDetailPage component
    - Fetch and display listing details
    - Show image gallery
    - Display condition details
    - Show pricing breakdown
    - Display seller info (without full address)
    - Add "Place Order" button
    - Add "Add to Wishlist" button
    - _Requirements: Listing detail view_

- [x] 32. Checkpoint - Verify search and discovery system
  - Test search with various queries and filters
  - Verify typo tolerance works
  - Test proximity-based ranking
  - Verify pagination works correctly
  - Test category browsing
  - Verify search performance (<200ms p95)
  - Ensure all search tests pass

### Phase 7: Payment Gateway Integration

- [x] 33. Implement payment gateway service
  - [x] 33.1 Configure Stripe or Razorpay SDK
    - Install payment gateway SDK
    - Configure API keys and webhooks
    - Set up webhook signature verification
    - _Requirements: 6.1, 6.9_

  - [x] 33.2 Create payment intent creation function
    - Implement createPaymentIntent function
    - Accept order_id and amount
    - Create payment intent with gateway
    - Return payment session for frontend
    - _Requirements: 6.1, 6.2_

  - [x] 33.3 Create payment verification function
    - Implement verifyPayment function
    - Verify payment status with gateway
    - Return payment confirmation
    - _Requirements: 6.3, 6.4_

  - [x] 33.4 Create refund processing function
    - Implement processRefund function
    - Process refund through gateway
    - Update payment record in Supabase with refund details
    - _Requirements: 6.7, 6.8_

  - [x] 33.5 Write property test for payment status progression
    - **Property: Payment Status Progression**
    - **Validates: Requirements 6.3-6.8**

- [x] 34. Create payment API routes
  - [x] 34.1 Implement /api/payments/create-intent API route (POST)
    - Accept order_id
    - Fetch order details from Supabase
    - Create payment intent
    - Return payment session
    - _Requirements: 6.1, 6.2_

  - [x] 34.2 Implement /api/payments/webhook API route (POST)
    - Verify webhook signature
    - Handle payment status updates
    - Update order and payment records in Supabase
    - Publish Supabase Realtime notifications
    - _Requirements: 6.9, 6.10_

  - [x] 34.3 Implement /api/payments/[id]/refund API route (POST)
    - Require admin authentication
    - Validate refund amount
    - Process refund
    - Update payment status in Supabase
    - _Requirements: 6.7, 6.8, 9.9_

  - [x] 34.4 Write property test for refund amount validity
    - **Property: Refund Amount Validity**
    - **Validates: Requirements 6.7, 6.8**

- [x] 35. Build frontend payment components
  - [x] 35.1 Create CheckoutPage component
    - Display order summary
    - Show pricing breakdown
    - Integrate payment gateway UI (Stripe Elements or Razorpay Checkout)
    - Handle payment submission
    - Show success/failure messages
    - _Requirements: 6.1-6.6_

  - [x] 35.2 Create PaymentStatusDisplay component
    - Show payment status
    - Display payment method
    - Show transaction ID
    - _Requirements: Payment status display_

- [x] 36. Checkpoint - Verify payment integration
  - Test payment intent creation
  - Verify payment processing with test cards
  - Test webhook handling
  - Verify refund processing
  - Test payment failure scenarios
  - Ensure all payment tests pass

### Phase 8: Shipping API Integration

- [x] 37. Implement shipping API service
  - [x] 37.1 Configure Delhivery or Shiprocket API
    - Install shipping API SDK or create HTTP client
    - Configure API credentials
    - _Requirements: 7.1-7.10_

  - [x] 37.2 Create shipping label generation function
    - Implement generateShippingLabel function
    - Accept order details, pickup and delivery addresses
    - Generate shipping label with tracking ID
    - Return ShippingLabel object
    - _Requirements: 7.2, 7.3, 7.4_

  - [x] 37.3 Create shipment tracking function
    - Implement trackShipment function
    - Accept tracking_id
    - Fetch current shipment status from API
    - Return ShipmentStatus object
    - _Requirements: 7.8_

  - [x] 37.4 Create shipment status update handler
    - Implement handleShipmentStatusUpdate function
    - Update shipping record in Supabase with timestamps
    - Update order status based on shipment status
    - Publish Supabase Realtime notifications
    - _Requirements: 7.6, 7.7, 7.10_

  - [x] 37.5 Write property test for shipping status progression
    - **Property: Shipping Status Progression**
    - **Validates: Requirements 7.6, 7.7**

  - [x] 37.6 Write property test for delivery cost consistency
    - **Property: Delivery Cost Consistency**
    - **Validates: Requirements 7.1**

- [x] 38. Create shipping API routes
  - [x] 38.1 Implement /api/shipping/generate-label API route (POST)
    - Accept order_id
    - Verify order is paid
    - Generate shipping label
    - Create shipping record in Supabase
    - Update order with tracking_id
    - Return shipping details
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

  - [x] 38.2 Implement /api/shipping/track/[trackingId] API route (GET)
    - Fetch shipment status
    - Return tracking information
    - _Requirements: 7.8_

  - [x] 38.3 Implement /api/shipping/webhook API route (POST)
    - Handle shipment status updates from courier
    - Update shipping and order records in Supabase
    - Publish Supabase Realtime notifications
    - _Requirements: 7.6, 7.10_

- [x] 39. Build frontend shipping components
  - [x] 39.1 Create TrackingDisplay component
    - Display tracking ID
    - Show shipment status timeline
    - Display current location
    - Show estimated delivery date
    - _Requirements: 7.8_

  - [x] 39.2 Create ShippingLabelDownload component
    - Display shipping label URL
    - Add download button
    - Show pickup instructions
    - _Requirements: 7.4_

- [x] 40. Checkpoint - Verify shipping integration
  - Test shipping label generation
  - Verify tracking information retrieval
  - Test shipment status updates
  - Verify Supabase Realtime notifications for status changes
  - Test shipping API error handling
  - Ensure all shipping tests pass

### Phase 9: Order Processing with Atomicity

- [x] 41. Implement order processing service
  - [x] 41.1 Create order creation algorithm
    - Implement processOrder function
    - Validate listing is active
    - Calculate pricing with delivery cost
    - Create order in Supabase with status "pending_payment"
    - Create payment intent
    - Use Supabase transaction to update listing status to "sold" atomically
    - Return order with payment session
    - _Requirements: 11.1-11.9, 20.2_

  - [x] 41.2 Write property test for active listing uniqueness
    - **Property: Active Listing Uniqueness**
    - **Validates: Requirements 11.2, 11.3, 20.5**

  - [x] 41.3 Write property test for order creation atomicity
    - **Property: Order Creation Atomicity**
    - **Validates: Requirements 11.2, 20.2**

  - [x] 41.4 Write property test for concurrent order prevention
    - **Property: Concurrent Order Prevention**
    - **Validates: Requirements 11.4, 11.5, 11.6**

  - [x] 41.5 Create payment confirmation handler
    - Implement confirmPaymentAndGenerateShipping function
    - Verify payment with gateway
    - Update order status to "paid" in Supabase
    - Generate shipping label
    - Update order with tracking_id and status "shipped"
    - Publish Supabase Realtime notifications
    - _Requirements: 6.3, 6.4, 6.5, 7.2-7.5_

  - [x] 41.6 Write property test for order status with payment
    - **Property: Order Status with Payment**
    - **Validates: Requirements 6.4, 6.5**

  - [x] 41.7 Write property test for shipping label generation
    - **Property: Shipping Label Generation**
    - **Validates: Requirements 7.2, 7.3, 7.4**

- [x] 42. Create order API routes
  - [x] 42.1 Implement /api/orders API route (POST)
    - Verify buyer is authenticated
    - Validate order data (listing_id, delivery_address)
    - Call processOrder function
    - Handle concurrent order attempts (return 409 Conflict)
    - Return order with payment session
    - _Requirements: 11.1-11.9_

  - [x] 42.2 Implement /api/orders API route (GET)
    - Fetch orders for authenticated user (buyer or seller) from Supabase
    - Filter by user role
    - Return orders with pagination
    - _Requirements: Order listing_

  - [x] 42.3 Implement /api/orders/[id] API route (GET)
    - Verify user is buyer or seller of the order
    - Fetch order from Supabase with listing and book data
    - Return order details
    - _Requirements: Order detail view_

  - [x] 42.4 Implement /api/orders/[id]/cancel API route (PUT)
    - Verify user is buyer or seller
    - Check order status allows cancellation
    - Update order status to "cancelled" in Supabase
    - Process refund if payment completed
    - Update listing status back to "active" if not shipped
    - _Requirements: Order cancellation_

- [x] 43. Build frontend order components
  - [x] 43.1 Create OrderPage component
    - Display order summary
    - Show book details
    - Display pricing breakdown
    - Show delivery address
    - Display payment status
    - Show tracking information
    - Add cancel order button (if applicable)
    - _Requirements: Order management_

  - [x] 43.2 Create MyOrdersPage component (buyer view)
    - Fetch and display buyer's orders
    - Show order status, book details, tracking
    - Implement status filtering
    - _Requirements: Buyer order view_

  - [x] 43.3 Create SellerOrdersPage component (seller view)
    - Fetch and display seller's orders
    - Show order status, buyer info, tracking
    - Display seller payout information
    - _Requirements: Seller order view_

- [x] 44. Checkpoint - Verify order processing system
  - Test order creation flow end-to-end
  - Verify listing status updates atomically
  - Test concurrent order prevention
  - Verify payment confirmation triggers shipping
  - Test order cancellation and refunds
  - Ensure all order processing tests pass

### Phase 10: Supabase Realtime Updates

- [x] 45. Implement Supabase Realtime subscriptions
  - [x] 45.1 Create Realtime channel management
    - Set up Supabase Realtime channels for different event types
    - Configure channel authentication using RLS policies
    - Create channel subscription utilities
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 45.2 Implement message publishing functions
    - Implement publishListingApproval function using Supabase Realtime
    - Implement publishOrderUpdate function using Supabase Realtime
    - Implement publishScanProgress function using Supabase Realtime
    - Broadcast messages to appropriate channels
    - _Requirements: 8.4, 8.5, 8.6, 3.10, 3.11_

  - [x] 45.3 Implement connection management
    - Handle connection drops with automatic reconnection
    - Implement exponential backoff for reconnection
    - Fetch missed updates on reconnection
    - _Requirements: 8.7, 8.8_

  - [x] 45.4 Write property test for real-time notification delivery
    - **Property: Real-time Notification Delivery**
    - **Validates: Requirements 8.4, 3.10**

- [-] 46. Build frontend Supabase Realtime integration
  - [x] 46.1 Create Realtime client service
    - Initialize Supabase Realtime client
    - Implement connection with authentication
    - Handle connection events (connect, disconnect, error)
    - Implement automatic reconnection with exponential backoff
    - _Requirements: 8.1, 8.7_

  - [x] 46.2 Create notification subscription hooks
    - Create useListingNotifications hook
    - Create useOrderNotifications hook
    - Create useScanProgress hook
    - Subscribe to appropriate Supabase Realtime channels
    - Handle incoming messages
    - _Requirements: 8.3, 8.4, 8.5, 8.6_

  - [x] 46.3 Create NotificationToast component
    - Display real-time notifications
    - Show listing approval/rejection messages
    - Show order status updates
    - Show scan progress updates
    - Auto-dismiss after 5 seconds
    - _Requirements: Real-time notifications UI_

- [x] 47. Checkpoint - Verify Supabase Realtime system
  - Test Realtime connection and authentication
  - Verify listing approval notifications
  - Test order status update notifications
  - Verify scan progress updates
  - Test automatic reconnection
  - Ensure all Realtime tests pass

### Phase 11: Additional Features

- [x] 48. Implement review and rating system
  - [x] 48.1 Create review API routes
    - Implement /api/reviews API route (POST)
    - Verify order is delivered
    - Ensure one review per order
    - Store rating and comment in Supabase
    - _Requirements: 12.1-12.7_

  - [x] 48.2 Implement /api/users/[id]/reviews API route (GET)
    - Fetch reviews for user from Supabase
    - Calculate average rating
    - Return reviews with pagination
    - _Requirements: 12.5, 12.6_

  - [x] 48.3 Write property test for review uniqueness
    - **Property: Review Uniqueness**
    - **Validates: Requirements 12.1, 12.2, 12.4**

  - [x] 48.4 Create ReviewForm component
    - Build rating input (1-5 stars)
    - Build comment textarea
    - Validate and submit review
    - _Requirements: 12.1-12.7_

  - [x] 48.5 Create ReviewsList component
    - Display reviews with ratings
    - Show reviewer name and date
    - Display average rating
    - _Requirements: 12.5, 12.6_

- [x] 49. Implement wishlist functionality
  - [x] 49.1 Create wishlist API routes
    - Implement /api/wishlist API route (POST)
    - Ensure (user_id, book_id) uniqueness in Supabase
    - Implement /api/wishlist API route (GET)
    - Implement /api/wishlist/[id] API route (DELETE)
    - _Requirements: 13.1-13.5_

  - [x] 49.2 Write property test for wishlist uniqueness
    - **Property: Wishlist Uniqueness**
    - **Validates: Requirements 13.2**

  - [x] 49.3 Create WishlistButton component
    - Toggle wishlist status
    - Show heart icon (filled/unfilled)
    - Handle add/remove actions
    - _Requirements: 13.1, 13.4_

  - [x] 49.4 Create WishlistPage component
    - Display wishlist items
    - Show book details and prices
    - Add remove button
    - Indicate if book is in wishlist
    - _Requirements: 13.3, 13.5_

- [x] 50. Implement environmental impact tracking
  - [x] 50.1 Create environmental impact service
    - Implement calculateEnvironmentalImpact function
    - Use formulas: trees = books/30, water = books×50, co2 = books×2.5
    - Round to 2 decimal places
    - _Requirements: 10.1-10.8_

  - [x] 50.2 Write property test for environmental impact formula
    - **Property: Environmental Impact Formula**
    - **Validates: Requirements 10.1-10.3**

  - [x] 50.3 Create impact update functions
    - Update user eco_impact in Supabase on book sold/bought
    - Update platform stats with environmental metrics
    - _Requirements: 10.4, 10.5, 10.6_

  - [x] 50.4 Write property test for user eco impact aggregation
    - **Property: User Eco Impact Aggregation**
    - **Validates: Requirements 10.4, 10.5**

  - [x] 50.5 Create /api/impact/platform API route (GET)
    - Return platform-wide environmental impact
    - _Requirements: 10.6_

  - [x] 50.6 Create /api/impact/user/[id] API route (GET)
    - Return user's environmental impact contribution
    - _Requirements: 10.7_

  - [x] 50.7 Create EcoImpactDisplay component
    - Display trees saved, water saved, CO₂ reduced
    - Show visual indicators (icons, progress bars)
    - Format numbers with 2 decimal places
    - _Requirements: 10.8_

  - [x] 50.8 Create EcoImpactBadge component
    - Display user's eco contribution
    - Show on profile and dashboard
    - _Requirements: 10.7_

- [x] 51. Implement seller portal
  - [x] 51.1 Create SellerDashboard component
    - Display seller statistics (total listings, active, sold, earnings)
    - Show recent orders
    - Display eco-impact contribution
    - _Requirements: Seller portal_

  - [x] 51.2 Create MyListingsPage component
    - Display all seller's listings
    - Filter by status (active, pending, rejected, sold)
    - Show views, price, creation date
    - Add edit and delete buttons
    - _Requirements: Seller listing management_

  - [x] 51.3 Create EarningsPage component
    - Display total sales, platform commission, payment fees
    - Show net earnings
    - Display earnings breakdown by order
    - _Requirements: Seller earnings_

- [x] 52. Checkpoint - Verify additional features
  - Test review submission and display
  - Verify wishlist add/remove functionality
  - Test environmental impact calculations
  - Verify seller portal displays correct data
  - Ensure all additional feature tests pass

### Phase 12: Security, Performance, and Polish

- [x] 53. Implement rate limiting and security
  - [x] 53.1 Add rate limiting middleware
    - Implement rate limiter for search: 100 requests per minute per IP
    - Implement rate limiter for listing creation: 10 per hour per user
    - Implement rate limiter for orders: 20 per hour per user
    - Return HTTP 429 when rate limit exceeded
    - _Requirements: 18.1, 18.2, 18.3, 18.5_

  - [x] 53.2 Write property test for rate limiting enforcement
    - **Property: Rate Limiting Enforcement**
    - **Validates: Requirements 18.1-18.3, 18.5**

  - [x] 53.3 Implement security headers and input sanitization
    - Configure security headers in Next.js
    - Implement input sanitization for all user inputs
    - Add CSRF protection
    - Configure CORS with whitelist
    - _Requirements: 17.1-17.9, 23.2_

  - [x] 53.4 Implement data encryption
    - Use Supabase's built-in encryption for data at rest
    - Use HTTPS/TLS 1.3 for all communications
    - Never store credit card numbers or CVV
    - _Requirements: 23.1, 23.2, 23.4_

  - [x] 53.5 Implement privacy protections
    - Mask phone numbers in public listings
    - Hide full addresses until order confirmed
    - Strip EXIF data from images
    - _Requirements: 21.6, 23.8, 23.9_

- [x] 54. Implement comprehensive error handling
  - [x] 54.1 Create error response utilities
    - Create error classes for different error types
    - Implement error response formatter
    - Return appropriate HTTP status codes (400, 401, 403, 404, 409, 429, 500, 503, 504)
    - Include descriptive error messages
    - _Requirements: 19.1-19.9_

  - [x] 54.2 Implement fallback mechanisms
    - Add fallback to manual condition scoring if AI fails
    - Implement retry queue for failed shipping API calls
    - Add retry logic for notification sending (up to 3 times with exponential backoff)
    - Use cached delivery cost estimates if shipping API unavailable
    - _Requirements: 19.2, 19.4, 19.6, 25.7_

  - [x] 54.3 Implement graceful degradation
    - Handle OAuth provider unavailability
    - Handle Meilisearch unavailability with Supabase database fallback
    - Handle payment gateway failures
    - _Requirements: 19.1, 19.5_

- [x] 55. Optimize performance
  - [x] 55.1 Implement application-level caching
    - Cache popular search queries (TTL: 5 minutes)
    - Cache book details (TTL: 1 hour)
    - Cache category hierarchies (TTL: 24 hours)
    - Cache platform stats (TTL: 15 minutes)
    - Implement cache invalidation on updates
    - _Requirements: 22.7, 22.8, 16.4_

  - [x] 55.2 Optimize database queries
    - Add database indexes for common queries in Supabase
    - Use query projections to fetch only required fields
    - Use Supabase connection pooling
    - Use transactions for atomic operations
    - _Requirements: 22.1-22.6_

  - [x] 55.3 Optimize image delivery
    - Use Supabase Storage CDN for image serving
    - Implement lazy loading for image galleries
    - Use signed URLs with expiration
    - Serve optimized images from Supabase Storage
    - _Requirements: 21.3, 21.5, 21.7_

  - [x] 55.4 Monitor performance targets
    - Ensure search queries return within 200ms (p95)
    - Ensure book detail pages load within 300ms (p95)
    - Ensure AI scanning completes within 10 seconds (p95)
    - Ensure order placement responds within 1 second (p95)
    - _Requirements: 22.1-22.4_

- [-] 56. Implement notification system
  - [x] 56.1 Create notification service
    - Implement sendNotification function using Supabase Realtime
    - Support notification types: order_confirmed, listing_approved, listing_rejected, pickup_scheduled, shipped, delivered
    - Implement retry logic (up to 3 attempts with exponential backoff)
    - Log notification failures
    - _Requirements: 25.1-25.7_

  - [x] 56.2 Integrate notifications with events
    - Send notification on order creation
    - Send notification on listing approval/rejection
    - Send notification on pickup scheduled
    - Send notification on order shipped
    - Send notification on order delivered
    - _Requirements: 25.1-25.6_

- [x] 57. Improve frontend UX and accessibility
  - [x] 57.1 Add loading states and skeletons
    - Create skeleton components for cards and lists
    - Add loading spinners for async operations
    - Implement optimistic UI updates
    - _Requirements: UX enhancement_

  - [x] 57.2 Improve error handling and messaging
    - Create user-friendly error messages
    - Add error boundaries for React components
    - Implement toast notifications for success/error messages
    - Add retry buttons for failed operations
    - _Requirements: 19.1-19.9_

  - [x] 57.3 Enhance accessibility
    - Add ARIA labels to interactive elements
    - Ensure keyboard navigation works throughout
    - Add focus indicators
    - Ensure color contrast meets WCAG standards
    - _Requirements: Accessibility compliance_

  - [x] 57.4 Improve mobile responsiveness
    - Test all pages on mobile devices
    - Optimize touch targets for mobile
    - Implement mobile-friendly navigation
    - Optimize images for mobile bandwidth
    - _Requirements: Mobile UX_

- [x] 58. Checkpoint - Verify security, performance, and polish
  - Test rate limiting works correctly
  - Verify security headers are set
  - Test error handling for all failure scenarios
  - Verify caching improves performance
  - Test notification delivery
  - Verify performance meets targets
  - Ensure all security and performance tests pass

### Phase 13: Testing and Quality Assurance

- [-] 59. Write comprehensive test suites
  - [x] 59.1 Complete all property-based tests
    - Run all property tests with 1000 random test cases each
    - Verify all properties pass consistently
    - Document any edge cases discovered
    - _Requirements: All correctness properties_

  - [x] 59.2 Write integration tests for API endpoints
    - Test all authentication endpoints
    - Test all listing endpoints
    - Test all search endpoints
    - Test all order endpoints
    - Test all admin endpoints
    - Test all payment endpoints
    - Test all shipping endpoints
    - Test error scenarios and edge cases
    - _Requirements: All API endpoints_

  - [x] 59.3 Write end-to-end tests
    - Test complete OAuth authentication flow
    - Test complete listing creation flow with AI scanner
    - Test complete search and discovery flow
    - Test complete order placement and payment flow
    - Test admin approval workflow
    - Test seller dashboard workflows
    - _Requirements: All user flows_

  - [x] 59.4 Write Supabase Realtime tests
    - Test Realtime connection and authentication
    - Test real-time notifications for all events
    - Test automatic reconnection
    - Test subscription management
    - _Requirements: Realtime functionality_

- [x] 60. Perform security audit
  - Review authentication and authorization
  - Check for exposed secrets or credentials
  - Verify input validation and sanitization
  - Test rate limiting and abuse prevention
  - Review error messages for information leakage
  - Test CSRF protection
  - Verify webhook signature verification
  - Review Supabase RLS policies
  - _Requirements: Security compliance_

- [x] 61. Perform performance testing
  - Run load tests with multiple concurrent users
  - Verify search performance (<200ms p95)
  - Check database query performance
  - Monitor memory usage and resource consumption
  - Test with 10,000 concurrent users
  - Test with 100,000 active listings
  - _Requirements: 22.1-22.6_

- [x] 62. Checkpoint - Verify testing and quality
  - All unit tests pass with 80%+ code coverage
  - All property-based tests pass
  - All integration tests pass
  - All end-to-end tests pass
  - Security audit is complete
  - Performance tests meet targets

### Phase 14: Deployment and Documentation

- [x] 63. Set up production environment
  - [x] 63.1 Configure environment variables
    - Create .env.production file
    - Set up Supabase URL and keys
    - Configure Meilisearch URL and API key
    - Set up OAuth provider credentials in Supabase dashboard
    - Configure Supabase Storage settings
    - Set up payment gateway API keys
    - Configure shipping API credentials
    - Configure CORS whitelist for production domain
    - _Requirements: Deployment_

  - [x] 63.2 Set up cloud hosting
    - Deploy Next.js app to Vercel or Netlify
    - Configure custom domain
    - Set up SSL certificates (automatic with Vercel/Netlify)
    - Configure environment variables in hosting platform
    - _Requirements: Deployment_

  - [x] 63.3 Configure production databases
    - Verify Supabase production instance is set up
    - Run Supabase migrations in production
    - Set up Meilisearch production instance
    - Configure database backups in Supabase
    - _Requirements: Deployment_

  - [x] 63.4 Set up CI/CD pipeline
    - Create GitHub Actions workflow for automated testing
    - Configure automatic deployment on push to main branch
    - Set up build and test stages
    - Configure deployment to Vercel/Netlify
    - _Requirements: Deployment_

- [x] 64. Create demo data and accounts
  - [x] 64.1 Create seed script for demo data
    - Create 10 demo user accounts (buyers, sellers, admin)
    - Create 50+ book entries across all categories
    - Create 100+ listings with varied conditions and prices
    - Create sample orders in different statuses
    - Distribute listings across different locations in India
    - _Requirements: Demo preparation_

  - [x] 64.2 Upload demo images
    - Collect or generate book cover images
    - Upload images to Supabase Storage
    - Associate images with demo listings
    - _Requirements: Demo preparation_

  - [x] 64.3 Create demo admin account
    - Create admin user with admin role
    - Create pending listings for approval testing
    - _Requirements: Demo preparation_

- [x] 65. Create documentation
  - [x] 65.1 Write README.md
    - Project overview and features
    - Technology stack
    - Setup instructions for local development
    - Environment variables documentation
    - API documentation overview
    - _Requirements: Documentation_

  - [x] 65.2 Create API documentation
    - Document all API endpoints with request/response examples
    - Include authentication requirements
    - Document error responses
    - Create Postman collection or OpenAPI spec
    - _Requirements: Documentation_

  - [x] 65.3 Write deployment guide
    - Step-by-step deployment instructions
    - Environment configuration guide
    - Supabase setup instructions
    - Troubleshooting common issues
    - _Requirements: Documentation_

  - [x] 65.4 Create user guides
    - Buyer guide (search, order, track)
    - Seller guide (list books, manage orders)
    - Admin guide (moderate listings, manage users)
    - _Requirements: Documentation_

- [x] 66. Final testing and validation
  - [x] 66.1 Perform end-to-end testing in production
    - Test complete user flows in production environment
    - Verify all features work correctly
    - Test on multiple devices and browsers
    - Check performance and load times
    - _Requirements: Final validation_

  - [x] 66.2 Verify integrations
    - Test OAuth with all providers
    - Verify payment gateway integration
    - Test shipping API integration
    - Verify Meilisearch search functionality
    - Test Supabase Realtime updates
    - _Requirements: Integration validation_

  - [x] 66.3 Verify data compliance
    - Test data export functionality
    - Test data deletion functionality
    - Verify GDPR compliance
    - _Requirements: 24.7, 24.8_

- [x] 67. Final checkpoint - Production readiness
  - All features are deployed and working in production
  - Demo accounts and data are set up
  - Documentation is complete
  - All integrations are verified
  - All tests pass in production environment
  - Performance meets targets
  - Security audit is complete
  - Compliance requirements are met

## Notes

- Tasks marked with `*` are optional testing tasks that can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and provide opportunities to address issues
- Property tests validate universal correctness properties from the design document
- Integration tests validate interactions between components
- The implementation uses TypeScript throughout for type safety
- Focus on production-ready features with real integrations (OAuth, payment gateways, shipping APIs)
- All pricing calculations include real-time delivery costs, platform commission, and payment fees
- Admin approval is required for all listings before they become visible
- Supabase Realtime provides real-time updates for listing approvals, order status, and AI scan progress
- Environmental impact tracking motivates users to participate in sustainable practices

## Technology Decisions

- **Supabase**: Chosen for integrated backend (PostgreSQL, Auth, Storage, Realtime) with excellent developer experience
- **Next.js**: Chosen for full-stack TypeScript framework with API routes and SSR capabilities
- **Meilisearch**: Chosen for fast, typo-tolerant search with faceted filtering
- **Supabase Auth**: Chosen for secure, passwordless OAuth authentication with major providers
- **Supabase Realtime**: Chosen for real-time updates without separate WebSocket infrastructure
- **Supabase Storage**: Chosen for integrated file storage with CDN
- **TypeScript**: Chosen for type safety and better developer experience

## Success Criteria

The implementation is complete when:
1. All non-optional tasks are completed
2. All checkpoints pass successfully
3. The application is deployed and accessible
4. All integrations (OAuth, payment, shipping, search) are working
5. Admin dashboard is functional with moderation tools
6. Real-time updates work via Supabase Realtime
7. Performance meets targets (search <200ms, detail page <300ms, AI scan <10s, order <1s)
8. Security audit is complete
9. Demo accounts and data are ready
10. Documentation is complete
11. All core user flows work end-to-end

## Implementation Order Rationale

The phases are ordered to:
1. Build foundation (Supabase setup, database, infrastructure)
2. Implement authentication (required for all user actions)
3. Build AI scanner (core differentiator for listing creation)
4. Implement pricing engine (required for listings and orders)
5. Build admin dashboard (required for listing approval)
6. Implement search (required for discovery)
7. Integrate payment (required for transactions)
8. Integrate shipping (required for order fulfillment)
9. Implement order processing (ties everything together)
10. Add Supabase Realtime (enhances UX with real-time updates)
11. Add additional features (reviews, wishlist, eco-impact)
12. Polish security and performance
13. Test thoroughly
14. Deploy and document

This order ensures each phase builds on previous work and critical dependencies are resolved early.

## Supabase-First Architecture Benefits

- **Reduced Complexity**: No need for separate Express backend, Prisma ORM, Redis, or Socket.io
- **Integrated Auth**: OAuth providers configured directly in Supabase dashboard
- **Built-in Realtime**: Database subscriptions replace WebSocket infrastructure
- **Managed Storage**: Supabase Storage replaces S3/Cloudinary setup
- **Row Level Security**: Database-level security policies replace middleware
- **Automatic Scaling**: Supabase handles connection pooling and scaling
- **Developer Experience**: Single SDK for database, auth, storage, and realtime
- **Cost Effective**: Generous free tier and predictable pricing
