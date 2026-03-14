# Admin Analytics API

## Overview

This API route provides analytics data for the admin dashboard, including time-series charts and revenue breakdowns.

**Requirements**: 9.12

## Endpoints

### GET /api/admin/analytics

Generate analytics data for admin dashboard charts.

**Authentication**: Requires admin role

**Query Parameters**:
- `days` (optional): Number of days to include in time-series data
  - Default: 30
  - Maximum: 365
  - Minimum: 1

**Response**:
```json
{
  "success": true,
  "data": {
    "dailySales": [
      {
        "date": "2024-01-01",
        "count": 5
      }
    ],
    "listingsPerDay": [
      {
        "date": "2024-01-01",
        "count": 12
      }
    ],
    "revenueByCategory": [
      {
        "categoryId": "cat-123",
        "categoryName": "School Books",
        "revenue": 1250.50
      }
    ]
  },
  "metadata": {
    "startDate": "2023-12-02",
    "endDate": "2024-01-01",
    "days": 30
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: User is not an admin
- `400 Bad Request`: Invalid days parameter
- `500 Internal Server Error`: Database error

## Analytics Data

### Daily Sales
Count of orders created per day, aggregated by date. Useful for tracking sales trends over time.

### Listings Per Day
Count of listings created per day, aggregated by date. Useful for monitoring seller activity and platform growth.

### Revenue By Category
Sum of platform commission earned per category, sorted by revenue descending. Useful for identifying top-performing categories.

## Usage Example

```typescript
// Fetch analytics for last 7 days
const response = await fetch('/api/admin/analytics?days=7', {
  method: 'GET',
  credentials: 'include',
});

const { data } = await response.json();

// Use data for charts
console.log('Daily sales:', data.dailySales);
console.log('Listings per day:', data.listingsPerDay);
console.log('Revenue by category:', data.revenueByCategory);
```

## Implementation Notes

- Data is fetched from the `orders` and `listings` tables
- Revenue data includes joins to `listings`, `books`, and `categories` tables
- Orders with missing category data are excluded from revenue calculations
- All dates are in ISO 8601 format (YYYY-MM-DD)
- Revenue values are in the platform's base currency (INR)
- Results are sorted chronologically for time-series data
- Revenue by category is sorted by revenue descending

## Testing

Run tests with:
```bash
npm test -- src/app/api/admin/analytics/__tests__/route.test.ts
```

Test coverage includes:
- Authentication and authorization
- Data aggregation and processing
- Date range filtering
- Error handling
- Edge cases (empty data, missing categories)
