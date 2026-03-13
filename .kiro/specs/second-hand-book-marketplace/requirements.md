# Requirements Document: Second-Hand Academic Book Marketplace

## Introduction

The Second-Hand Academic Book Marketplace is a production-ready online platform connecting students selling used academic books with buyers seeking affordable educational materials. The system addresses inefficiencies in India's second-hand book market through structured discovery, AI-powered condition assessment with mobile scanning, automated pricing with real-time cost calculations, admin-moderated listings, secure payment processing, and integrated shipping logistics. The platform serves multiple educational segments including school books (K-12), competitive exam materials (JEE, NEET, UPSC), college textbooks, and general reading materials.

The platform operates as a search-first marketplace with a separate seller portal and comprehensive admin dashboard. Sellers list books using an AI scanner that works on both desktop (via QR code for mobile scanning) and mobile (direct camera access), capturing front cover, back cover, spine, and pages with automatic ISBN barcode detection and metadata fetching. All listings require admin approval before becoming visible in the marketplace. Buyers discover books through Meilisearch-powered search or category browsing, with listings prioritized by location proximity. The platform integrates real payment gateways and shipping APIs for end-to-end transaction management.

**Backend Architecture:** The platform uses **Supabase** as the primary backend infrastructure, providing PostgreSQL database, OAuth authentication (Google, Apple, Microsoft), file storage for images, and real-time subscriptions for live updates. The frontend communicates directly with Supabase via the Supabase JavaScript client.

The enhanced pricing engine calculates: FinalPrice = OriginalPrice × ConditionMultiplier + DeliveryCost + PlatformCommission + PaymentGatewayFees. The platform tracks environmental impact (trees saved, water saved, CO₂ reduced) and displays metrics on dashboards. This design promotes environmental sustainability by encouraging book reuse and reducing paper waste.

## Glossary

- **System**: The Second-Hand Academic Book Marketplace platform (web application, backend services, and database)
- **Supabase**: The primary backend infrastructure providing PostgreSQL database, authentication, storage, and realtime subscriptions
- **Seller**: A user who lists books for sale on the platform
- **Buyer**: A user who searches for and purchases books from the platform
- **Admin**: A user with administrative privileges who moderates listings and manages the platform
- **Listing**: A book offered for sale by a seller, including images, condition, and price
- **Supabase_Auth**: The authentication service that handles OAuth via Google, Apple, and Microsoft providers
- **Enhanced_AI_Scanner**: The AI service that detects ISBN barcodes, fetches metadata, and analyzes book condition
- **Enhanced_Pricing_Engine**: The service that calculates final prices including delivery costs, platform commission, and payment fees
- **Meilisearch_Service**: The search service that provides fast, typo-tolerant full-text search with faceted filtering
- **Order_Service**: The service that handles order creation, payment processing, and tracking
- **Payment_Gateway_Service**: The service that integrates with Stripe/Razorpay for payment processing
- **Shipping_API_Service**: The service that integrates with Delhivery/Shiprocket for delivery cost calculation and label generation
- **Supabase_Realtime**: The service that provides real-time updates via database subscriptions
- **Admin_Service**: The service that handles listing moderation, user management, and platform administration
- **Environmental_Impact_Service**: The service that calculates and tracks environmental impact metrics
- **Condition_Score**: An integer rating from 1 to 5 indicating book condition (5 = Like New, 4 = Very Good, 3 = Good, 2 = Acceptable, 1 = Poor)
- **Active_Listing**: A listing with status "active" that has been approved by an admin and is available for purchase
- **Seller_Portal**: The separate interface for sellers to manage listings and orders
- **Admin_Dashboard**: The comprehensive interface for admins to moderate listings, manage users, and view analytics
- **Supabase_Storage**: The file storage service for book images and scan photos
- **Moderation_Log**: A record of all admin actions for audit and compliance purposes

## Requirements

### Requirement 1: Supabase Authentication with OAuth

**User Story:** As a new user, I want to sign in using my Google, Apple, or Microsoft account via Supabase Auth, so that I can access the platform securely without creating a password.

