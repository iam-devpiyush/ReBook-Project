export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  // Lightweight DB ping to keep Supabase connection warm
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.from('books').select('id').limit(1);
  } catch {
    // non-fatal — just warming up
  }

  return NextResponse.json({ status: 'ok', ts: Date.now() });
}
