export const dynamic = 'force-dynamic';
/**
 * API Route: /api/wishlist/[id]
 *
 * DELETE: Remove a wishlist entry by its ID
 *
 * Requirements: 13.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.success) return authResult.response;

        const { user } = authResult;
        const { id } = params;

        if (!id) {
            return NextResponse.json({ error: 'Wishlist entry ID is required' }, { status: 400 });
        }

        const db = adminClient();

        // Verify the entry exists and belongs to the authenticated user
        const { data: entry, error: fetchError } = await db
            .from('wishlist')
            .select('id, user_id')
            .eq('id', id)
            .maybeSingle();

        if (fetchError || !entry) {
            return NextResponse.json({ error: 'Wishlist entry not found' }, { status: 404 });
        }

        if (entry.user_id !== user.id) {
            return NextResponse.json(
                { error: 'Forbidden: You can only remove your own wishlist entries' },
                { status: 403 }
            );
        }

        const { error: deleteError } = await db
            .from('wishlist')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error deleting wishlist entry:', deleteError);
            return NextResponse.json({ error: 'Failed to remove from wishlist' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in DELETE /api/wishlist/[id]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