#### Acceptance Criteria

1. WHEN a user initiates OAuth flow with a provider, THE Supabase_Auth SHALL redirect to the provider's authorization page
2. WHEN a user grants permission, THE Supabase_Auth SHALL exchange the authorization code for access and ID tokens
3. WHEN ID tokens are received, THE Supabase_Auth SHALL verify the token signature using the provider's public keys
4. WHEN a verified OAuth profile is received, THE Supabase_Auth SHALL find or create a user account in the users table
5. WHEN a user account is created from OAuth, THE System SHALL ensure the combination of (oauth_provider, oauth_provider_id) is unique
6. WHEN a user successfully authenticates, THE Supabase_Auth SHALL generate a secure session token (JWT)
7. WHEN a session token is generated, THE System SHALL store it as a secure, httpOnly cookie
8. WHEN a user logs out, THE Supabase_Auth SHALL invalidate the session token
9. WHEN a session token expires, THE System SHALL require the user to refresh the token or re-authenticate

### Requirement 2: Enhanced AI Scanner with ISBN Detection

**User Story:** As a seller, I want to scan my book using my mobile camera with automatic ISBN detection and metadata fetching, so that I can quickly create accurate listings.

#### Acceptance Criteria

1. WHEN a seller accesses the scanner on desktop, THE System SHALL generate a QR code for mobile camera access
2. WHEN a seller accesses the scanner on mobile, THE System SHALL open the camera interface directly
3. WHEN a seller captures images, THE System SHALL require front cover, back cover, spine, and pages images
4. WHEN images are captured, THE System SHALL upload them to Supabase Storage and return image URLs
5. WHEN the Enhanced_AI_Scanner analyzes cover images, THE Enhanced_AI_Scanner SHALL detect ISBN barcodes if present
6. WHEN an ISBN is detected, THE Enhanced_AI_Scanner SHALL fetch book metadata from an external book database API
7. WHEN metadata is fetched, THE System SHALL auto-fill the listing form with title, author, publisher, edition, and publication year
8. WHEN the Enhanced_AI_Scanner analyzes images, THE Enhanced_AI_Scanner SHALL evaluate cover damage, page quality, binding quality, markings, and discoloration
9. WHEN condition analysis is complete, THE Enhanced_AI_Scanner SHALL assign component scores between 1 and 5 for each factor
10. WHEN component scores are calculated, THE Enhanced_AI_Scanner SHALL compute an overall condition score between 1 and 5
11. WHEN AI scanning is in progress, THE Supabase_Realtime SHALL publish progress updates at 0%, 25%, 50%, 75%, and 100%
12. IF ISBN detection fails, THEN THE System SHALL allow manual ISBN entry or title/author entry

### Requirement 3: Admin Approval System

**User Story:** As an admin, I want to review and approve/reject listings before they become visible, so that I can maintain platform quality and prevent fraudulent listings.

#### Acceptance Criteria

1. WHEN a seller submits a listing, THE System SHALL create the listing with status "pending_approval"
2. WHEN a listing is created with status "pending_approval", THE Meilisearch_Service SHALL not add it to the search index
3. WHEN an admin requests pending listings, THE Admin_Service SHALL return all listings with status "pending_approval"
4. WHEN an admin approves a listing, THE Admin_Service SHALL update the listing status to "active"
5. WHEN a listing is approved, THE System SHALL set approved_at timestamp and approved_by to the admin's user ID
6. WHEN a listing is approved, THE Meilisearch_Service SHALL add the listing to the search index
7. WHEN an admin rejects a listing, THE Admin_Service SHALL update the listing status to "rejected" and store the rejection reason
8. WHEN an admin requests a rescan, THE Admin_Service SHALL update the listing status to "rescan_required" and store notes
9. WHEN an admin takes any moderation action, THE System SHALL create a moderation log entry with admin_id, action, target_type, target_id, reason, and timestamp
10. WHEN a listing status changes, THE Supabase_Realtime SHALL publish a real-time notification to the seller within 1 second
11. WHEN a listing is rejected or rescan is requested, THE notification SHALL include the reason or notes

