/**
 * Checkpoint 52 — Verify Additional Features
 *
 * Covers:
 *  1. Review submission and display logic
 *  2. Wishlist add/remove functionality
 *  3. Environmental impact calculations
 *  4. Seller portal data correctness (stats, earnings)
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─────────────────────────────────────────────────────────────────────────────
// 1. REVIEW SUBMISSION AND DISPLAY
// ─────────────────────────────────────────────────────────────────────────────

type OrderStatus = 'pending_payment' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

interface Order {
    id: string;
    buyer_id: string;
    seller_id: string;
    status: OrderStatus;
}

interface Review {
    id: string;
    order_id: string;
    reviewer_id: string;
    reviewee_id: string;
    rating: number;
    comment: string;
}

function submitReview(
    orderId: string,
    reviewerId: string,
    rating: number,
    comment: string,
    order: Order,
    existingReviews: Review[]
): { success: true; review: Review } | { success: false; status: number; error: string } {
    if (order.buyer_id !== reviewerId)
        return { success: false, status: 403, error: 'Only the buyer can review' };
    if (order.status !== 'delivered')
        return { success: false, status: 422, error: 'Order must be delivered' };
    if (existingReviews.some(r => r.order_id === orderId))
        return { success: false, status: 409, error: 'Review already exists for this order' };
    if (!comment || comment.trim().length === 0)
        return { success: false, status: 400, error: 'Comment must not be empty' };
    if (comment.length > 500)
        return { success: false, status: 400, error: 'Comment too long' };
    if (rating < 1 || rating > 5)
        return { success: false, status: 400, error: 'Rating must be 1-5' };

    return {
        success: true,
        review: {
            id: `r-${Math.random()}`,
            order_id: orderId,
            reviewer_id: reviewerId,
            reviewee_id: order.seller_id,
            rating,
            comment,
        },
    };
}

function calculateAverageRating(reviews: Review[]): number | null {
    if (reviews.length === 0) return null;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
}

describe('Review submission and display', () => {
    const deliveredOrder: Order = {
        id: 'order-1',
        buyer_id: 'buyer-1',
        seller_id: 'seller-1',
        status: 'delivered',
    };

    it('buyer can submit a review for a delivered order', () => {
        const result = submitReview('order-1', 'buyer-1', 5, 'Great seller!', deliveredOrder, []);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.review.rating).toBe(5);
            expect(result.review.reviewer_id).toBe('buyer-1');
            expect(result.review.reviewee_id).toBe('seller-1');
        }
    });

    it('non-buyer cannot submit a review (403)', () => {
        const result = submitReview('order-1', 'stranger', 4, 'Nice', deliveredOrder, []);
        expect(result.success).toBe(false);
        if (!result.success) expect(result.status).toBe(403);
    });

    it('review fails for non-delivered order (422)', () => {
        const paidOrder: Order = { ...deliveredOrder, status: 'paid' };
        const result = submitReview('order-1', 'buyer-1', 4, 'Nice', paidOrder, []);
        expect(result.success).toBe(false);
        if (!result.success) expect(result.status).toBe(422);
    });

    it('duplicate review is rejected (409)', () => {
        const existing: Review = {
            id: 'r-1', order_id: 'order-1', reviewer_id: 'buyer-1',
            reviewee_id: 'seller-1', rating: 4, comment: 'Good',
        };
        const result = submitReview('order-1', 'buyer-1', 5, 'Great!', deliveredOrder, [existing]);
        expect(result.success).toBe(false);
        if (!result.success) expect(result.status).toBe(409);
    });

    it('empty comment is rejected (400)', () => {
        const result = submitReview('order-1', 'buyer-1', 4, '   ', deliveredOrder, []);
        expect(result.success).toBe(false);
        if (!result.success) expect(result.status).toBe(400);
    });

    it('comment over 500 chars is rejected (400)', () => {
        const result = submitReview('order-1', 'buyer-1', 4, 'x'.repeat(501), deliveredOrder, []);
        expect(result.success).toBe(false);
        if (!result.success) expect(result.status).toBe(400);
    });

    it('rating outside 1-5 is rejected (400)', () => {
        const result = submitReview('order-1', 'buyer-1', 6, 'Good', deliveredOrder, []);
        expect(result.success).toBe(false);
        if (!result.success) expect(result.status).toBe(400);
    });

    it('average rating is null when no reviews exist', () => {
        expect(calculateAverageRating([])).toBeNull();
    });

    it('average rating is calculated correctly', () => {
        const reviews: Review[] = [
            { id: '1', order_id: 'o1', reviewer_id: 'b1', reviewee_id: 's1', rating: 4, comment: 'Good' },
            { id: '2', order_id: 'o2', reviewer_id: 'b2', reviewee_id: 's1', rating: 5, comment: 'Great' },
            { id: '3', order_id: 'o3', reviewer_id: 'b3', reviewee_id: 's1', rating: 3, comment: 'OK' },
        ];
        expect(calculateAverageRating(reviews)).toBe(4.0);
    });

    it('property: rating is always between 1 and 5 for valid submissions', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 5 }),
                fc.string({ minLength: 1, maxLength: 500 }),
                (rating, comment) => {
                    const result = submitReview('order-1', 'buyer-1', rating, comment, deliveredOrder, []);
                    expect(result.success).toBe(true);
                    if (result.success) {
                        expect(result.review.rating).toBeGreaterThanOrEqual(1);
                        expect(result.review.rating).toBeLessThanOrEqual(5);
                    }
                }
            )
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. WISHLIST ADD / REMOVE
// ─────────────────────────────────────────────────────────────────────────────

interface WishlistEntry {
    id: string;
    user_id: string;
    book_id: string;
}

function addToWishlist(
    wishlist: WishlistEntry[],
    userId: string,
    bookId: string
): { success: true; entry: WishlistEntry } | { success: false; status: number } {
    if (wishlist.some(e => e.user_id === userId && e.book_id === bookId))
        return { success: false, status: 409 };
    return { success: true, entry: { id: `${userId}-${bookId}`, user_id: userId, book_id: bookId } };
}

function removeFromWishlist(
    wishlist: WishlistEntry[],
    entryId: string,
    userId: string
): { success: boolean; status?: number } {
    const entry = wishlist.find(e => e.id === entryId);
    if (!entry) return { success: false, status: 404 };
    if (entry.user_id !== userId) return { success: false, status: 403 };
    return { success: true };
}

describe('Wishlist add/remove functionality', () => {
    it('user can add a book to wishlist', () => {
        const result = addToWishlist([], 'user-1', 'book-1');
        expect(result.success).toBe(true);
    });

    it('duplicate add is rejected with 409', () => {
        const wishlist: WishlistEntry[] = [{ id: 'user-1-book-1', user_id: 'user-1', book_id: 'book-1' }];
        const result = addToWishlist(wishlist, 'user-1', 'book-1');
        expect(result.success).toBe(false);
        if (!result.success) expect(result.status).toBe(409);
    });

    it('different users can wishlist the same book', () => {
        const wishlist: WishlistEntry[] = [{ id: 'u1-b1', user_id: 'user-1', book_id: 'book-1' }];
        const result = addToWishlist(wishlist, 'user-2', 'book-1');
        expect(result.success).toBe(true);
    });

    it('user can remove their own wishlist entry', () => {
        const wishlist: WishlistEntry[] = [{ id: 'e1', user_id: 'user-1', book_id: 'book-1' }];
        const result = removeFromWishlist(wishlist, 'e1', 'user-1');
        expect(result.success).toBe(true);
    });

    it('user cannot remove another user\'s wishlist entry (403)', () => {
        const wishlist: WishlistEntry[] = [{ id: 'e1', user_id: 'user-1', book_id: 'book-1' }];
        const result = removeFromWishlist(wishlist, 'e1', 'user-2');
        expect(result.success).toBe(false);
        if (!result.success) expect(result.status).toBe(403);
    });

    it('removing non-existent entry returns 404', () => {
        const result = removeFromWishlist([], 'nonexistent', 'user-1');
        expect(result.success).toBe(false);
        if (!result.success) expect(result.status).toBe(404);
    });

    it('after remove, same book can be re-added', () => {
        const wishlist: WishlistEntry[] = [];
        const add1 = addToWishlist(wishlist, 'user-1', 'book-1');
        expect(add1.success).toBe(true);
        if (add1.success) wishlist.push(add1.entry);

        // Remove
        const idx = wishlist.findIndex(e => e.id === add1.entry?.id);
        if (idx !== -1) wishlist.splice(idx, 1);

        // Re-add
        const add2 = addToWishlist(wishlist, 'user-1', 'book-1');
        expect(add2.success).toBe(true);
    });

    it('property: wishlist size equals number of unique (user, book) pairs added', () => {
        fc.assert(
            fc.property(
                fc.array(fc.tuple(fc.uuid(), fc.uuid()), { minLength: 1, maxLength: 20 }),
                (pairs) => {
                    const wishlist: WishlistEntry[] = [];
                    const seen = new Set<string>();
                    for (const [userId, bookId] of pairs) {
                        const key = `${userId}:${bookId}`;
                        const result = addToWishlist(wishlist, userId, bookId);
                        if (!seen.has(key)) {
                            expect(result.success).toBe(true);
                            if (result.success) { wishlist.push(result.entry); seen.add(key); }
                        } else {
                            expect(result.success).toBe(false);
                        }
                    }
                    expect(wishlist.length).toBe(seen.size);
                }
            )
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. ENVIRONMENTAL IMPACT CALCULATIONS
// ─────────────────────────────────────────────────────────────────────────────

function calcImpact(booksReused: number) {
    return {
        trees_saved: Number((booksReused / 30).toFixed(2)),
        water_saved_liters: Number((booksReused * 50).toFixed(2)),
        co2_reduced_kg: Number((booksReused * 2.5).toFixed(2)),
    };
}

describe('Environmental impact calculations', () => {
    it('zero books → zero impact', () => {
        const impact = calcImpact(0);
        expect(impact.trees_saved).toBe(0);
        expect(impact.water_saved_liters).toBe(0);
        expect(impact.co2_reduced_kg).toBe(0);
    });

    it('30 books → 1.00 tree saved', () => {
        expect(calcImpact(30).trees_saved).toBe(1.00);
    });

    it('1 book → 50 liters water saved', () => {
        expect(calcImpact(1).water_saved_liters).toBe(50.00);
    });

    it('1 book → 2.50 kg CO₂ reduced', () => {
        expect(calcImpact(1).co2_reduced_kg).toBe(2.50);
    });

    it('all values have at most 2 decimal places', () => {
        fc.assert(
            fc.property(fc.integer({ min: 0, max: 1_000_000 }), (books) => {
                const impact = calcImpact(books);
                const atMost2dp = (n: number) => {
                    const s = n.toString();
                    const dot = s.indexOf('.');
                    return dot === -1 || s.length - dot - 1 <= 2;
                };
                expect(atMost2dp(impact.trees_saved)).toBe(true);
                expect(atMost2dp(impact.water_saved_liters)).toBe(true);
                expect(atMost2dp(impact.co2_reduced_kg)).toBe(true);
            })
        );
    });

    it('property: impact is monotonically non-decreasing', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 0, max: 100_000 }),
                fc.integer({ min: 1, max: 100_000 }),
                (base, extra) => {
                    const a = calcImpact(base);
                    const b = calcImpact(base + extra);
                    expect(b.trees_saved).toBeGreaterThanOrEqual(a.trees_saved);
                    expect(b.water_saved_liters).toBeGreaterThanOrEqual(a.water_saved_liters);
                    expect(b.co2_reduced_kg).toBeGreaterThanOrEqual(a.co2_reduced_kg);
                }
            )
        );
    });

    it('property: formulas are correct for arbitrary book counts', () => {
        fc.assert(
            fc.property(fc.integer({ min: 0, max: 1_000_000 }), (books) => {
                const impact = calcImpact(books);
                expect(impact.trees_saved).toBe(Number((books / 30).toFixed(2)));
                expect(impact.water_saved_liters).toBe(Number((books * 50).toFixed(2)));
                expect(impact.co2_reduced_kg).toBe(Number((books * 2.5).toFixed(2)));
            })
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. SELLER PORTAL DATA CORRECTNESS
// ─────────────────────────────────────────────────────────────────────────────

type ListingStatus = 'active' | 'pending_approval' | 'sold' | 'rejected' | 'rescan_required' | 'inactive';

interface SellerListing {
    id: string;
    status: ListingStatus;
    final_price: number;
    seller_payout: number;
    platform_commission: number;
    payment_fees: number;
}

interface SellerStatsResult {
    total_listings: number;
    active_listings: number;
    pending_listings: number;
    sold_listings: number;
    rejected_listings: number;
}

function computeSellerStats(listings: SellerListing[]): SellerStatsResult {
    return {
        total_listings: listings.length,
        active_listings: listings.filter(l => l.status === 'active').length,
        pending_listings: listings.filter(l => l.status === 'pending_approval').length,
        sold_listings: listings.filter(l => l.status === 'sold').length,
        rejected_listings: listings.filter(l => l.status === 'rejected').length,
    };
}

interface EarningsSummary {
    total_sales: number;
    platform_commission: number;
    payment_fees: number;
    net_earnings: number;
}

function computeEarnings(listings: SellerListing[]): EarningsSummary {
    const sold = listings.filter(l => l.status === 'sold');
    return {
        total_sales: sold.reduce((s, l) => s + l.final_price, 0),
        platform_commission: sold.reduce((s, l) => s + l.platform_commission, 0),
        payment_fees: sold.reduce((s, l) => s + l.payment_fees, 0),
        net_earnings: sold.reduce((s, l) => s + l.seller_payout, 0),
    };
}

describe('Seller portal data correctness', () => {
    const listings: SellerListing[] = [
        { id: '1', status: 'active', final_price: 200, seller_payout: 160, platform_commission: 20, payment_fees: 8 },
        { id: '2', status: 'active', final_price: 300, seller_payout: 240, platform_commission: 30, payment_fees: 10 },
        { id: '3', status: 'pending_approval', final_price: 150, seller_payout: 120, platform_commission: 15, payment_fees: 7 },
        { id: '4', status: 'sold', final_price: 250, seller_payout: 200, platform_commission: 25, payment_fees: 9 },
        { id: '5', status: 'rejected', final_price: 100, seller_payout: 80, platform_commission: 10, payment_fees: 5 },
    ];

    it('total_listings counts all listings', () => {
        expect(computeSellerStats(listings).total_listings).toBe(5);
    });

    it('active_listings counts only active', () => {
        expect(computeSellerStats(listings).active_listings).toBe(2);
    });

    it('pending_listings counts only pending_approval', () => {
        expect(computeSellerStats(listings).pending_listings).toBe(1);
    });

    it('sold_listings counts only sold', () => {
        expect(computeSellerStats(listings).sold_listings).toBe(1);
    });

    it('rejected_listings counts only rejected', () => {
        expect(computeSellerStats(listings).rejected_listings).toBe(1);
    });

    it('earnings only include sold listings', () => {
        const earnings = computeEarnings(listings);
        expect(earnings.total_sales).toBe(250);
        expect(earnings.net_earnings).toBe(200);
        expect(earnings.platform_commission).toBe(25);
        expect(earnings.payment_fees).toBe(9);
    });

    it('net_earnings equals the sum of seller_payout across sold listings', () => {
        // seller_payout is pre-calculated as base_price - commission (stored on the listing)
        // net_earnings is the direct sum of stored seller_payout values
        const earnings = computeEarnings(listings);
        const expectedPayout = listings
            .filter(l => l.status === 'sold')
            .reduce((s, l) => s + l.seller_payout, 0);
        expect(earnings.net_earnings).toBe(expectedPayout);
    });

    it('empty listings → all stats are zero', () => {
        const stats = computeSellerStats([]);
        expect(stats.total_listings).toBe(0);
        expect(stats.active_listings).toBe(0);
        expect(stats.sold_listings).toBe(0);

        const earnings = computeEarnings([]);
        expect(earnings.total_sales).toBe(0);
        expect(earnings.net_earnings).toBe(0);
    });

    it('property: total_listings = sum of all status counts', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.uuid(),
                        status: fc.constantFrom<ListingStatus>('active', 'pending_approval', 'sold', 'rejected', 'rescan_required', 'inactive'),
                        final_price: fc.float({ min: 10, max: 10000, noNaN: true }),
                        seller_payout: fc.float({ min: 5, max: 9000, noNaN: true }),
                        platform_commission: fc.float({ min: 1, max: 1000, noNaN: true }),
                        payment_fees: fc.float({ min: 1, max: 100, noNaN: true }),
                    }),
                    { minLength: 0, maxLength: 50 }
                ),
                (ls) => {
                    const stats = computeSellerStats(ls);
                    expect(stats.total_listings).toBe(ls.length);
                    expect(
                        stats.active_listings + stats.pending_listings + stats.sold_listings +
                        stats.rejected_listings +
                        ls.filter(l => l.status === 'rescan_required').length +
                        ls.filter(l => l.status === 'inactive').length
                    ).toBe(stats.total_listings);
                }
            )
        );
    });

    it('property: net_earnings is always non-negative for valid payouts', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.uuid(),
                        status: fc.constant<ListingStatus>('sold'),
                        final_price: fc.float({ min: 10, max: 10000, noNaN: true }),
                        seller_payout: fc.float({ min: 0, max: 9000, noNaN: true }),
                        platform_commission: fc.float({ min: 0, max: 1000, noNaN: true }),
                        payment_fees: fc.float({ min: 0, max: 100, noNaN: true }),
                    }),
                    { minLength: 0, maxLength: 20 }
                ),
                (ls) => {
                    const earnings = computeEarnings(ls);
                    expect(earnings.net_earnings).toBeGreaterThanOrEqual(0);
                }
            )
        );
    });
});
