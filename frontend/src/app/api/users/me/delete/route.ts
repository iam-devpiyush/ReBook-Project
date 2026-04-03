/**
 * DELETE /api/users/me/delete
 *
 * GDPR right to erasure — deletes the authenticated user's account and all personal data.
 * Active orders (pending_payment, paid, shipped) must be resolved first.
 * Requirements: 24.8
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  ) as any;
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) return authResult.response;
    const { user } = authResult;

    const db = adminClient();

    // Block deletion if user has active orders
    const { data: activeOrders } = await db
      .from('orders')
      .select('id')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .in('status', ['pending_payment', 'paid', 'shipped'])
      .limit(1);

    if (activeOrders && activeOrders.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete account with active orders. Please resolve all pending orders first.' },
        { status: 400 }
      );
    }

    // Anonymise personal data rather than hard-delete (preserves order history integrity)
    const anonymisedName = `Deleted User ${user.id.slice(0, 8)}`;
    await db.from('users').update({
      name: anonymisedName,
      email: `deleted_${user.id}@deleted.invalid`,
      profile_picture: null,
      phone: null,
      address: null,
      city: null,
      state: null,
      pincode: null,
      is_active: false,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);

    // Delete wishlist and reviews (personal content)
    await Promise.all([
      db.from('wishlist').delete().eq('user_id', user.id),
      db.from('reviews').delete().eq('reviewer_id', user.id),
    ]);

    // Delete the Supabase Auth user (prevents future login)
    const { createClient: createAdminAuthClient } = await import('@supabase/supabase-js');
    const authAdmin = createAdminAuthClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await authAdmin.auth.admin.deleteUser(user.id);

    return NextResponse.json({
      success: true,
      message: 'Your account and personal data have been deleted.',
    });
  } catch (error) {
    console.error('Error in DELETE /api/users/me/delete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
