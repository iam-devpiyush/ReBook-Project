export const dynamic = 'force-dynamic';
/**
 * Example Seller-Only API Route
 * 
 * This is a demonstration of how to use seller middleware
 * in Next.js API routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSeller } from '@/lib/auth/middleware';

/**
 * POST /api/example-seller
 * 
 * Example of a seller-only route.
 * Only users with 'seller' or 'admin' role can access this route.
 */
export async function POST(request: NextRequest) {
  // Verify user is a seller or admin
  const result = await requireSeller(request);
  
  if (!result.success) {
    // User is not authenticated or doesn't have seller role
    return result.response;
  }
  
  // User is a seller or admin - proceed with seller operations
  const { user } = result;
  
  return NextResponse.json({
    message: 'Seller operation successful!',
    seller: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
}
