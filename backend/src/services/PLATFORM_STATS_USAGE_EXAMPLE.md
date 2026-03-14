# Platform Stats Service - Usage Examples

## Example 1: Get Current Platform Stats

```typescript
import { getPlatformStats } from '@/services/platform-stats.service';

export async function GET(request: Request) {
  const result = await getPlatformStats();
  
  if (!result.success) {
    return Response.json(
      { error: result.error },
      { status: 500 }
    );
  }
  
  return Response.json({
    stats: result.stats,
    message: 'Platform stats retrieved successfully'
  });
}
```

## Example 2: Calculate Stats for a Specific Date

```typescript
import { calculatePlatformStats } from '@/services/platform-stats.service';

export async function POST(request: Request) {
  const { date } = await request.json();
  
  const targetDate = date ? new Date(date) : new Date();
  const result = await calculatePlatformStats(targetDate);
  
  if (!result.success) {
    return Response.json(
      { error: result.error },
      { status: 500 }
    );
  }
  
  return Response.json({
    stats: result.stats,
    message: 'Platform stats calculated successfully'
  });
}
```

## Example 3: Get Stats for a Date Range

```typescript
import { getPlatformStatsRange } from '@/services/platform-stats.service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDateStr = searchParams.get('start_date');
  const endDateStr = searchParams.get('end_date');
  
  if (!startDateStr || !endDateStr) {
    return Response.json(
      { error: 'start_date and end_date are required' },
      { status: 400 }
    );
  }
  
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  
  const result = await getPlatformStatsRange(startDate, endDate);
  
  if (!result.success) {
    return Response.json(
      { error: result.error },
      { status: 500 }
    );
  }
  
  return Response.json({
    stats: result.stats,
    count: result.stats?.length || 0,
    message: 'Platform stats range retrieved successfully'
  });
}
```

## Example 4: Admin Dashboard with Caching

```typescript
import { getPlatformStats } from '@/services/platform-stats.service';

// Simple in-memory cache
let cachedStats: any = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function GET(request: Request) {
  // Check authentication
  const user = await getAuthenticatedUser(request);
  if (!user || user.role !== 'admin') {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Check cache
  const now = Date.now();
  if (cachedStats && (now - cacheTimestamp) < CACHE_TTL) {
    return Response.json({
      stats: cachedStats,
      cached: true,
      message: 'Platform stats retrieved from cache'
    });
  }
  
  // Fetch fresh stats
  const result = await getPlatformStats();
  
  if (!result.success) {
    return Response.json(
      { error: result.error },
      { status: 500 }
    );
  }
  
  // Update cache
  cachedStats = result.stats;
  cacheTimestamp = now;
  
  return Response.json({
    stats: result.stats,
    cached: false,
    message: 'Platform stats retrieved successfully'
  });
}
```

## Example 5: Scheduled Daily Stats Calculation

```typescript
import { calculatePlatformStats } from '@/services/platform-stats.service';
import { logger } from '@/utils/logger';

// This would be run as a cron job or scheduled task
export async function calculateDailyStats() {
  logger.info('Starting daily platform stats calculation');
  
  const result = await calculatePlatformStats();
  
  if (result.success) {
    logger.info('Daily platform stats calculated successfully', {
      date: result.stats?.date,
      total_books_sold: result.stats?.total_books_sold,
      revenue_generated: result.stats?.revenue_generated,
    });
  } else {
    logger.error('Failed to calculate daily platform stats', {
      error: result.error,
    });
  }
  
  return result;
}

// Example cron setup (using node-cron)
import cron from 'node-cron';

// Run daily at midnight
cron.schedule('0 0 * * *', async () => {
  await calculateDailyStats();
});
```

## Example 6: Environmental Impact Display

