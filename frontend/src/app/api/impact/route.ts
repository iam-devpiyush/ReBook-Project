// Cache impact stats for 5 minutes — data changes rarely and this is hit on every homepage load
export const revalidate = 300;

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Race a Supabase PromiseLike against a timeout. Always resolves — never rejects. */
function queryWithTimeout<T>(
  query: PromiseLike<T>,
  ms: number,
  fallback: T
): Promise<T> {
  return Promise.race([
    Promise.resolve(query).catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function GET() {
  try {
    const supabase = getSupabase() as any;

    // Query 1: platform_stats — 3s timeout, fallback to null
    const statsResult = await queryWithTimeout<{ data: any[] | null; error: any }>(
      supabase
        .from('platform_stats')
        .select('trees_saved, water_saved_liters, co2_reduced_kg, total_books_sold')
        .limit(10),
      3000,
      { data: null, error: null }
    );

    const stats = statsResult.data;

    let trees_saved = 0;
    let water_saved_liters = 0;
    let co2_reduced_kg = 0;
    let total_books_sold = 0;

    const hasStats =
      stats &&
      (stats as any[]).some(
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
      // Query 2: count orders — 3s timeout, fallback to 0
      const countResult = await queryWithTimeout<{ count: number | null; error: any }>(
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .neq('status', 'cancelled'),
        3000,
        { count: 0, error: null }
      );

      total_books_sold = countResult.count ?? 0;
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
    return NextResponse.json({
      data: { total_books_sold: 0, trees_saved: 0, water_saved_liters: 0, co2_reduced_kg: 0 },
    });
  }
}
