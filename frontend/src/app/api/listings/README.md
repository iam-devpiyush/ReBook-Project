# Listing Management API

This directory contains API routes for managing book listings in the marketplace.

## Requirements

- **2.1-2.10**: AI Scanner integration with listing creation
- **3.1, 3.2**: Admin approval system for listings
- **Listing detail view**: Fetch and display listing details
- **Listing editing**: Update listing information
- **Listing deletion**: Remove listings from the platform
- **Seller portal**: Manage seller's own listings

## API Routes

### POST /api/listings

Create a new book listing.

**Authentication**: Requires seller role

**Request Body**:
```typescript
{
  // Book information (if book doesn't exist)
  isbn?: string;
  title: string;
  author: string;
  publisher?: string;
  edition?: string;
  publication_year?: number;
  category_id: string; // UUID
  subject?: string;
  description?: string;
  
  // Listing details
  original_price: number; // Must be positive
  condition_score: number; // 1-5
  condition_details?: {
    cover_damage?: number; // 1-5
    page_quality?: number; // 1-5
    binding_quality?: number; // 1-5
    markings?: number; // 1-5
    discoloration?: number; // 1-5
    notes?: string;
  };
  images: string[]; // 1-10 image URLs from Supabase Storage
  location: {
    city: string;
    state: string;
    pincode: string; // 6-digit Indian pincode
    latitude?: number;
    longitude?: number;
  };
  
  // Pricing (from pricing engine)
  final_price: number;
  delivery_cost: number;
  platform_commission: number;
  payment_fees: number;
  seller_payout: number;
}
```

**Response** (201 Created):
```typescript
{
  success: true;
  data: {
    id: string;
    book_id: string;
    seller_id: string;
    status: "pending_approval"; // Always pending_approval on creation
    original_price: number;
    condition_score: number;
    final_price: number;
    // ... other listing fields
    book: { /* book details */ };
    seller: { /* seller details */ };
  };
  message: "Listing created successfully and submitted for admin approval";
}
```

**Error Responses**:
- `400 Bad Request`: Validation failed
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not a seller or listing limit reached
- `500 Internal Server Error`: Server error

**Features**:
- Validates all input data with Zod schemas
- Checks seller listing limits
- Creates or finds existing book record
- Creates listing with status "pending_approval"
- Returns listing with book and seller data

---

### GET /api/listings/[id]

Fetch a single listing by ID.

**Authentication**: None required (public endpoint)

**Path Parameters**:
- `id`: Listing UUID

**Response** (200 OK):
```typescript
{
  success: true;
  data: {
    id: string;
    book_id: string;
    seller_id: string;
    status: string;
    original_price: number;
    condition_score: number;
    final_price: number;
    delivery_cost: number;
    platform_commission: number;
    payment_fees: number;
    seller_payout: number;
    images: string[];
    location: object;
    views: number;
    created_at: string;
    updated_at: string;
    book: {
      id: string;
      isbn: string | null;
      title: string;
      author: string;
      publisher: string | null;
      edition: string | null;
      publication_year: number | null;
      category_id: string;
      subject: string | null;
      description: string | null;
      cover_image: string | null;
    };
    seller: {
      id: string;
      name: string;
      email: string;
      profile_picture: string | null;
      rating: number | null;
    };
  };
}
```

**Error Responses**:
- `400 Bad Request`: Invalid UUID format
- `404 Not Found`: Listing not found
- `500 Internal Server Error`: Server error

**Features**:
- Fetches listing with book and seller data
- Increments view count automatically
- Returns complete listing details

---

### PUT /api/listings/[id]

Update an existing listing.

**Authentication**: Requires seller role (must own the listing)

**Path Parameters**:
- `id`: Listing UUID

**Request Body** (all fields optional):
```typescript
{
  original_price?: number;
  condition_score?: number; // 1-5
  condition_details?: object;
  images?: string[]; // 1-10 URLs
  location?: object;
  final_price?: number;
  delivery_cost?: number;
  platform_commission?: number;
  payment_fees?: number;
  seller_payout?: number;
}
```

**Response** (200 OK):
```typescript
{
  success: true;
  data: { /* updated listing with book and seller */ };
  message: "Listing updated successfully";
}
```

**Error Responses**:
- `400 Bad Request`: Invalid data or listing status doesn't allow editing
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not the listing owner
- `404 Not Found`: Listing not found
- `500 Internal Server Error`: Server error

**Features**:
- Verifies seller owns the listing
- Only allows editing if status is: `pending_approval`, `active`, or `rescan_required`
- Validates all update data
- Returns updated listing with relations

**Editable Statuses**:
- `pending_approval`: Before admin review
- `active`: After approval
- `rescan_required`: When admin requests rescan

**Non-Editable Statuses**:
- `sold`: Listing has been purchased
- `rejected`: Listing was rejected by admin
- `inactive`: Listing was deactivated

---

### DELETE /api/listings/[id]

Delete a listing.

**Authentication**: Requires seller role (must own the listing)

**Path Parameters**:
- `id`: Listing UUID

**Response** (200 OK):
```typescript
{
  success: true;
  message: "Listing deleted successfully";
}
```

**Error Responses**:
- `400 Bad Request`: Cannot delete sold listings
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not the listing owner
- `404 Not Found`: Listing not found
- `500 Internal Server Error`: Server error

**Features**:
- Verifies seller owns the listing
- Prevents deletion of sold listings
- Permanently removes listing from database

