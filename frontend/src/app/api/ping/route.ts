/**
 * GET /api/ping
 *
 * Diagnostic route — three variants to isolate latency source:
 *   /api/ping          → instant, no DB (tests cold start only)
 *   /api/ping?db=1     → single lightweight Supabase query (tests DB latency)
 *   /api/ping?auth=1   → full requireAuth flow (tests auth middleware latency)
 *
 * Compare response times to identify the bottleneck.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const start = Date.now();
  const { searchParams } = request.nextUrl;

  // ── Variant 1: pure instant response (no DB, no auth) ──────────────────
  if (!searchParams.has('db') && !searchParams.has('auth')) {
    return NextResponse.json({
      variant: 'instant',
      message: 'No DB, no auth — pure serverless response',
      latency_ms: Date.now() - start,
      ts: Date.now(),
    });
  }

  // ── Variant 2: lightweight Supabase ping ────────────────────────────────
  if (searchParams.has('db')) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const dbStart = Date.now();
      await supabase.from('books').select('id').limit(1);
      const dbLatency = Date.now() - dbStart;

      return NextResponse.json({
        variant: 'db',
        message: 'Supabase single-row query',
        db_latency_ms: dbLatency,
        total_latency_ms: Date.now() - start,
        ts: Date.now(),
      });
    } catch (err: any) {
      return NextResponse.json({
        variant: 'db',
        error: err?.message ?? 'DB error',
        total_latency_ms: Date.now() - start,
      }, { status: 500 });
    }
  }

  // ── Variant 3: full auth middleware ─────────────────────────────────────
  if (searchParams.has('auth')) {
    try {
      const { requireAuth } = await import('@/lib/auth/middleware');
      const authStart = Date.now();
      const result = await requireAuth(request);
      const authLatency = Date.now() - authStart;

      return NextResponse.json({
        variant: 'auth',
        message: 'Full requireAuth flow',
        authenticated: result.success,
        auth_latency_ms: authLatency,
        total_latency_ms: Date.now() - start,
        ts: Date.now(),
      });
    } catch (err: any) {
      return NextResponse.json({
        variant: 'auth',
        error: err?.message ?? 'Auth error',
        total_latency_ms: Date.now() - start,
      }, { status: 500 });
    }
  }
}
