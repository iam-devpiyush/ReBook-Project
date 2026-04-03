/**
 * POST /api/orders/instant
 *
 * Instantly completes a purchase without a payment gateway:
 * 1. Validates listing is active
 * 2. Marks listing as "sold"
 * 3. Creates order with status "delivered" and payment_status "completed"
 * 4. Updates seller's books_sold count and eco-impact stats
 * 5. Returns order + eco impact for this transaction
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { createClient } from '@supabase/supabase-js';

// Per-book eco-impact constants (same as /api/impact)
const TREES_PER_BOOK = 1 / 30;
const WATER_PER_BOOK = 50;   // litres
const CO2_PER_BOOK = 2.5;    // kg

function adminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    ) as any;
}

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.success) return authResult.response;
        const { user } = authResult;

        const body = await request.json();
        const { listing_id } = body;

        if (!listing_id) {
            return NextResponse.json({ error: 'listing_id is required' }, { status: 400 });
        }

        const db = adminClient();

        // 1. Fetch listing
        const { data: listing, error: listingErr } = await db
            .from('listings')
            .select('id, seller_id, book_id, final_price, delivery_cost, platform_commission, payment_fees, seller_payout, status, city, state, pincode')
            .eq('id', listing_id)
            .single();

        if (listingErr || !listing) {
            return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
        }
        if (listing.status !== 'active') {
            return NextResponse.json({ error: `Listing is not available (status: ${listing.status})` }, { status: 409 });
        }
        if (listing.seller_id === user.id) {
            return NextResponse.json({ error: 'You cannot buy your own listing' }, { status: 403 });
        }

        // 2. The DB trigger `validate_order_on_insert` atomically checks the listing
        // is active and marks it sold — no need to do it here first.
        // (Doing it here first would cause the trigger to see status='sold' and reject.)

        const now = new Date().toISOString();

        // 3. Create order as delivered
        const { data: order, error: orderErr } = await db
            .from('orders')
            .insert({
                listing_id,
                buyer_id: user.id,
                seller_id: listing.seller_id,
                book_id: listing.book_id,
                price: listing.final_price,
                delivery_cost: listing.delivery_cost,
                platform_commission: listing.platform_commission,
                payment_fees: listing.payment_fees,
                seller_payout: listing.seller_payout,
                status: 'delivered',
                payment_status: 'completed',
                payment_id: `instant_${Date.now()}`,
                delivery_address: { note: 'Instant purchase — no delivery required' },
                pickup_address: {
                    city: listing.city ?? '',
                    state: listing.state ?? '',
                    pincode: listing.pincode ?? '',
                },
                paid_at: now,
                shipped_at: now,
                delivered_at: now,
                created_at: now,
                updated_at: now,
            })
            .select('id')
            .single();

        if (orderErr || !order) {
            const detail = `${orderErr?.message ?? 'unknown'} [code: ${orderErr?.code ?? ''}, detail: ${orderErr?.details ?? ''}, hint: ${orderErr?.hint ?? ''}]`;
            console.error('Order insert error:', detail);
            // If the error is the trigger's "not available" exception, return 409
            if (orderErr?.message?.includes('not available') || orderErr?.code === 'P0001') {
                return NextResponse.json({ error: 'Listing is no longer available — it may have just been purchased' }, { status: 409 });
            }
            return NextResponse.json({ error: `Failed to create order: ${detail}` }, { status: 500 });
        }

        // 4. Update seller stats (books_sold, eco impact) — non-fatal
        // Increment books_sold via fetch+update
        const { data: seller } = await db
            .from('users')
            .select('books_sold, trees_saved, water_saved_liters, co2_reduced_kg')
            .eq('id', listing.seller_id)
            .single();

        if (seller) {
            await db.from('users').update({
                books_sold: (seller.books_sold ?? 0) + 1,
                trees_saved: Number(((seller.trees_saved ?? 0) + TREES_PER_BOOK).toFixed(4)),
                water_saved_liters: Number(((seller.water_saved_liters ?? 0) + WATER_PER_BOOK).toFixed(2)),
                co2_reduced_kg: Number(((seller.co2_reduced_kg ?? 0) + CO2_PER_BOOK).toFixed(4)),
                updated_at: now,
            }).eq('id', listing.seller_id);
        }

        // Also update buyer's books_bought
        const { data: buyer } = await db
            .from('users')
            .select('books_bought')
            .eq('id', user.id)
            .single();

        if (buyer) {
            await db.from('users').update({
                books_bought: (buyer.books_bought ?? 0) + 1,
                updated_at: now,
            }).eq('id', user.id);
        }

        // 5. Return order + eco impact for this single transaction
        return NextResponse.json({
            success: true,
            data: {
                order_id: order.id,
                status: 'delivered',
                eco_impact: {
                    trees_saved: Number(TREES_PER_BOOK.toFixed(4)),
                    water_saved_liters: WATER_PER_BOOK,
                    co2_reduced_kg: CO2_PER_BOOK,
                },
            },
        }, { status: 201 });

    } catch (error) {
        console.error('Error in POST /api/orders/instant:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