**Deletion Rules**:
- ✅ Can delete: `pending_approval`, `active`, `rejected`, `rescan_required`, `inactive`
- ❌ Cannot delete: `sold`

---

### GET /api/listings/seller/me

Fetch all listings for the authenticated seller.

**Authentication**: Requires seller role

**Query Parameters**:
- `status` (optional): Filter by status (`pending_approval`, `active`, `sold`, `rejected`, `rescan_required`, `inactive`)
- `page` (optional): Page number (default: 1)
- `page_size` (optional): Items per page (default: 20, max: 100)

**Response** (200 OK):
```typescript
{
  success: true;
  data: [
    {
      id: string;
      book_id: string;
      seller_id: string;
      status: string;
      original_price: number;
      condition_score: number;
      final_price: number;
      images: string[];
      views: number;
      created_at: string;
      updated_at: string;
      book: { /* book details */ };
    },
    // ... more listings
  ];
  pagination: {
    page: number;
    page_size: number;
    total_count: number;
    total_pages: number;
    has_next_page: boolean;
    has_previous_page: boolean;
  };
}
```

**Error Responses**:
- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not a seller
- `500 Internal Server Error`: Server error

**Features**:
- Returns only listings owned by authenticated seller
- Supports filtering by status
- Includes pagination metadata
- Orders by creation date (newest first)
- Includes book details for each listing

---

## Listing Status Flow

```
pending_approval → active → sold
       ↓              ↓
   rejected      inactive
       ↓
rescan_required → pending_approval
```

**Status Descriptions**:
- `pending_approval`: Newly created, awaiting admin review
- `active`: Approved by admin, visible in marketplace
- `sold`: Purchased by a buyer
- `rejected`: Rejected by admin with reason
- `rescan_required`: Admin requested better images/rescan
- `inactive`: Seller deactivated the listing

---

## Validation Rules

### Price Validation
- `original_price`: Must be positive number
- `final_price`: Must be positive number
- `delivery_cost`: Must be non-negative
- `platform_commission`: Must be non-negative
- `payment_fees`: Must be non-negative
- `seller_payout`: Must be positive number

### Condition Validation
- `condition_score`: Integer between 1 and 5
- `condition_details.*`: Each score between 1 and 5
- `condition_details.notes`: Max 500 characters

### Image Validation
- Minimum: 1 image required
- Maximum: 10 images allowed
- Must be valid URLs (from Supabase Storage)

### Location Validation
- `city`: Required, non-empty string
- `state`: Required, non-empty string
- `pincode`: Required, 6-digit Indian pincode
- `latitude`: Optional, between -90 and 90
- `longitude`: Optional, between -180 and 180

### Book Validation
- `title`: Required, max 500 characters
- `author`: Required, max 200 characters
- `publisher`: Optional, max 200 characters
- `edition`: Optional, max 100 characters
- `publication_year`: Optional, between 1900 and current year + 1
- `category_id`: Required, valid UUID
- `subject`: Optional, max 200 characters
- `description`: Optional, max 2000 characters

---

## Listing Limits

Sellers can have listing limits set by admins:
- `-1`: Unlimited listings (default)
- `> 0`: Maximum number of active + pending listings

When limit is reached:
- New listing creation returns `403 Forbidden`
- Response includes current count and limit

---

## Security Features

1. **Authentication**: All write operations require authentication
2. **Authorization**: Sellers can only modify their own listings
3. **Validation**: All inputs validated with Zod schemas
4. **Status Checks**: Prevents invalid state transitions
5. **Listing Limits**: Enforces admin-set limits
6. **UUID Validation**: Validates all UUID parameters

---

## Integration with Other Systems

### AI Scanner
- Listings created after AI scan with detected ISBN and metadata
- Condition score and details from AI analysis
- Images uploaded to Supabase Storage first

### Pricing Engine
- Final price calculated before listing creation
- Includes delivery cost, commission, and fees
- Seller payout calculated automatically

### Admin Dashboard
- All new listings start as `pending_approval`
- Admins review and approve/reject listings
- Status updates trigger real-time notifications

### Meilisearch
- Active listings indexed for search
- Pending/rejected listings not searchable
- Index updated on status changes

---

## Testing

Run tests:
```bash
npm test src/app/api/listings
```

Test files:
- `__tests__/route.test.ts`: POST /api/listings tests
- `[id]/__tests__/route.test.ts`: GET, PUT, DELETE tests

---

## Example Usage

### Create Listing
```typescript
const response = await fetch('/api/listings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Introduction to Algorithms',
    author: 'Thomas H. Cormen',
    category_id: 'uuid-here',
    original_price: 500,
    condition_score: 4,
    images: ['https://storage.supabase.co/...'],
    location: {
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
    },
    final_price: 550,
    delivery_cost: 50,
    platform_commission: 50,
    payment_fees: 15,
    seller_payout: 450,
  }),
});
```

### Get Listing
```typescript
const response = await fetch('/api/listings/uuid-here');
const { data } = await response.json();
```

### Update Listing
```typescript
const response = await fetch('/api/listings/uuid-here', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    original_price: 450,
    final_price: 500,
  }),
});
```

### Delete Listing
```typescript
const response = await fetch('/api/listings/uuid-here', {
  method: 'DELETE',
});
```

### Get Seller's Listings
```typescript
const response = await fetch('/api/listings/seller/me?status=active&page=1&page_size=20');
const { data, pagination } = await response.json();
```