### Requirement 4: Enhanced Pricing Calculation

**User Story:** As a buyer, I want to see transparent pricing that includes all costs (base price, delivery, commission, payment fees), so that I understand exactly what I'm paying.

#### Acceptance Criteria

1. WHEN the Enhanced_Pricing_Engine calculates pricing, THE Enhanced_Pricing_Engine SHALL apply condition multipliers: 5=0.80, 4=0.70, 3=0.60, 2=0.40, 1=0.25
2. WHEN calculating base price, THE Enhanced_Pricing_Engine SHALL multiply original price by the condition multiplier
3. WHEN calculating delivery cost, THE Enhanced_Pricing_Engine SHALL fetch real-time cost from the Shipping_API_Service based on seller and buyer locations
4. WHEN calculating platform commission, THE Enhanced_Pricing_Engine SHALL apply 10% of the base price
5. WHEN calculating payment fees, THE Enhanced_Pricing_Engine SHALL apply the formula: (base_price × 0.025) + 3.00
6. WHEN calculating final price, THE Enhanced_Pricing_Engine SHALL use the formula: base_price + delivery_cost + platform_commission + payment_fees
7. WHEN calculating seller payout, THE Enhanced_Pricing_Engine SHALL use the formula: base_price - platform_commission
8. WHEN displaying pricing, THE System SHALL show a complete breakdown with all components visible
9. WHEN final price is calculated, THE System SHALL round to the nearest rupee
10. WHEN pricing is displayed, THE System SHALL format all prices in Indian Rupees with the ₹ symbol

### Requirement 5: Meilisearch-Powered Search

**User Story:** As a buyer, I want to search for books with typo tolerance and fast results, so that I can quickly find the books I need even with spelling mistakes.

#### Acceptance Criteria

1. WHEN a buyer enters a search query, THE Meilisearch_Service SHALL perform typo-tolerant full-text search across titles, authors, subjects, and ISBNs
2. WHEN search results are returned, THE Meilisearch_Service SHALL include only listings with status "active"
3. WHEN a buyer applies category filters, THE Meilisearch_Service SHALL return only listings matching the specified category
4. WHEN a buyer applies condition filters, THE Meilisearch_Service SHALL return only listings with condition score greater than or equal to the specified minimum
5. WHEN a buyer applies price range filters, THE Meilisearch_Service SHALL return only listings with final price within the specified range
6. WHEN a buyer provides their location, THE Meilisearch_Service SHALL calculate proximity scores and prioritize nearby listings
7. WHEN search results are sorted by relevance, THE Meilisearch_Service SHALL order by search score descending, then proximity score descending
8. WHEN search results are sorted by price, THE Meilisearch_Service SHALL order by final price in the specified direction
9. WHEN search queries are executed, THE Meilisearch_Service SHALL return results within 200 milliseconds at the 95th percentile
10. WHEN a listing status changes to "active", THE System SHALL add the listing to the Meilisearch index
11. WHEN a listing status changes from "active" to any other status, THE System SHALL remove the listing from the Meilisearch index

### Requirement 6: Payment Gateway Integration

**User Story:** As a buyer, I want to pay securely using Stripe or Razorpay, so that my payment information is protected and transactions are reliable.

#### Acceptance Criteria

1. WHEN a buyer places an order, THE Payment_Gateway_Service SHALL create a payment intent with the order amount
2. WHEN a payment intent is created, THE System SHALL return a payment session to the frontend
3. WHEN a buyer completes payment, THE Payment_Gateway_Service SHALL verify the payment status with the gateway
4. WHEN payment is verified as successful, THE System SHALL update order payment_status to "completed" and order status to "paid"
5. WHEN payment is completed, THE System SHALL set the paid_at timestamp
6. WHEN payment fails, THE System SHALL update payment_status to "failed" and not create the order
7. WHEN a refund is requested, THE Payment_Gateway_Service SHALL process the refund through the payment gateway
8. WHEN a refund is processed, THE System SHALL update payment_status to "refunded" and store refund_amount and refund_reason
9. WHEN payment gateway webhooks are received, THE System SHALL verify webhook signatures before processing
10. WHEN payment transactions occur, THE System SHALL log all transactions for audit purposes

