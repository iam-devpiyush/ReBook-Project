# Task 21: Admin Moderation API Routes - COMPLETE ✅

## Summary

Successfully implemented all admin moderation API routes for listing management. The routes provide comprehensive functionality for admins to review, approve, reject, and request rescans of listings.

## Completed Subtasks

### ✅ 21.1 - GET /api/admin/listings
- Fetches listings by status with pagination
- Supports filtering by status (pending_approval, active, rejected, etc.)
- Returns listings with book and seller details
- Includes pagination metadata
- Enforces max page size of 100

### ✅ 21.2 - PUT /api/admin/listings/[id]/approve
- Approves listings and makes them active
- Sets approved_at timestamp and approved_by admin ID
- Adds listing to Meilisearch index
- Publishes Supabase Realtime notification to seller
- Creates moderation log entry

### ✅ 21.3 - PUT /api/admin/listings/[id]/reject
- Rejects listings with required reason
- Validates reason is provided and under 500 characters
- Stores rejection reason
- Removes listing from Meilisearch index
- Publishes notification to seller with reason

### ✅ 21.4 - PUT /api/admin/listings/[id]/request-rescan
- Requests rescan of listing images
- Accepts optional notes (max 500 characters)
- Updates status to rescan_required
- Removes listing from Meilisearch index
- Publishes notification to seller with notes

## Files Created

### API Routes
1. `frontend/src/app/api/admin/listings/route.ts` - GET listings route
2. `frontend/src/app/api/admin/listings/[id]/approve/route.ts` - Approve route
3. `frontend/src/app/api/admin/listings/[id]/reject/route.ts` - Reject route
4. `frontend/src/app/api/admin/listings/[id]/request-rescan/route.ts` - Request rescan route

### Tests
5. `frontend/src/app/api/admin/listings/__tests__/route.test.ts` - GET route tests
6. `frontend/src/app/api/admin/listings/[id]/approve/__tests__/route.test.ts` - Approve tests
7. `frontend/src/app/api/admin/listings/[id]/reject/__tests__/route.test.ts` - Reject tests
8. `frontend/src/app/api/admin/listings/[id]/request-rescan/__tests__/route.test.ts` - Rescan tests

### Documentation
9. `frontend/src/app/api/admin/listings/README.md` - Comprehensive API documentation

### Service Export
10. `frontend/src/services/admin-approval.service.ts` - Service re-export for API routes

## Key Features

### Authentication & Authorization
- All routes require admin authentication via `requireAdmin` middleware
- Returns 401 for unauthenticated requests
- Returns 403 for non-admin users

### Validation
- Listing ID validation
- Status filter validation
- Pagination parameter validation
- Rejection reason validation (required, max 500 chars)
- Notes validation (optional, max 500 chars)
- JSON parsing with error handling

### Error Handling
- Appropriate HTTP status codes (400, 401, 403, 404, 500)
- Descriptive error messages
- Graceful handling of service failures

### Integration
- Uses `processAdminApproval` service from backend
- Integrates with Supabase for database operations
- Manages Meilisearch index automatically
- Publishes Supabase Realtime notifications

## API Endpoints

### GET /api/admin/listings
```
Query Parameters:
- status: Filter by status (optional)
- page: Page number (default: 1)
- pageSize: Items per page (default: 20, max: 100)

Response: Paginated listings with book and seller details
```

### PUT /api/admin/listings/[id]/approve
```
Path: /api/admin/listings/{listingId}/approve
Body: None required
Response: Updated listing with status "active"
```

### PUT /api/admin/listings/[id]/reject
```
Path: /api/admin/listings/{listingId}/reject
Body: { "reason": "string (required, max 500 chars)" }
Response: Updated listing with status "rejected"
```

### PUT /api/admin/listings/[id]/request-rescan
```
Path: /api/admin/listings/{listingId}/request-rescan
Body: { "notes": "string (optional, max 500 chars)" }
Response: Updated listing with status "rescan_required"
```

## Testing Coverage

### GET /api/admin/listings Tests
- ✅ Returns 401 if not authenticated
- ✅ Returns 403 if user is not admin
- ✅ Fetches all listings with default pagination
- ✅ Filters listings by status
- ✅ Returns 400 for invalid status
- ✅ Handles custom pagination parameters
- ✅ Enforces maximum page size of 100
- ✅ Returns 400 for invalid pagination parameters
- ✅ Returns 500 on database error

### Approve Route Tests
- ✅ Returns 401 if not authenticated
- ✅ Returns 403 if user is not admin
- ✅ Approves listing successfully
- ✅ Returns 404 if listing not found
- ✅ Returns 400 if listing status is invalid
- ✅ Returns 500 on service error

