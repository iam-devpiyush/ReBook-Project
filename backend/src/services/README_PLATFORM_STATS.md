# Platform Stats Service

## Overview

The Platform Stats Service calculates and aggregates platform-wide statistics for the Second-Hand Academic Book Marketplace. It provides comprehensive metrics including book counts, user counts, revenue data, and environmental impact.

## Requirements

**Validates: Requirements 9.1, 16.1-16.6, 10.1-10.3**

- Aggregate total_books_listed, total_books_sold, active_listings from Supabase
- Calculate total_users, total_buyers, total_sellers
- Calculate revenue_generated and platform_commission_earned
- Calculate environmental impact metrics (trees saved, water saved, CO₂ reduced)
- Store daily stats in platform_stats table

## Functions

### `calculatePlatformStats(date?: Date): Promise<CalculatePlatformStatsResult>`

Calculates platform-wide statistics for a specific date (defaults to today).

**Process:**
1. Aggregates book metrics (total listed, sold, active)
2. Calculates user metrics (total users, buyers, sellers)
3. Calculates revenue metrics from completed orders
4. Calculates environmental impact using formulas
5. Stores stats in platform_stats table (upserts on duplicate date)

**Returns:**
```typescript
{
  success: boolean;
  stats?: PlatformStats;
  error?: string;
}
```

**Example:**
```typescript
const result = await calculatePlatformStats();
if (result.success) {
  console.log('Platform stats:', result.stats);
}
```

### `getPlatformStats(date?: Date): Promise<CalculatePlatformStatsResult>`

Fetches platform stats for a specific date. If stats don't exist, calculates them.

**Example:**
```typescript
const result = await getPlatformStats(new Date('2024-01-15'));
if (result.success) {
  console.log('Stats for 2024-01-15:', result.stats);
}
```

### `getPlatformStatsRange(startDate: Date, endDate: Date): Promise<{...}>`

Fetches platform stats for a date range.

**Example:**
```typescript
const startDate = new Date('2024-01-01');
const endDate = new Date('2024-01-31');
const result = await getPlatformStatsRange(startDate, endDate);
if (result.success) {
  console.log('Stats for January:', result.stats);
}
```

## Environmental Impact Formulas

The service calculates environmental impact using these formulas:

- **Trees Saved**: `books_reused / 30`
- **Water Saved (liters)**: `books_reused × 50`
- **CO₂ Reduced (kg)**: `books_reused × 2.5`

All values are rounded to 2 decimal places.

## PlatformStats Type

```typescript
interface PlatformStats {
  date: string;                        // YYYY-MM-DD format
  total_books_listed: number;          // All-time total
  total_books_sold: number;            // All-time total
  active_listings: number;             // Current active listings
  total_users: number;                 // All-time total
  total_buyers: number;                // Unique buyers
  total_sellers: number;               // Unique sellers
  revenue_generated: number;           // Total revenue from delivered orders
  platform_commission_earned: number;  // Total commission earned
  trees_saved: number;                 // Environmental impact
  water_saved_liters: number;          // Environmental impact
  co2_reduced_kg: number;              // Environmental impact
}
```

## Database Schema

The service stores stats in the `platform_stats` table:

```sql
CREATE TABLE public.platform_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  
  -- Book metrics
  total_books_listed INTEGER DEFAULT 0,
  total_books_sold INTEGER DEFAULT 0,
  active_listings INTEGER DEFAULT 0,
  
  -- User metrics
  total_users INTEGER DEFAULT 0,
  total_buyers INTEGER DEFAULT 0,
  total_sellers INTEGER DEFAULT 0,
  
  -- Revenue metrics
  revenue_generated DECIMAL(12, 2) DEFAULT 0.0,
  platform_commission_earned DECIMAL(12, 2) DEFAULT 0.0,
  
  -- Environmental impact
  trees_saved DECIMAL(10, 2) DEFAULT 0.0,
  water_saved_liters DECIMAL(10, 2) DEFAULT 0.0,
  co2_reduced_kg DECIMAL(10, 2) DEFAULT 0.0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Usage in API Routes

```typescript
import { calculatePlatformStats, getPlatformStats } from '@/services/platform-stats.service';

// In an API route
export async function GET(request: Request) {
  const result = await getPlatformStats();
  
  if (!result.success) {
    return Response.json({ error: result.error }, { status: 500 });
  }
  
  return Response.json({ stats: result.stats });
}
```

## Caching Recommendations

For performance, consider caching platform stats:

```typescript
// Cache stats for 15 minutes (Requirement 16.4)
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds

let cachedStats: PlatformStats | null = null;
let cacheTimestamp: number = 0;

export async function getCachedPlatformStats(): Promise<PlatformStats | null> {
  const now = Date.now();
  
  if (cachedStats && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedStats;
  }
  
  const result = await getPlatformStats();
  if (result.success && result.stats) {
    cachedStats = result.stats;
    cacheTimestamp = now;
    return cachedStats;
  }
  
  return null;
}
```

## Scheduled Jobs

Consider running `calculatePlatformStats()` as a daily scheduled job:

```typescript
// Using a cron job or scheduled task
// Run daily at midnight
cron.schedule('0 0 * * *', async () => {
  const result = await calculatePlatformStats();
  if (result.success) {
    logger.info('Daily platform stats calculated successfully');
  } else {
    logger.error('Failed to calculate daily platform stats:', result.error);
  }
});
```

## Error Handling

The service handles errors gracefully:

- Returns `{ success: false, error: string }` on failure
- Logs errors using the Winston logger
- Continues operation even if non-critical operations fail (e.g., logging)

## Testing

Unit tests verify:
- Environmental impact formula correctness
- Stats structure validation
- Non-negative values
- Date format validation
- Revenue metrics consistency

Run tests:
```bash
npm test -- platform-stats.test.ts
```

## Dependencies

- `@supabase/supabase-js` - Database operations
- `winston` - Logging

## Related Services

- **Admin Service**: Uses platform stats for dashboard display
- **Environmental Impact Service**: Shares environmental calculation logic
- **Analytics Service**: May use platform stats for charts and reports
