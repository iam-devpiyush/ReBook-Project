# Task 21: Admin Moderation Routes - Quick Reference

## API Endpoints

### 1. GET /api/admin/listings
Fetch listings by status with pagination.

```bash
# Fetch all pending listings
curl -X GET "http://localhost:3000/api/admin/listings?status=pending_approval&page=1&pageSize=20"

# Fetch all listings (any status)
curl -X GET "http://localhost:3000/api/admin/listings?page=1&pageSize=50"
```

**Query Parameters**:
- `status`: `pending_approval` | `active` | `rejected` | `rescan_required` | `sold` | `inactive`
- `page`: Page number (default: 1)
- `pageSize`: Items per page (default: 20, max: 100)

---

### 2. PUT /api/admin/listings/[id]/approve
Approve a listing.

```bash
curl -X PUT "http://localhost:3000/api/admin/listings/listing-123/approve"
```

**Side Effects**:
- Status → `active`
- Sets `approved_at` and `approved_by`
- Adds to Meilisearch index
- Notifies seller

---

### 3. PUT /api/admin/listings/[id]/reject
Reject a listing with reason.

```bash
curl -X PUT "http://localhost:3000/api/admin/listings/listing-123/reject" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Poor image quality"}'
```

**Required**:
- `reason`: String (max 500 chars)

**Side Effects**:
- Status → `rejected`
- Stores rejection reason
- Removes from Meilisearch index
- Notifies seller with reason

---

### 4. PUT /api/admin/listings/[id]/request-rescan
Request rescan of listing images.

```bash
# With notes
curl -X PUT "http://localhost:3000/api/admin/listings/listing-123/request-rescan" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Please provide clearer images of the spine"}'

# Without notes
curl -X PUT "http://localhost:3000/api/admin/listings/listing-123/request-rescan"
```

**Optional**:
- `notes`: String (max 500 chars)

**Side Effects**:
- Status → `rescan_required`
- Stores notes
- Removes from Meilisearch index
- Notifies seller with notes

---

## TypeScript Usage

```typescript
// Fetch pending listings
const fetchPendingListings = async () => {
  const response = await fetch('/api/admin/listings?status=pending_approval');
  const data = await response.json();
  return data.data; // Array of listings
};

// Approve listing
const approveListing = async (listingId: string) => {
  const response = await fetch(`/api/admin/listings/${listingId}/approve`, {
    method: 'PUT',
  });
  return response.json();
};

// Reject listing
const rejectListing = async (listingId: string, reason: string) => {
  const response = await fetch(`/api/admin/listings/${listingId}/reject`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  return response.json();
};

// Request rescan
const requestRescan = async (listingId: string, notes?: string) => {
  const response = await fetch(`/api/admin/listings/${listingId}/request-rescan`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  return response.json();
};
```

---

## Response Formats

### Success Response
```json
{
  "success": true,
  "data": { /* listing object */ },
  "message": "Listing approved successfully"
}
```

### Error Responses
```json
// 401 Unauthorized
{ "error": "Unauthorized: Authentication required" }

// 403 Forbidden
{ "error": "Forbidden: Admin role required" }

// 400 Bad Request
{ "error": "Rejection reason is required" }

// 404 Not Found
{ "error": "Listing not found" }

// 500 Internal Server Error
{ "error": "Internal server error" }
```

---

## Files Location

```
frontend/src/app/api/admin/listings/
├── route.ts                              # GET listings
├── [id]/
│   ├── approve/
│   │   ├── route.ts                      # PUT approve
│   │   └── __tests__/route.test.ts
│   ├── reject/
│   │   ├── route.ts                      # PUT reject
│   │   └── __tests__/route.test.ts
│   └── request-rescan/
│       ├── route.ts                      # PUT request-rescan
│       └── __tests__/route.test.ts
├── __tests__/route.test.ts               # GET tests
└── README.md                             # Full documentation
```

---

## Testing

```bash
# Run all admin moderation route tests
npm test frontend/src/app/api/admin/listings

# Run specific route tests
npm test frontend/src/app/api/admin/listings/__tests__/route.test.ts
npm test frontend/src/app/api/admin/listings/[id]/approve/__tests__/route.test.ts
npm test frontend/src/app/api/admin/listings/[id]/reject/__tests__/route.test.ts
npm test frontend/src/app/api/admin/listings/[id]/request-rescan/__tests__/route.test.ts
```

---

## Common Patterns

### Pagination
```typescript
const fetchListingsPage = async (page: number, pageSize: number = 20) => {
  const response = await fetch(
    `/api/admin/listings?page=${page}&pageSize=${pageSize}`
  );
  const data = await response.json();
  
  return {
    listings: data.data,
    pagination: data.pagination,
  };
};
```

### Error Handling
```typescript
const handleModeration = async (action: () => Promise<Response>) => {
  try {
    const response = await action();
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error);
    }
    
    return data;
  } catch (error) {
    console.error('Moderation action failed:', error);
    throw error;
  }
};
```

### Batch Operations
```typescript
const approveMultipleListings = async (listingIds: string[]) => {
  const results = await Promise.allSettled(
    listingIds.map(id => approveListing(id))
  );
  
  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  return { succeeded, failed };
};
```

---

## Requirements Mapping

| Route | Requirements |
|-------|-------------|
| GET /api/admin/listings | 3.3, 9.2 |
| PUT .../approve | 3.4, 3.5, 3.6 |
| PUT .../reject | 3.7 |
| PUT .../request-rescan | 3.8 |

---

## Related Documentation

- Full API docs: `frontend/src/app/api/admin/listings/README.md`
- Admin approval service: `backend/src/services/README_ADMIN_APPROVAL.md`
- Auth middleware: `frontend/src/lib/auth/MIDDLEWARE_USAGE.md`
- Task completion: `TASK_21_ADMIN_MODERATION_ROUTES_COMPLETE.md`