### Requirement 7: Shipping API Integration

**User Story:** As a buyer and seller, I want automated shipping label generation and tracking, so that I can easily ship and track my orders.

#### Acceptance Criteria

1. WHEN calculating delivery cost, THE Shipping_API_Service SHALL fetch real-time cost from the courier API based on origin, destination, and estimated weight
2. WHEN an order is paid, THE Shipping_API_Service SHALL generate a shipping label with tracking ID
3. WHEN a shipping label is generated, THE System SHALL create a shipping record with tracking_id, courier_name, and shipping_label_url
4. WHEN a shipping label is generated, THE System SHALL update the order with tracking_id and status "shipped"
5. WHEN a shipping label is generated, THE System SHALL set the shipped_at timestamp
6. WHEN shipment status updates are received, THE System SHALL update the shipping record with pickup, in_transit, out_for_delivery, and delivered timestamps
7. WHEN an order is delivered, THE System SHALL update order status to "delivered" and set delivered_at timestamp
8. WHEN tracking information is requested, THE System SHALL return current shipment status and location
9. WHEN shipping API is unavailable, THE System SHALL queue shipping label generation for retry with exponential backoff
10. WHEN shipment status changes, THE Supabase_Realtime SHALL publish real-time notifications to buyer and seller

### Requirement 8: Supabase Realtime Updates

**User Story:** As a user, I want to receive instant notifications about listing approvals, order status changes, and scan progress via Supabase Realtime, so that I stay informed without refreshing the page.

#### Acceptance Criteria

1. WHEN a user connects to Supabase Realtime, THE Supabase_Realtime SHALL authenticate the connection using the session token
2. WHEN authentication fails, THE Supabase_Realtime SHALL reject the subscription
3. WHEN a user subscribes to a table or channel, THE Supabase_Realtime SHALL verify the user has permission via Row Level Security policies
4. WHEN a listing is approved or rejected, THE Supabase_Realtime SHALL broadcast a message to subscribed clients
5. WHEN an order status changes, THE Supabase_Realtime SHALL broadcast messages to both buyer and seller subscriptions
6. WHEN AI scanning is in progress, THE Supabase_Realtime SHALL broadcast progress updates to the seller's subscription
7. WHEN a Realtime connection is dropped, THE System SHALL attempt automatic reconnection with exponential backoff
8. WHEN a user reconnects, THE System SHALL fetch missed updates from the database
9. WHEN a user has more than 3 concurrent Realtime connections, THE System SHALL disconnect the oldest connection
10. WHEN a Realtime connection is idle for more than 5 minutes, THE System SHALL automatically disconnect it

### Requirement 9: Admin Dashboard and User Management

**User Story:** As an admin, I want a comprehensive dashboard to manage listings, users, orders, and view analytics, so that I can effectively moderate and monitor the platform.

#### Acceptance Criteria

1. WHEN an admin accesses the dashboard, THE Admin_Service SHALL display platform statistics including total books listed, sold, active listings, and revenue metrics
2. WHEN an admin views pending listings, THE Admin_Service SHALL return all listings with status "pending_approval" with pagination
3. WHEN an admin suspends a user, THE Admin_Service SHALL set suspended_until timestamp and prevent the user from creating listings or placing orders
4. WHEN a suspended user attempts to create a listing, THE System SHALL reject the request with an appropriate error message
5. WHEN an admin warns a seller, THE System SHALL send a notification to the seller with the warning message
6. WHEN an admin sets a listing limit for a seller, THE System SHALL enforce the limit on future listing creation attempts
7. WHEN a seller exceeds their listing limit, THE System SHALL reject new listing creation with an appropriate error message
8. WHEN an admin resolves a dispute, THE Admin_Service SHALL update the order with resolution details
9. WHEN an admin issues a refund, THE Payment_Gateway_Service SHALL process the refund and update the order
10. WHEN an admin manages categories, THE Admin_Service SHALL allow create, update, and delete operations on the category hierarchy
11. WHEN an admin views moderation logs, THE System SHALL return all moderation actions with filters for date range, admin, and action type
12. WHEN an admin views analytics, THE System SHALL display charts for daily sales, listings per day, and revenue by category

