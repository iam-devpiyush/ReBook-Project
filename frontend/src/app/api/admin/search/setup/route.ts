/**
 * POST /api/admin/search/setup
 *
 * Creates and configures the Meilisearch `listings` index,
 * then syncs all existing listings from Supabase.
 *
 * Requires admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { setupListingsIndex, syncListingsFromSupabase } from '@/lib/meilisearch/setup';
import { createClient } from '@supabase/supabase-js';

async function isAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return false;

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role === 'admin';
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const syncData = body.sync !== false; // default true

    // Step 1: Setup index settings
    const setupResult = await setupListingsIndex();

    // Step 2: Optionally sync existing data
    let syncResult = null;
    if (syncData) {
      syncResult = await syncListingsFromSupabase();
    }

    return NextResponse.json({
      success: true,
      setup: setupResult,
      sync: syncResult,
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/search/setup:', error);
    return NextResponse.json({ error: error.message ?? 'Internal server error' }, { status: 500 });
  }
}
