// Cache impact stats for 5 minutes — data changes rarely and this is hit on every homepage load
export const revalidate = 300; // 5 minutes ISR — rebuilt at most every 5 min
/**
 * GET /api/impact
 * Returns platform-wide cumulative environmental impact metrics.
 *
 * Priority:
 * 1. Sum from platform_stats table (populated by Task 10 DB triggers on delivery)
 * 2. Fallback: count all non-cancelled orders (paid/shipped/delivered) and calculate
 *    using the same formula from Task 10: trees = n/30, water = n*50, co2 = n*2.5
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withTimeout } from '@/lib/timeout';

// Use service-role client — no cookies needed, this is a public read-only endpoint
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
    try {
        const supabase = getSupabase() as any;

        // 3s timeout — return zeros immediately if Supabase is slow
        const { data: stats } = await withTimeout(
            supabase
                .from('platform_stats')
                .select('trees_saved, water_saved_liters, co2_reduced_kg, total_books_sold')
                .limit(10),
            3000,
            'platform_stats'
        ).catch(() => ({ data: null }));

        let trees_saved = 0;
        let water_saved_liters = 0;
        let co2_reduced_kg = 0;
        let total_books_sold = 0;

        const hasStats = stats && (stats as any[]).some(
            (r) => Number(r.trees_saved) > 0 || Number(r.total_books_sold) > 0
        );

        if (hasStats) {
            for (const row of stats as any[]) {
                trees_saved += Number(row.trees_saved ?? 0);
                water_saved_liters += Number(row.water_saved_liters ?? 0);
                co2_reduced_kg += Number(row.co2_reduced_kg ?? 0);
                total_books_sold += Number(row.total_books_sold ?? 0);
            }
        } else {
            // Fallback: count all non-cancelled orders
            const result = await withTimeout(
                supabase
                    .from('orders')
                    .select('id', { count: 'exact', head: true })
                    .neq('status', 'cancelled'),
                3000,
                'orders count'
            ).catch(() => ({ count: 0 }));

            total_books_sold = result.count ?? 0;
            trees_saved = total_books_sold / 30;
            water_saved_liters = total_books_sold * 50;
            co2_reduced_kg = total_books_sold * 2.5;
        }

        return NextResponse.json({
            data: {
                total_books_sold,
                trees_saved: Number(trees_saved.toFixed(2)),
                water_saved_liters: Number(water_saved_liters.toFixed(2)),
                co2_reduced_kg: Number(co2_reduced_kg.toFixed(2)),
            },
        });
    } catch (error) {
        console.error('GET /api/impact error:', error);
        return NextResponse.json(
            { data: { total_books_sold: 0, trees_saved: 0, water_saved_liters: 0, co2_reduced_kg: 0 } }
        );
    }
}
