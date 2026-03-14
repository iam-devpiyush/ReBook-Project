# Admin Approval Service

## Overview

The Admin Approval Service handles all admin moderation actions for listings in the Second-Hand Academic Book Marketplace. This service implements Requirements 3.3-3.11 from the design specification.

## Features

### Core Functionality

1. **Listing Approval** - Approve pending listings and make them active
2. **Listing Rejection** - Reject listings with a reason
3. **Rescan Requests** - Request sellers to rescan book images
4. **Moderation Logging** - Track all admin actions for audit purposes
5. **Meilisearch Integration** - Automatically manage search index
6. **Realtime Notifications** - Supabase Realtime broadcasts status changes

## API Reference

### `processAdminApproval(params)`

Process an admin approval action for a listing.

**Parameters:**
```typescript
interface ProcessAdminApprovalParams {
  listingId: string;      // UUID of the listing
  adminId: string;        // UUID of the admin user
  action: 'approve' | 'reject' | 'request_rescan';
  reason?: string;        // Required for 'reject' action
  notes?: string;         // Optional notes for any action
}
```

**Returns:**
```typescript
interface AdminApprovalResult {
  success: boolean;
  listing?: any;          // Updated listing data if successful
  error?: string;         // Error message if failed
}
```

**Workflow:**
1. Verifies admin permissions (role must be 'admin')
2. Validates listing status (must be 'pending_approval' or 'rescan_required')
3. Updates listing status based on action:
   - `approve`: Sets status to 'active', adds approved_at and approved_by
   - `reject`: Sets status to 'rejected', stores rejection_reason
   - `request_rescan`: Sets status to 'rescan_required', stores notes
4. Creates moderation log entry
5. Manages Meilisearch index:
   - Adds listing to index on approval
   - Removes listing from index on rejection or rescan request
6. Supabase Realtime automatically broadcasts changes to seller

**Example Usage:**
```typescript
import { processAdminApproval } from './services/admin-approval.service';

// Approve a listing
const result = await processAdminApproval({
  listingId: 'listing-uuid',
  adminId: 'admin-uuid',
  action: 'approve',
});

// Reject a listing
const result = await processAdminApproval({
  listingId: 'listing-uuid',
  adminId: 'admin-uuid',
  action: 'reject',
  reason: 'Images are blurry and unclear',
});

// Request rescan
const result = await processAdminApproval({
  listingId: 'listing-uuid',
  adminId: 'admin-uuid',
  action: 'request_rescan',
  notes: 'Please provide clearer images of the book spine',
});
```

### `getPendingListings(page, pageSize)`

Fetch pending listings for admin review with pagination.

**Parameters:**
- `page` (number): Page number (1-indexed), default: 1
- `pageSize` (number): Number of listings per page, default: 20

**Returns:**
```typescript
{
  listings: any[];      // Array of pending listings with book and seller data
  total: number;        // Total count of pending listings
  error?: string;       // Error message if failed
}
```

**Example Usage:**
```typescript
import { getPendingListings } from './services/admin-approval.service';

// Get first page of pending listings
const { listings, total } = await getPendingListings(1, 20);

console.log(`Found ${total} pending listings`);
listings.forEach(listing => {
  console.log(`${listing.books.title} by ${listing.books.author}`);
});
```

## Requirements Validation

### Requirement 3.3: Pending Approval Status
✅ Listings start with status "pending_approval" (enforced by database default)

### Requirement 3.4: Admin Approval
✅ Admin can approve listings (status → "active")
✅ Approved listings get approved_at timestamp and approved_by admin ID

### Requirement 3.5: Admin Rejection
✅ Admin can reject listings (status → "rejected")
✅ Rejected listings store rejection_reason

### Requirement 3.6: Rescan Requests
✅ Admin can request rescan (status → "rescan_required")
✅ Rescan requests store notes in rejection_reason field

### Requirement 3.7: Meilisearch Index Management
✅ Pending listings are NOT in Meilisearch index
✅ Approved listings are added to Meilisearch index
✅ Rejected/rescan listings are removed from Meilisearch index

### Requirement 3.8: Moderation Logs
✅ All moderation actions create moderation log entries
✅ Logs include admin_id, action, target_type, target_id, reason, notes, timestamp

### Requirement 3.9: Realtime Notifications
✅ Supabase Realtime automatically publishes database changes
✅ Sellers can subscribe to listings table filtered by seller_id

### Requirement 3.10: Permission Validation
✅ Only users with role='admin' can perform approval actions
✅ Non-admin attempts are rejected with error message

### Requirement 3.11: Status Validation
✅ Only listings with status 'pending_approval' or 'rescan_required' can be processed
✅ Invalid status attempts are rejected with error message

## Property-Based Tests

The service includes comprehensive property-based tests that verify:

### Test 20.2: Admin Approval Requirement
- Only admins can approve listings
- Approved listings get approved_at timestamp and approved_by admin ID
- Approved listings transition to "active" status
- Non-admins cannot approve listings

### Test 20.3: Listing Status Transitions
- Listings start with status "pending_approval"
- Admin can approve (status → "active")
- Admin can reject (status → "rejected") with reason
- Admin can request rescan (status → "rescan_required")
- Moderation log entries are created for all actions
- Rejection stores rejection_reason
- Only pending_approval listings can be processed
- Rejection requires a reason

**Running Tests:**
```bash
# Run all property tests
npm run test:properties

# Run admin approval tests specifically
npx jest --testPathPatterns=properties/admin-approval --runInBand
```

**Note:** Tests require a running Supabase instance with the database schema applied. Configure test environment variables in `backend/.env.test`:
```
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Database Schema

### Listings Table
```sql
CREATE TABLE public.listings (
  id UUID PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending_approval',
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.users(id),
  rejection_reason TEXT,
  ...
);
```

### Moderation Logs Table
```sql
CREATE TABLE public.moderation_logs (
  id UUID PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.users(id),
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'request_rescan', ...)),
  target_type TEXT NOT NULL CHECK (target_type IN ('listing', 'user', 'order')),
  target_id UUID NOT NULL,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Error Handling

The service handles the following error cases:

1. **Admin Not Found** - Returns error if admin ID doesn't exist
2. **Invalid Permissions** - Returns error if user is not an admin
3. **Listing Not Found** - Returns error if listing ID doesn't exist
4. **Invalid Status** - Returns error if listing status is not pending_approval or rescan_required
5. **Missing Reason** - Returns error if rejecting without a reason
6. **Database Errors** - Logs and returns error for database operation failures
7. **Meilisearch Errors** - Logs but doesn't fail operation if indexing fails

## Integration Points

### Supabase
- User authentication and role verification
- Listing and moderation log storage
- Automatic Realtime broadcasts on database changes

### Meilisearch
- Add approved listings to search index
- Remove rejected/rescan listings from search index
- Maintains search index consistency with listing status

### Logging
- Winston logger for all operations
- Error logging for debugging
- Info logging for successful operations

## Future Enhancements

1. **Batch Approval** - Approve multiple listings at once
2. **Approval Rules** - Automated approval based on seller reputation
3. **Notification Service** - Explicit notification service instead of relying on Realtime
4. **Analytics** - Track approval rates, rejection reasons, and admin performance
5. **Approval Queue** - Priority queue for listings based on age or seller tier
