// Edge runtime — zero cold start, instant response, keeps the deployment warm
export const runtime = 'edge';

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', ts: Date.now() });
}
