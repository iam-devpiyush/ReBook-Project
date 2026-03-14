/**
 * API Route: /api/wishlist
 *
 * POST: Add a book to the authenticated user's wishlist
 * GET:  Fetch the authenticated user's wishlist with book details
 *
 * Requirements: 13.1-13.3, 13.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

function adminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

const AddWishlistSchema = z.object({
    book_id: z.string().uuid('book_id must be a valid UUID'),
});

// ---------------------------------------------------------------------------
// POST /api/wishlist — add book to wishlist
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

        const parsed = AddWishlistSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { book_id } = parsed.data;
        const db = adminClient();

        // Verify book exists
        const { data: book, error: bookError } = await db
            .from('books')
            .select('id')
            .eq('id', book_id)
            .maybeSingle();

        if (bookError || !book) {
            return NextResponse.json({ error: 'Book not found' }, { status: 404 });
        }

        // Requirement 13.2: Ensure (user_id, book_id) uniqueness — reject duplicates
        const { data: existing } = await db
            .from('wishlist')
            .select('id')
            .eq('user_id', user.id)
            .eq('book_id', book_id)
            .maybeSingle();

        if (existing) {
            return NextResponse.json(
                { error: 'Book is already in your wishlist' },
                { status: 409 }
            );
        }

        const { data: entry, error: insertError } = await db
            .from('wishlist')
            .insert({ user_id: user.id, book_id })
            .select('id, user_id, book_id, created_at')
            .single();

        if (insertError) {
            // Handle DB-level unique constraint violation (race condition)
            if (insertError.code === '23505') {
                return NextResponse.json(
                    { error: 'Book is already in your wishlist' },
                    { status: 409 }
                );
            }
            console.error('Error inserting wishlist entry:', insertError);
            return NextResponse.json({ error: 'Failed to add to wishlist' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: entry }, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/wishlist:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ---------------------------------------------------------------------------
// GET /api/wishlist — fetch user's wishlist with book details
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.success) return authResult.response;

        const { user } = authResult;
        const db = adminClient();

        const { data: items, error } = await db
            .from('wishlist')
            .select(
                `id, book_id, created_at,
         books(id, isbn, title, author, publisher, cover_image,
           listings(id, final_price, condition_score, status, images)
         )`
            )
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching wishlist:', error);
            return NextResponse.json({ error: 'Failed to fetch wishlist' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: items ?? [] });
    } catch (error) {
        console.error('Error in GET /api/wishlist:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