### Requirement 10: Environmental Impact Tracking

**User Story:** As a user, I want to see the environmental impact of book reuse, so that I feel motivated to participate in sustainable practices.

#### Acceptance Criteria

1. WHEN calculating environmental impact, THE Environmental_Impact_Service SHALL use the formula: trees_saved = books_reused / 30
2. WHEN calculating water saved, THE Environmental_Impact_Service SHALL use the formula: water_saved_liters = books_reused × 50
3. WHEN calculating CO₂ reduced, THE Environmental_Impact_Service SHALL use the formula: co2_reduced_kg = books_reused × 2.5
4. WHEN a book is sold, THE System SHALL update the seller's eco_impact metrics
5. WHEN a book is purchased, THE System SHALL update the buyer's eco_impact metrics
6. WHEN displaying platform statistics, THE System SHALL show aggregate environmental impact for all books reused
7. WHEN a user views their profile, THE System SHALL display their personal environmental impact contribution
8. WHEN displaying environmental metrics, THE System SHALL round all values to 2 decimal places

### Requirement 11: Order Processing with Atomicity

**User Story:** As a buyer, I want to place orders without conflicts, so that I don't experience issues when multiple buyers try to purchase the same book.

#### Acceptance Criteria

1. WHEN a buyer places an order for an active listing, THE Order_Service SHALL create an order with status "pending_payment"
2. WHEN an order is created, THE System SHALL atomically update the listing status from "active" to "sold" within a database transaction
3. WHEN multiple buyers attempt to order the same listing simultaneously, THE System SHALL use database locking to ensure only one order succeeds
4. WHEN the first order succeeds, THE System SHALL update the listing status to "sold"
5. WHEN subsequent order attempts occur on a sold listing, THE Order_Service SHALL reject the orders with HTTP 409 Conflict error
6. WHEN an order creation fails due to concurrent access, THE System SHALL release the database lock within 30 seconds
7. WHEN an order is created, THE System SHALL store buyer_id, seller_id, book_id, price, delivery_cost, platform_commission, payment_fees, and seller_payout
8. WHEN an order is created, THE System SHALL store delivery_address and pickup_address
9. WHEN an order is created, THE System SHALL send notifications to both buyer and seller

### Requirement 12: Review and Rating System

**User Story:** As a buyer, I want to review sellers after receiving my order, so that I can share my experience and help other buyers make informed decisions.

#### Acceptance Criteria

1. WHEN a buyer submits a review, THE System SHALL verify the order status is "delivered"
2. WHEN a review is submitted, THE System SHALL ensure the reviewer is the buyer from the order
3. WHEN a review is created, THE System SHALL store rating (1-5), comment, reviewer_id, and reviewee_id
4. WHEN a review is submitted, THE System SHALL ensure only one review exists per order
5. WHEN a user's reviews are fetched, THE System SHALL return all reviews where the user is the reviewee
6. WHEN displaying user profiles, THE System SHALL calculate and display average rating from all reviews
7. WHEN a review comment is submitted, THE System SHALL validate it is non-empty and maximum 500 characters

### Requirement 13: Wishlist Functionality

**User Story:** As a buyer, I want to save books to a wishlist, so that I can easily find and purchase them later.

#### Acceptance Criteria

1. WHEN a buyer adds a book to wishlist, THE System SHALL create a wishlist entry with user_id and book_id
2. WHEN a buyer attempts to add a duplicate book to wishlist, THE System SHALL reject the request with an appropriate error
3. WHEN a buyer views their wishlist, THE System SHALL return all wishlist entries with book details
4. WHEN a buyer removes a book from wishlist, THE System SHALL delete the wishlist entry
5. WHEN displaying book details, THE System SHALL indicate if the book is in the user's wishlist

