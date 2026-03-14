/**
 * Example Protected API Route
 * 
 * This is a demonstration of how to use authentication middleware
 * in Next.js API routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';

/**
 * GET /api/example-protected
 * 
 * Example of a protected route that requires authentication.
 * Any authenticated user (buyer, seller, or admin) can access this route.
 */
export async function GET(request: NextRequest) {
  // Verify user is authenticated
  const result = await requireAuth(request);
  
  if (!result.success) {
    // User is not authenticated - return 401 error
    return result.response;
  }
  
  // User is authenticated - access user information
  const { user } = result;
  
  return NextResponse.json({
    message: 'You are authenticated!',
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
    },
  });
}