### Reject Route Tests
- ✅ Returns 401 if not authenticated
- ✅ Returns 403 if user is not admin
- ✅ Returns 400 if rejection reason is missing
- ✅ Returns 400 if rejection reason is empty
- ✅ Returns 400 if rejection reason exceeds 500 characters
- ✅ Rejects listing successfully
- ✅ Trims rejection reason before processing
- ✅ Returns 400 for invalid JSON
- ✅ Returns 404 if listing not found
- ✅ Returns 500 on service error

### Request Rescan Route Tests
- ✅ Returns 401 if not authenticated
- ✅ Returns 403 if user is not admin
- ✅ Requests rescan successfully without notes
- ✅ Requests rescan successfully with notes
- ✅ Trims notes before processing
- ✅ Returns 400 if notes exceed 500 characters
- ✅ Handles request without body
- ✅ Returns 400 for invalid JSON
- ✅ Returns 404 if listing not found
- ✅ Returns 400 if listing status is invalid
- ✅ Returns 500 on service error

## Requirements Satisfied

### Requirement 3.3 - Admin Pending Listings
✅ Admins can fetch all listings with status "pending_approval"

### Requirement 3.4 - Approve Listing
✅ Admins can approve listings, updating status to "active"

### Requirement 3.5 - Set Approval Metadata
✅ System sets approved_at timestamp and approved_by admin ID

### Requirement 3.6 - Add to Search Index
✅ Approved listings are added to Meilisearch index

### Requirement 3.7 - Reject Listing
✅ Admins can reject listings with required reason

### Requirement 3.8 - Request Rescan
✅ Admins can request rescan with optional notes

### Requirement 9.2 - Admin View Pending Listings
✅ Admin dashboard can fetch pending listings with pagination

## Integration Points

### Backend Services
- `backend/src/services/admin-approval.service.ts` - Core approval logic
- `backend/src/services/search.service.ts` - Meilisearch integration

### Authentication
- `frontend/src/lib/auth/middleware.ts` - Admin authentication middleware

### Database
- Supabase PostgreSQL for listing storage
- Row Level Security policies for access control

### Search
- Meilisearch index management
- Automatic add/remove on status changes

### Real-time
- Supabase Realtime for seller notifications
- Automatic broadcasts on database changes

## Usage Example

```typescript
// Admin component example
import { useState, useEffect } from 'react';

function AdminModerationPanel() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch pending listings
  const fetchPendingListings = async () => {
    setLoading(true);
    const response = await fetch('/api/admin/listings?status=pending_approval&page=1&pageSize=20');
    const data = await response.json();
    setListings(data.data);
    setLoading(false);
  };

  // Approve listing
  const approveListing = async (listingId: string) => {
    const response = await fetch(`/api/admin/listings/${listingId}/approve`, {
      method: 'PUT',
    });
    
    if (response.ok) {
      alert('Listing approved!');
      fetchPendingListings(); // Refresh list
    }
  };

  // Reject listing
  const rejectListing = async (listingId: string, reason: string) => {
    const response = await fetch(`/api/admin/listings/${listingId}/reject`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    
    if (response.ok) {
      alert('Listing rejected!');
      fetchPendingListings(); // Refresh list
    }
  };

  // Request rescan
  const requestRescan = async (listingId: string, notes?: string) => {
    const response = await fetch(`/api/admin/listings/${listingId}/request-rescan`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    
    if (response.ok) {
      alert('Rescan requested!');
      fetchPendingListings(); // Refresh list
    }
  };

  useEffect(() => {
    fetchPendingListings();
  }, []);

  return (
    <div>
      <h1>Pending Listings</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {listings.map((listing) => (
            <li key={listing.id}>
              <h3>{listing.book.title}</h3>
              <p>Seller: {listing.seller.name}</p>
              <p>Price: ₹{listing.final_price}</p>
              <button onClick={() => approveListing(listing.id)}>Approve</button>
              <button onClick={() => rejectListing(listing.id, 'Poor quality')}>Reject</button>
              <button onClick={() => requestRescan(listing.id, 'Need clearer images')}>
                Request Rescan
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## Next Steps

The admin moderation API routes are complete and ready for integration with the admin dashboard frontend components. Next tasks:

1. **Task 22**: Implement admin user management routes
2. **Task 23**: Implement platform statistics and analytics
3. **Task 24**: Implement moderation logging
4. **Task 25**: Build admin dashboard frontend components

## Notes

- All routes use the existing `processAdminApproval` service from Task 20
- Comprehensive test coverage ensures reliability
- Documentation provides clear API contracts
- Error handling follows REST best practices
- Integration with Meilisearch and Supabase Realtime is automatic

---

**Status**: ✅ COMPLETE
**Date**: 2024-01-01
**Requirements**: 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 9.2
