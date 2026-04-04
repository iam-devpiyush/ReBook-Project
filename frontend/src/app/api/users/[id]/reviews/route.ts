export const dynamic = 'force-dynamic';
/**
 * API Route: /api/users/[id]/reviews
 *
 * GET: Fetch reviews for a specific user (where they are the reviewee)
 *      Also calculates average rating.
 *
 * Requirements: 12.5, 12.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// GET /api/users/[id]/reviews
// ---------------------------------------------------------------------------

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id: userId } = params;

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
        const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));
        const offset = (page - 1) * pageSize;

        // Use service-role client to bypass RLS
        const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Requirement 12.5: Return all reviews where user is the reviewee
        const { data: reviews, error, count } = await adminClient
            .from('reviews')
            .select(
                `id, order_id, reviewer_id, reviewee_id, rating, comment, created_at,
         reviewer:users!reviewer_id(id, name, profile_picture)`,
                { count: 'exact' }
            )
            .eq('reviewee_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1);

        if (error) {
            console.error('Error fetching reviews:', error);
            return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
        }

        // Requirement 12.6: Calculate average rating
        const { data: avgData, error: avgError } = await adminClient
            .from('reviews')
            .select('rating')
            .eq('reviewee_id', userId);

        let averageRating: number | null = null;
        if (!avgError && avgData && avgData.length > 0) {
            const sum = avgData.reduce((acc: number, r: { rating: number }) => acc + r.rating, 0);
            averageRating = Math.round((sum / avgData.length) * 10) / 10;
        }

        return NextResponse.json({
            success: true,
            data: reviews ?? [],
            averageRating,
            totalReviews: count ?? 0,
            pagination: {
                page,
                pageSize,
                total: count ?? 0,
                totalPages: Math.ceil((count ?? 0) / pageSize),
            },
        });
    } catch (error) {
        console.error('Error in GET /api/users/[id]/reviews:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
