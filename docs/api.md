# API Documentation

All API routes are under `/api/`. Authentication uses Supabase session cookies set by the OAuth flow.

## Authentication

Most routes require a valid session. Unauthenticated requests return `401 Unauthorized`. Admin-only routes return `403 Forbidden` for non-admin users.

---

## Auth

### POST /api/auth/callback
Handles the OAuth redirect from Supabase Auth. Exchanges the code for a session and redirects to the dashboard.

### POST /api/auth/signout
Signs out the current user and clears session cookies.

### GET /api/auth/me
Returns the current authenticated user's profile.

**Response**
```json
{ "user": { "id": "uuid", "email": "...", "name": "...", "role": "buyer|seller|admin" } }
```

---

## Listings

### POST /api/listings
Create a new listing. Requires authentication. Listing is created with `status: "pending_approval"`.

**Request body**
```json
{
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "isbn": "9780132350884",
  "publisher": "Prentice Hall",
  "edition": "1st",
  "publication_year": 2008,
  "category_id": "uuid-or-name",
  "original_price": 500,
  "condition_score": 4,
  "images": ["https://..."],
  "location": { "city": "Mumbai", "state": "Maharashtra", "pincode": "400001" },
  "final_price": 350,
  "delivery_cost": 50,
  "platform_commission": 35,
  "payment_fees": 10,
  "seller_payout": 255,
  "scan_id": "uuid"
}
```

**Response** `201`
```json
{ "success": true, "data": { "id": "uuid", "status": "pending_approval", ... }, "message": "Listing submitted for admin approval" }
```

### GET /api/listings/:id
Fetch a listing by ID. Increments view count.

### PUT /api/listings/:id
Update a listing. Seller must own the listing.

### DELETE /api/listings/:id
Delete a listing. Seller must own it and it must not be `sold`.

### GET /api/listings/seller/me
Fetch all listings for the authenticated seller. Supports `?status=` filter.

---

## Search

### GET /api/search
Search listings via Meilisearch.

**Query params**
| Param | Type | Description |
|---|---|---|
| `q` | string | Search query |
| `category` | string | Filter by category ID |
| `min_price` | number | Minimum final price |
| `max_price` | number | Maximum final price |
| `condition` | number | Minimum condition score (1-5) |
| `sort_by` | string | `relevance`, `price_asc`, `price_desc`, `condition`, `date`, `proximity` |
| `lat` | number | User latitude (required for proximity sort) |
| `lng` | number | User longitude (required for proximity sort) |
| `page` | number | Page number (default: 1) |
| `page_size` | number | Results per page (default: 20, max: 50) |

**Response** `200`
```json
{
  "success": true,
  "data": [{ "id": "...", "title": "...", "final_price": 350, ... }],
  "pagination": { "page": 1, "page_size": 20, "total_hits": 42, "total_pages": 3 }
}
```

### GET /api/search/autocomplete?q=:query
Returns up to 10 autocomplete suggestions.

### GET /api/search/facets
Returns facet counts for categories, condition scores, and price ranges.

---

## Orders

### POST /api/orders
Place an order. Requires authentication. Atomically marks the listing as `sold`.

**Request body**
```json
{
  "listing_id": "uuid",
  "delivery_address": {
    "name": "Piyush",
    "phone": "9800000000",
    "address_line1": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  }
}
```

**Response** `201`
```json
{ "success": true, "data": { "id": "uuid", "status": "pending_payment", "total_amount": 400 } }
```

**Error responses**
- `409` — listing already sold (concurrent order)
- `403` — seller cannot buy their own listing

### GET /api/orders
Fetch orders for the authenticated user (buyer or seller view).

### GET /api/orders/:id
Fetch a single order. User must be buyer or seller.

### PUT /api/orders/:id/cancel
Cancel an order. Triggers refund if payment was completed.

---

## Payments

### POST /api/payments/create-intent
Create a Razorpay order for a paid order. Returns the Razorpay order ID and key for the frontend checkout modal.

**Request body**
```json
{ "order_id": "uuid" }
```

**Response** `200`
```json
{
  "success": true,
  "data": {
    "razorpayOrderId": "order_xxx",
    "clientSecret": "order_xxx",
    "amount": 400,
    "currency": "INR",
    "keyId": "rzp_test_..."
  }
}
```

### POST /api/payments/verify
Verify Razorpay payment signature after the checkout modal closes. Called by the frontend.

**Request body**
```json
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "...",
  "order_id": "uuid"
}
```

