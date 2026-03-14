# Admin Moderation API Routes

This directory contains API routes for admin moderation of listings.

## Overview

All routes in this directory require admin authentication. They provide functionality for:
- Fetching listings by status for review
- Approving listings to make them active
- Rejecting listings with reasons
- Requesting rescan of listing images

## Routes

### GET /api/admin/listings

Fetch listings by status with pagination.

**Authentication**: Admin required

**Query Parameters**:
- `status` (optional): Filter by listing status
  - Valid values: `pending_approval`, `active`, `sold`, `rejected`, `rescan_required`, `inactive`
  - Default: All statuses
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 20, max: 100)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "listing-123",
      "book_id": "book-123",
      "seller_id": "seller-123",
      "status": "pending_approval",
      "original_price": 500,
      "final_price": 450,
      "condition_score": 4,
      "created_at": "2024-01-01T00:00:00Z",
      "book": {
        "id": "book-123",
        "title": "Introduction to Algorithms",
        "author": "Thomas H. Cormen",
        "isbn": "9780262033848"
      },
      "seller": {
        "id": "seller-123",
        "name": "John Doe",
        "email": "john@example.com",
        "rating": 4.5
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 50,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

**Example Usage**:
```typescript
// Fetch pending listings
const response = await fetch('/api/admin/listings?status=pending_approval&page=1&pageSize=20', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
```

---

### PUT /api/admin/listings/[id]/approve

Approve a listing and make it active.

**Authentication**: Admin required

**Path Parameters**:
- `id`: Listing ID

**Request Body**: None required

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "listing-123",
    "status": "active",
    "approved_at": "2024-01-01T12:00:00Z",
    "approved_by": "admin-123",
    "book": { ... },
    "seller": { ... }
  },
  "message": "Listing approved successfully"
}
```

**Side Effects**:
- Updates listing status to "active"
- Sets `approved_at` timestamp
- Sets `approved_by` to admin user ID
- Adds listing to Meilisearch index
- Publishes Supabase Realtime notification to seller
- Creates moderation log entry

**Example Usage**:
```typescript
const response = await fetch('/api/admin/listings/listing-123/approve', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
```

**Requirements**: 3.4, 3.5, 3.6

---

### PUT /api/admin/listings/[id]/reject

Reject a listing with a reason.

**Authentication**: Admin required

**Path Parameters**:
- `id`: Listing ID

**Request Body**:
```json
{
  "reason": "Poor image quality - images are blurry and don't show book condition clearly"
}
```

**Validation**:
- `reason` is required and must not be empty
- `reason` must be 500 characters or less

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "listing-123",
    "status": "rejected",
    "rejection_reason": "Poor image quality - images are blurry and don't show book condition clearly",
    "book": { ... },
    "seller": { ... }
  },
  "message": "Listing rejected successfully"
}
```

**Side Effects**:
- Updates listing status to "rejected"
- Stores rejection reason
- Removes listing from Meilisearch index
- Publishes Supabase Realtime notification to seller with reason
- Creates moderation log entry

**Example Usage**:
```typescript
const response = await fetch('/api/admin/listings/listing-123/reject', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    reason: 'Poor image quality - images are blurry and don\'t show book condition clearly',
  }),
});

const data = await response.json();
```

**Requirements**: 3.7

---

### PUT /api/admin/listings/[id]/request-rescan

Request rescan of listing images.

**Authentication**: Admin required

**Path Parameters**:
- `id`: Listing ID

**Request Body** (optional):
```json
{
  "notes": "Please provide clearer images of the spine and back cover"
}
```

**Validation**:
- `notes` is optional
- `notes` must be 500 characters or less if provided

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "listing-123",
    "status": "rescan_required",
    "rejection_reason": "Please provide clearer images of the spine and back cover",
    "book": { ... },
    "seller": { ... }
  },
  "message": "Rescan requested successfully"
}
```

**Side Effects**:
- Updates listing status to "rescan_required"
- Stores notes in `rejection_reason` field
- Removes listing from Meilisearch index
- Publishes Supabase Realtime notification to seller with notes
- Creates moderation log entry

**Example Usage**:
```typescript
// With notes
const response = await fetch('/api/admin/listings/listing-123/request-rescan', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    notes: 'Please provide clearer images of the spine and back cover',
  }),
});

// Without notes
const response = await fetch('/api/admin/listings/listing-123/request-rescan', {
  method: 'PUT',
});

const data = await response.json();
```

**Requirements**: 3.8

---

## Error Responses

All routes return standard error responses:

### 401 Unauthorized
```json
{
  "error": "Unauthorized: Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden: Admin role required"
}
```

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": [ ... ]
}
```

### 404 Not Found
```json
{
  "error": "Listing not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Implementation Details

### Admin Approval Service

All moderation actions are processed through the `processAdminApproval` service function located in `backend/src/services/admin-approval.service.ts`.

The service handles:
1. Admin permission verification
2. Listing status validation
3. Database updates
4. Moderation log creation
5. Meilisearch index management
6. Supabase Realtime notifications

### Supabase Realtime Notifications

When a listing status changes, Supabase automatically broadcasts the change to subscribed clients via database triggers. Sellers can subscribe to changes on the `listings` table filtered by their `seller_id`.

Example subscription:
```typescript
const channel = supabase
  .channel('listing-updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'listings',
      filter: `seller_id=eq.${userId}`,
    },
    (payload) => {
      console.log('Listing updated:', payload);
    }
  )
  .subscribe();
```

### Meilisearch Index Management

- **Approve**: Adds listing to Meilisearch index for search
- **Reject**: Removes listing from Meilisearch index
- **Request Rescan**: Removes listing from Meilisearch index

Only listings with status "active" are searchable.

---

## Testing

Each route has comprehensive unit tests in the `__tests__` directory:
- `route.test.ts` - Tests for GET /api/admin/listings
- `approve/__tests__/route.test.ts` - Tests for approve route
- `reject/__tests__/route.test.ts` - Tests for reject route
- `request-rescan/__tests__/route.test.ts` - Tests for request-rescan route

Run tests:
```bash
npm test frontend/src/app/api/admin/listings
```

---

## Related Files

- `backend/src/services/admin-approval.service.ts` - Admin approval service
- `frontend/src/lib/auth/middleware.ts` - Authentication middleware
- `backend/src/services/search.service.ts` - Meilisearch service
- `supabase/migrations/20240101000000_initial_schema.sql` - Database schema
- `supabase/migrations/20240101000001_rls_policies.sql` - Row Level Security policies