```typescript
import { getPlatformStats } from '@/services/platform-stats.service';

export async function GET(request: Request) {
  const result = await getPlatformStats();
  
  if (!result.success) {
    return Response.json(
      { error: result.error },
      { status: 500 }
    );
  }
  
  // Extract environmental impact metrics
  const environmentalImpact = {
    trees_saved: result.stats?.trees_saved || 0,
    water_saved_liters: result.stats?.water_saved_liters || 0,
    co2_reduced_kg: result.stats?.co2_reduced_kg || 0,
    books_reused: result.stats?.total_books_sold || 0,
  };
  
  return Response.json({
    impact: environmentalImpact,
    message: 'Environmental impact retrieved successfully'
  });
}
```

## Example 7: Analytics Dashboard with Charts Data

```typescript
import { getPlatformStatsRange } from '@/services/platform-stats.service';

export async function GET(request: Request) {
  // Get stats for the last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  const result = await getPlatformStatsRange(startDate, endDate);
  
  if (!result.success) {
    return Response.json(
      { error: result.error },
      { status: 500 }
    );
  }
  
  // Format data for charts
  const chartData = {
    dates: result.stats?.map(s => s.date) || [],
    revenue: result.stats?.map(s => s.revenue_generated) || [],
    books_sold: result.stats?.map(s => s.total_books_sold) || [],
    active_listings: result.stats?.map(s => s.active_listings) || [],
    environmental_impact: {
      trees_saved: result.stats?.map(s => s.trees_saved) || [],
      water_saved: result.stats?.map(s => s.water_saved_liters) || [],
      co2_reduced: result.stats?.map(s => s.co2_reduced_kg) || [],
    },
  };
  
  return Response.json({
    chartData,
    message: 'Analytics data retrieved successfully'
  });
}
```

## Example 8: Error Handling

```typescript
import { getPlatformStats } from '@/services/platform-stats.service';
import { logger } from '@/utils/logger';

export async function GET(request: Request) {
  try {
    const result = await getPlatformStats();
    
    if (!result.success) {
      logger.error('Failed to get platform stats', { error: result.error });
      
      return Response.json(
        {
          error: 'Failed to retrieve platform statistics',
          details: result.error,
        },
        { status: 500 }
      );
    }
    
    return Response.json({
      stats: result.stats,
      message: 'Platform stats retrieved successfully'
    });
  } catch (error) {
    logger.error('Unexpected error in platform stats endpoint', { error });
    
    return Response.json(
      {
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

## Frontend Usage Example

```typescript
// In a React component
import { useEffect, useState } from 'react';

interface PlatformStats {
  date: string;
  total_books_listed: number;
  total_books_sold: number;
  active_listings: number;
  total_users: number;
  revenue_generated: number;
  platform_commission_earned: number;
  trees_saved: number;
  water_saved_liters: number;
  co2_reduced_kg: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/admin/stats');
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch stats');
        }
        
        setStats(data.stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    
    fetchStats();
  }, []);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!stats) return <div>No stats available</div>;
  
  return (
    <div className="dashboard">
      <h1>Platform Statistics</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Books Listed</h3>
          <p>{stats.total_books_listed.toLocaleString()}</p>
        </div>
        
        <div className="stat-card">
          <h3>Total Books Sold</h3>
          <p>{stats.total_books_sold.toLocaleString()}</p>
        </div>
        
        <div className="stat-card">
          <h3>Active Listings</h3>
          <p>{stats.active_listings.toLocaleString()}</p>
        </div>
        
        <div className="stat-card">
          <h3>Revenue Generated</h3>
          <p>₹{stats.revenue_generated.toLocaleString()}</p>
        </div>
      </div>
      
      <div className="environmental-impact">
        <h2>Environmental Impact</h2>
        <div className="impact-grid">
          <div className="impact-card">
            <h3>Trees Saved</h3>
            <p>{stats.trees_saved.toFixed(2)}</p>
          </div>
          
          <div className="impact-card">
            <h3>Water Saved</h3>
            <p>{stats.water_saved_liters.toLocaleString()} liters</p>
          </div>
          
          <div className="impact-card">
            <h3>CO₂ Reduced</h3>
            <p>{stats.co2_reduced_kg.toFixed(2)} kg</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```