**Response** `200`
```json
{ "success": true, "data": { "paymentId": "pay_xxx", "status": "completed" } }
```

### POST /api/payments/webhook
Razorpay webhook endpoint. Verifies HMAC-SHA256 signature. Handles `payment.captured`, `payment.failed`, `refund.processed`.

Header: `x-razorpay-signature: <hmac>`

### POST /api/payments/:id/refund
Admin only. Process a full or partial refund.

**Request body**
```json
{ "amount": 200, "reason": "Item not as described" }
```

---

## Shipping

### POST /api/shipping/generate-label
Generate a Shiprocket shipping label for a paid order. Creates the shipment, assigns the cheapest courier, and returns the label PDF URL.

**Request body**
```json
{ "order_id": "uuid" }
```

**Response** `200`
```json
{
  "success": true,
  "data": {
    "trackingId": "AWB123456",
    "labelUrl": "https://...",
    "courier": "Delhivery",
    "estimatedDeliveryDays": 3,
    "pickupInstructions": "..."
  }
}
```

### GET /api/shipping/track/:trackingId
Fetch live shipment status from Shiprocket.

**Response** `200`
```json
{
  "success": true,
  "data": {
    "trackingId": "AWB123456",
    "status": "in_transit",
    "currentLocation": "Sorting Facility, Mumbai",
    "estimatedDelivery": "2024-12-25T00:00:00Z",
    "events": [{ "timestamp": "...", "location": "...", "description": "..." }]
  }
}
```

### POST /api/shipping/webhook
Shiprocket webhook for shipment status updates. Updates order status and broadcasts via Supabase Realtime.

---

## AI Scanner

### POST /api/ai/scan
Run AI book scan on uploaded images. Returns ISBN, metadata, and condition analysis.

**Request body**
```json
{
  "images": {
    "front_cover": "https://...",
    "back_cover": "https://...",
    "spine": "https://...",
    "pages": "https://..."
  },
  "scan_id": "uuid"
}
```

**Response** `200`
```json
{
  "success": true,
  "result": {
    "scan_id": "uuid",
    "detected_isbn": "9780132350884",
    "book_metadata": { "title": "...", "author": "...", "original_price": 500 },
    "condition_analysis": { "overall_score": 4, "cover_damage": 4, ... },
    "original_price": 500,
    "status": "completed"
  }
}
```

### POST /api/ai/upload-images
Upload book images to Supabase Storage (EXIF stripped). Returns public URLs.

**Request body**
```json
{
  "scan_id": "uuid",
  "images": { "front_cover": "data:image/jpeg;base64,...", ... }
}
```

### POST /api/ai/validate-image
Validate image type (JPEG/PNG/WebP) and size (≤5MB).

---

## Admin

### GET /api/admin/listings?status=pending_approval
Fetch listings by status. Admin only.

### PUT /api/admin/listings/:id/approve
Approve a listing. Sets status to `active` and indexes in Meilisearch.

### PUT /api/admin/listings/:id/reject
Reject a listing. Requires `reason` in body.

### PUT /api/admin/listings/:id/request-rescan
Request seller to rescan the book.

### GET /api/admin/users
Fetch all users with filters.

### PUT /api/admin/users/:id/suspend
Suspend a user until a given date.

### POST /api/admin/users/:id/warn
Send a warning notification to a user.

### GET /api/admin/stats
Platform statistics (cached 15 min).

### GET /api/admin/analytics
Charts data: daily sales, listings per day, revenue by category.

### GET /api/admin/moderation-logs
Moderation action history with filters.

---

## Pricing

### POST /api/pricing/calculate
Calculate pricing breakdown for a listing.

**Request body**
```json
{
  "original_price": 500,
  "condition_score": 4,
  "seller_location": { "city": "Mumbai", "state": "Maharashtra", "pincode": "400001" },
  "buyer_location": { "city": "Delhi", "state": "Delhi", "pincode": "110001" },
  "weight": 0.5
}
```

**Response** `200`
```json
{
  "data": {
    "base_price": 350,
    "delivery_cost": 80,
    "platform_commission": 35,
    "payment_fees": 12,
    "final_price": 477,
    "seller_payout": 315
  }
}
```

---

## Error Responses

All errors follow this shape:

```json
{ "error": "Human-readable message", "details": { ... } }
```

| Status | Meaning |
|---|---|
| 400 | Bad request / validation failed |
| 401 | Not authenticated |
| 403 | Forbidden (wrong role or ownership) |
| 404 | Resource not found |
| 409 | Conflict (e.g. listing already sold) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
