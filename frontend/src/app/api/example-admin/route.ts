export const dynamic = 'force-dynamic';
/**
 * Example Admin-Only API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';

/**
 * POST /api/example-admin
 * Only users with 'admin' role can access this route.
 */
export async function POST(request: NextRequest) {
  const result = await requireAdmin(request);
  
  if (!result.success) {
    return result.response;
  }
  
  const { user } = result;
  
  return NextResponse.json({
    message: 'Admin operation successful!',
    admin: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
}
