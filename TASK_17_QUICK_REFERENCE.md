# Task 17: Listing Management API - Quick Reference

## API Endpoints

### Create Listing
```bash
POST /api/listings
Authorization: Required (Seller)

{
  "title": "Book Title",
  "author": "Author Name",
  "category_id": "uuid",
  "original_price": 500,
  "condition_score": 4,
  "images": ["url1", "url2"],
  "location": {
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  },
  "final_price": 550,
  "delivery_cost": 50,
  "platform_commission": 50,
  "payment_fees": 15,
  "seller_payout": 450
}

Response: 201 Created
{
  "success": true,
  "data": { /* listing with status: "pending_approval" */ },
  "message": "Listing created successfully and submitted for admin approval"
}
```

### Get Listing
```bash
GET /api/listings/{id}
Authorization: None

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "active",
    "original_price": 500,
    "final_price": 550,
    "views": 42,
    "book": { /* book details */ },
    "seller": { /* seller details */ }
  }
}
```

### Update Listing
```bash
PUT /api/listings/{id}
Authorization: Required (Seller, must own listing)

{
  "original_price": 450,
  "final_price": 500
}

Response: 200 OK
{
  "success": true,
  "data": { /* updated listing */ },
  "message": "Listing updated successfully"
}
```

### Delete Listing
```bash
DELETE /api/listings/{id}
Authorization: Required (Seller, must own listing)

Response: 200 OK
{
  "success": true,
  "message": "Listing deleted successfully"
}
```

### Get Seller's Listings
```bash
GET /api/listings/seller/me?status=active&page=1&page_size=20
Authorization: Required (Seller)

Response: 200 OK
{
  "success": true,
  "data": [ /* array of listings */ ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_count": 45,
    "total_pages": 3,
    "has_next_page": true,
    "has_previous_page": false
  }
}
```

## Listing Status Flow

```
Create → pending_approval → active → sold
              ↓               ↓
          rejected       inactive
              ↓
       rescan_required
```

## Edit Permissions

| Status | Can Edit? | Can Delete? |
|--------|-----------|-------------|
| pending_approval | ✅ Yes | ✅ Yes |
| active | ✅ Yes | ✅ Yes |
| rescan_required | ✅ Yes | ✅ Yes |
| sold | ❌ No | ❌ No |
| rejected | ❌ No | ✅ Yes |
| inactive | ❌ No | ✅ Yes |

## Validation Quick Check

### Required Fields
- ✅ title (1-500 chars)
- ✅ author (1-200 chars)
- ✅ category_id (UUID)
- ✅ original_price (positive)
- ✅ condition_score (1-5)
- ✅ images (1-10 URLs)
- ✅ location (city, state, pincode)
- ✅ final_price (positive)
- ✅ delivery_cost (≥0)
- ✅ platform_commission (≥0)
- ✅ payment_fees (≥0)
- ✅ seller_payout (positive)

### Optional Fields
- isbn
- publisher
- edition
- publication_year
- subject
- description
- condition_details

## Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 400 | Validation failed | Check request body format |
| 401 | Not authenticated | Login required |
| 403 | Not authorized | Check seller role or ownership |
| 404 | Listing not found | Verify listing ID |
| 500 | Server error | Check logs, retry |

## Files Location

```
frontend/src/
├── app/api/listings/
│   ├── route.ts                    # POST /api/listings
│   ├── [id]/route.ts               # GET, PUT, DELETE /api/listings/[id]
│   ├── seller/me/route.ts          # GET /api/listings/seller/me
│   ├── __tests__/route.test.ts
│   └── README.md
├── types/listing.ts                # TypeScript types
└── lib/validation/listing.ts       # Zod schemas
```

## Testing

```bash
# Run all listing tests
npm test src/app/api/listings

# Run specific test file
npm test src/app/api/listings/__tests__/route.test.ts
```

## Integration Example

```typescript
// Create listing after AI scan
const scanResult = await fetch('/api/ai/scan', { ... });
const { isbn, metadata, condition } = await scanResult.json();

const pricing = await fetch('/api/pricing/calculate', { ... });
const { final_price, delivery_cost, ... } = await pricing.json();

const listing = await fetch('/api/listings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    isbn: isbn,
    title: metadata.title,
    author: metadata.author,
    condition_score: condition.overall_score,
    condition_details: condition.details,
    images: scanResult.images,
    ...pricing,
  }),
});
```

## Listing Limits

```typescript
// Check if seller can create more listings
GET /api/listings/seller/me?status=pending_approval,active

// If count >= listing_limit, show error
// listing_limit = -1 means unlimited
```

## Security Checklist

- ✅ Authentication required for write operations
- ✅ Seller role verification
- ✅ Ownership verification for updates/deletes
- ✅ Input validation with Zod
- ✅ UUID format validation
- ✅ Status-based permissions
- ✅ Listing limit enforcement

## Next Steps

1. Build frontend CreateListingForm component
2. Integrate with AI Scanner component
3. Integrate with Pricing Engine
4. Build seller dashboard to view listings
5. Implement admin approval workflow