### Requirement 14: Category Hierarchy Management

**User Story:** As an admin, I want to manage a hierarchical category structure, so that books can be organized by type, board, class, exam, stream, and genre.

#### Acceptance Criteria

1. WHEN creating a category, THE Admin_Service SHALL allow specifying name, type, parent_id, and type-specific metadata
2. WHEN category type is "school", THE System SHALL store metadata for board and class_level
3. WHEN category type is "competitive_exam", THE System SHALL store metadata for exam_type
4. WHEN category type is "college", THE System SHALL store metadata for stream and year_semester
5. WHEN category type is "general", THE System SHALL store metadata for genre
6. WHEN a category has a parent_id, THE System SHALL verify the parent category exists
7. WHEN a category is created with parent_id, THE System SHALL ensure no circular references exist in the category tree
8. WHEN fetching categories, THE System SHALL return the complete hierarchy tree
9. WHEN a category is deleted, THE System SHALL prevent deletion if child categories or listings reference it

### Requirement 15: Seller Portal

**User Story:** As a seller, I want a dedicated portal to manage my listings, view orders, and track earnings, so that I can efficiently manage my sales.

#### Acceptance Criteria

1. WHEN a seller accesses the portal, THE System SHALL display all listings created by that seller
2. WHEN displaying seller listings, THE System SHALL show status, views, condition_score, final_price, and creation date
3. WHEN a seller views listings by status, THE System SHALL filter by "pending_approval", "active", "rejected", "rescan_required", "sold", or "inactive"
4. WHEN a seller edits a listing, THE System SHALL allow modifications only if status is "pending_approval", "active", or "rescan_required"
5. WHEN a seller deletes a listing, THE System SHALL allow deletion only if status is not "sold"
6. WHEN a seller views orders, THE System SHALL display all orders where the seller is the book owner
7. WHEN displaying seller orders, THE System SHALL show order status, buyer information, tracking details, and seller_payout
8. WHEN a seller views earnings, THE System SHALL display total sales, platform commission, payment fees, and net earnings
9. WHEN a seller views eco-impact, THE System SHALL display their environmental contribution from books sold

### Requirement 16: Platform Statistics and Analytics

**User Story:** As an admin, I want to view platform-wide statistics and analytics, so that I can monitor platform health and make data-driven decisions.

#### Acceptance Criteria

1. WHEN platform statistics are calculated, THE System SHALL aggregate total_books_listed, total_books_sold, active_listings, and total_users
2. WHEN calculating revenue metrics, THE System SHALL sum platform_commission_earned from all completed orders
3. WHEN displaying analytics, THE System SHALL show charts for daily sales, listings per day, and revenue by category
4. WHEN platform stats are requested, THE System SHALL cache results for 15 minutes to improve performance
5. WHEN generating daily statistics, THE System SHALL create one platform_stats record per day with unique date constraint
6. WHEN displaying environmental impact, THE System SHALL show platform-wide trees_saved, water_saved_liters, and co2_reduced_kg

### Requirement 17: Input Validation and Security

**User Story:** As a system administrator, I want all user inputs to be validated and sanitized, so that the platform is secure from malicious attacks.

#### Acceptance Criteria

1. WHEN a user submits an email address, THE System SHALL validate that it matches a valid email format
2. WHEN a user uploads an image, THE System SHALL validate that the file type is JPEG or PNG
3. WHEN a user uploads an image, THE System SHALL validate that the file size does not exceed 5MB
4. WHEN a user submits a price, THE System SHALL validate that it is a positive decimal value
5. WHEN a user submits a condition score, THE System SHALL validate that it is an integer between 1 and 5
6. WHEN a user submits a pincode, THE System SHALL validate that it is a 6-digit Indian pincode
7. WHEN any validation fails, THE System SHALL return HTTP 400 Bad Request with a descriptive error message
8. WHEN processing user inputs, THE System SHALL use parameterized queries to prevent SQL injection
9. WHEN displaying user-generated content, THE System SHALL sanitize HTML to prevent XSS attacks

