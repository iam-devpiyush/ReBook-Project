/**
 * API Route: /api/reviews
 *
 * POST: Submit a review for a seller after order delivery
 *
 * Requirements: 12.1-12.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const ReviewSchema = z.object({
    order_id: z.string().uuid('order_id must be a valid UUID'),
    rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
    comment: z
        .string()
        .min(1, 'Comment must not be empty')
        .max(500, 'Comment must be at most 500 characters'),
});

// ---------------------------------------------------------------------------
// POST /api/reviews — submit a review
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.success) return authResult.response;

        const { user } = authResult;

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const parsed = ReviewSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { order_id, rating, comment } = parsed.data;

        // Use service-role client to bypass RLS for lookups
        const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Requirement 12.1 & 12.2: Verify order exists, is delivered, and reviewer is the buyer
        const { data: order, error: orderError } = await adminClient
            .from('orders')
            .select('id, buyer_id, seller_id, status')
            .eq('id', order_id)
            .single();

        if (orderError || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Requirement 12.2: Ensure reviewer is the buyer
        if (order.buyer_id !== user.id) {
            return NextResponse.json(
                { error: 'Only the buyer of this order can submit a review' },
                { status: 403 }
            );
        }

        // Requirement 12.1: Verify order status is "delivered"
        if (order.status !== 'delivered') {
            return NextResponse.json(
                { error: 'Review can only be submitted after the order is delivered' },
                { status: 422 }
            );
        }

        // Requirement 12.4: Ensure only one review per order
        const { data: existingReview, error: reviewCheckError } = await adminClient
            .from('reviews')
            .select('id')
            .eq('order_id', order_id)
            .maybeSingle();

        if (reviewCheckError) {
            console.error('Error checking existing review:', reviewCheckError);
            return NextResponse.json({ error: 'Failed to check existing review' }, { status: 500 });
        }

        if (existingReview) {
            return NextResponse.json(
                { error: 'A review already exists for this order' },
                { status: 409 }
            );
        }

        // Requirement 12.3: Store rating, comment, reviewer_id, reviewee_id
        const { data: review, error: insertError } = await adminClient
            .from('reviews')
            .insert({
                order_id,
                reviewer_id: user.id,
                reviewee_id: order.seller_id,
                rating,
                comment,
            })
            .select('id, order_id, reviewer_id, reviewee_id, rating, comment, created_at')
            .single();

        if (insertError) {
            console.error('Error inserting review:', insertError);
            // Handle unique constraint violation (race condition)
            if (insertError.code === '23505') {
                return NextResponse.json(
                    { error: 'A review already exists for this order' },
                    { status: 409 }
                );
            }
            return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: review }, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/reviews:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