### Requirement 18: Rate Limiting and Abuse Prevention

**User Story:** As a system administrator, I want to prevent abuse and excessive API usage, so that the platform remains available and performant for all users.

#### Acceptance Criteria

1. WHEN a user makes search requests, THE System SHALL limit requests to 100 per minute per IP address
2. WHEN a seller creates listings, THE System SHALL limit creation to 10 listings per hour per user
3. WHEN a buyer places orders, THE System SHALL limit orders to 20 per hour per user
4. WHEN a user fails OAuth authentication 5 times within 15 minutes, THE System SHALL temporarily lock the account
5. WHEN rate limits are exceeded, THE System SHALL return HTTP 429 Too Many Requests error
6. WHEN a user has a listing_limit set, THE System SHALL enforce the limit on listing creation
7. WHEN detecting suspicious patterns, THE System SHALL flag listings for admin review

### Requirement 19: Error Handling and Recovery

**User Story:** As a user, I want the system to handle errors gracefully and provide clear feedback, so that I understand what went wrong and how to proceed.

#### Acceptance Criteria

1. WHEN an OAuth provider is unavailable, THE System SHALL return HTTP 503 Service Unavailable and suggest alternative providers
2. WHEN ISBN detection fails, THE System SHALL allow manual ISBN entry or title/author entry
3. WHEN payment processing fails, THE System SHALL return HTTP 402 Payment Required with specific error details
4. WHEN shipping API is unavailable, THE System SHALL use cached delivery cost estimates and queue label generation for retry
5. WHEN Meilisearch index is out of sync, THE System SHALL trigger incremental sync and use database fallback for critical searches
6. WHEN a WebSocket connection is dropped, THE System SHALL attempt automatic reconnection with exponential backoff
7. WHEN a service fails to respond within timeout, THE System SHALL return HTTP 504 Gateway Timeout
8. WHEN an internal server error occurs, THE System SHALL log error details and return HTTP 500 Internal Server Error
9. WHEN the Condition_Scanner fails, THE System SHALL fall back to manual condition scoring

### Requirement 20: Data Persistence and Consistency

**User Story:** As a system administrator, I want all data to be persisted reliably in Supabase PostgreSQL and maintain consistency, so that no information is lost during operations.

#### Acceptance Criteria

1. WHEN a listing is created, THE System SHALL persist the listing to Supabase PostgreSQL with a unique UUID
2. WHEN an order is created, THE System SHALL ensure the listing status is updated atomically with the order creation using database transactions
3. WHEN a user updates their profile, THE System SHALL persist the changes and update the updated_at timestamp
4. WHEN multiple admins attempt to approve the same listing simultaneously, THE System SHALL use row-level locking to ensure only one action succeeds
5. WHEN a listing status changes to "sold", THE System SHALL ensure no other orders can be placed for that listing
6. WHEN critical operations fail, THE System SHALL roll back database transactions to maintain consistency

### Requirement 21: Image Storage and Optimization

**User Story:** As a seller or buyer, I want book images to load quickly and reliably via Supabase Storage, so that I can view book condition clearly.

#### Acceptance Criteria

1. WHEN a seller uploads an image, THE System SHALL compress the image to reduce file size while maintaining quality
2. WHEN an image is stored, THE System SHALL generate multiple sizes: thumbnail (200x200), medium (600x600), and full (1200x1200)
3. WHEN a buyer views a listing, THE System SHALL serve images from Supabase Storage with CDN delivery
4. WHEN an image fails to load, THE System SHALL display a placeholder image
5. WHEN images are displayed in a gallery, THE System SHALL implement lazy loading to improve page performance
6. WHEN images are uploaded, THE System SHALL strip EXIF data to protect user privacy
7. WHEN images are stored, THE System SHALL use signed URLs from Supabase Storage for secure access display a placeholder image
5. WHEN images are displayed in a gallery, THE System SHALL implement lazy loading to improve page performance
6. WHEN images are uploaded, THE System SHALL strip EXIF data to protect user privacy
7. WHEN images are stored, THE System SHALL use signed URLs for cloud storage access

### Requirement 22: Performance and Scalability

**User Story:** As a system administrator, I want the platform to handle high traffic and large data volumes, so that users experience fast and reliable service.

#### Acceptance Criteria

1. WHEN search queries are executed, THE Meilisearch_Service SHALL return results within 200 milliseconds at the 95th percentile
2. WHEN book detail pages are loaded, THE System SHALL respond within 300 milliseconds at the 95th percentile
3. WHEN AI scanning is performed, THE Enhanced_AI_Scanner SHALL complete analysis within 10 seconds at the 95th percentile
4. WHEN order placement occurs, THE System SHALL respond within 1 second at the 95th percentile
5. WHEN the platform has 10,000 concurrent users, THE System SHALL maintain response time targets
6. WHEN the platform has 100,000 active listings, THE Meilisearch_Service SHALL maintain search performance
7. WHEN popular search queries are executed, THE System SHALL cache results using Supabase or application-level caching with 5-minute TTL
8. WHEN book details are requested, THE System SHALL cache results with 1-hour TTL

### Requirement 23: Security and Data Protection

**User Story:** As a user, I want my personal and payment information to be secure, so that I can trust the platform with my data.

#### Acceptance Criteria

1. WHEN OAuth tokens are stored, THE System SHALL encrypt them at rest using AES-256
2. WHEN API communications occur, THE System SHALL use HTTPS/TLS 1.3
3. WHEN session tokens are set, THE System SHALL use secure, httpOnly cookies
4. WHEN payment data is processed, THE System SHALL never store credit card numbers or CVV
5. WHEN webhook signatures are received, THE System SHALL verify signatures before processing
6. WHEN admin actions are performed, THE System SHALL require re-authentication for sensitive operations
7. WHEN user data is accessed, THE System SHALL log access for audit trails
8. WHEN displaying phone numbers, THE System SHALL mask them in public listings
9. WHEN displaying addresses, THE System SHALL hide full addresses until order is confirmed

### Requirement 24: Moderation and Compliance

**User Story:** As an admin, I want comprehensive moderation tools and audit logs, so that I can maintain platform quality and comply with regulations.

#### Acceptance Criteria

1. WHEN an admin takes any moderation action, THE System SHALL create a moderation log entry
2. WHEN a moderation log is created, THE System SHALL store admin_id, action, target_type, target_id, reason, notes, and timestamp
3. WHEN an admin views moderation logs, THE System SHALL support filtering by date range, admin, action type, and target type
4. WHEN a listing remains pending for more than 48 hours, THE System SHALL send a notification to the admin dashboard
5. WHEN a user is suspended, THE System SHALL prevent all listing creation and order placement until suspension expires
6. WHEN fraudulent activity is detected, THE System SHALL flag the user and listings for admin review
7. WHEN a user requests data export, THE System SHALL provide all user data in machine-readable format
8. WHEN a user requests data deletion, THE System SHALL delete all personal data while maintaining transaction records for compliance

### Requirement 25: Notification System

**User Story:** As a user, I want to receive notifications about important events, so that I stay informed about my transactions.

#### Acceptance Criteria

1. WHEN an order is created, THE System SHALL send a confirmation notification to the buyer
2. WHEN a listing is approved, THE System SHALL send a notification to the seller
3. WHEN a listing is rejected, THE System SHALL send a notification to the seller with the rejection reason
4. WHEN pickup is scheduled, THE System SHALL send a notification to the seller with the pickup date
5. WHEN an order status changes to "shipped", THE System SHALL send notifications to both buyer and seller with tracking information
6. WHEN an order is delivered, THE System SHALL send a delivery confirmation notification to the buyer
7. WHEN a notification fails to send, THE System SHALL log the failure and retry up to 3 times with exponential backoff

