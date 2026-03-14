/**
 * Property-Based Tests: Review Uniqueness
 *
 * Property 20: Review Uniqueness
 * - Only one review can exist per order
 * - Reviewer must be the buyer from the order
 *
 * **Validates: Requirements 12.1, 12.2, 12.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure domain logic (mirrors API route behaviour without DB calls)
// ---------------------------------------------------------------------------

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

interface ReviewSubmission {
    order_id: string;
    reviewer_id: string;
    rating: number;
    comment: string;
}

type ReviewResult =
    | { success: true; review: Review }
    | { success: false; error: string; status: number };

/**
 * Simulates the review submission logic from the API route.
 * Returns success or an error with HTTP status code.
 */
function submitReview(
    submission: ReviewSubmission,
    order: Order,
    existingReviews: Review[]
): ReviewResult {
    // Requirement 12.2: Reviewer must be the buyer
    if (order.buyer_id !== submission.reviewer_id) {
        return { success: false, error: 'Only the buyer can submit a review', status: 403 };
    }

    // Requirement 12.1: Order must be delivered
    if (order.status !== 'delivered') {
        return {
            success: false,
            error: 'Review can only be submitted after the order is delivered',
            status: 422,
        };
    }

    // Requirement 12.4: Only one review per order
    const alreadyReviewed = existingReviews.some((r) => r.order_id === submission.order_id);
    if (alreadyReviewed) {
        return { success: false, error: 'A review already exists for this order', status: 409 };
    }

    // Requirement 12.7: Comment validation (non-empty, max 500 chars)
    if (!submission.comment || submission.comment.trim().length === 0) {
        return { success: false, error: 'Comment must not be empty', status: 400 };
    }
    if (submission.comment.length > 500) {
        return { success: false, error: 'Comment must be at most 500 characters', status: 400 };
    }

    // Requirement 12.3: Store rating (1-5)
    if (submission.rating < 1 || submission.rating > 5) {
        return { success: false, error: 'Rating must be between 1 and 5', status: 400 };
    }

    const review: Review = {
        id: `review-${Date.now()}-${Math.random()}`,
        order_id: submission.order_id,
        reviewer_id: submission.reviewer_id,
        reviewee_id: order.seller_id,
        rating: submission.rating,
        comment: submission.comment,
    };

    return { success: true, review };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const orderStatusArb = fc.constantFrom<OrderStatus>(
    'pending_payment', 'paid', 'shipped', 'delivered', 'cancelled'
);

const deliveredOrderArb = fc.record({
    id: fc.uuid(),
    buyer_id: fc.uuid(),
    seller_id: fc.uuid(),
    status: fc.constant<OrderStatus>('delivered'),
});

const nonDeliveredOrderArb = fc.record({
    id: fc.uuid(),
    buyer_id: fc.uuid(),
    seller_id: fc.uuid(),
    status: fc.constantFrom<OrderStatus>('pending_payment', 'paid', 'shipped', 'cancelled'),
});

const validCommentArb = fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0);
const validRatingArb = fc.integer({ min: 1, max: 5 });

// ---------------------------------------------------------------------------
// Property 20: Review Uniqueness — only one review per order
// ---------------------------------------------------------------------------

describe('Review Uniqueness (Property 20)', () => {
    it('Req 12.4: submitting a second review for the same order is rejected', () => {
        fc.assert(
            fc.property(
                deliveredOrderArb,
                validRatingArb,
                validCommentArb,
                (order, rating, comment) => {
                    const submission: ReviewSubmission = {
                        order_id: order.id,
                        reviewer_id: order.buyer_id,
                        rating,
                        comment,
                    };

                    // First submission succeeds
                    const first = submitReview(submission, order, []);
                    expect(first.success).toBe(true);

                    if (!first.success) return;

                    // Second submission with existing review should fail
                    const second = submitReview(submission, order, [first.review]);
                    expect(second.success).toBe(false);
                    if (!second.success) {
                        expect(second.status).toBe(409);
                    }
                }
            ),
            { numRuns: 1000 }
        );
    });

    it('Req 12.4: N concurrent review attempts result in at most one success', () => {
        fc.assert(
            fc.property(
                deliveredOrderArb,
                fc.array(
                    fc.record({ rating: validRatingArb, comment: validCommentArb }),
                    { minLength: 2, maxLength: 5 }
                ),
                (order, attempts) => {
                    const reviews: Review[] = [];
                    let successCount = 0;

                    for (const attempt of attempts) {
                        const submission: ReviewSubmission = {
                            order_id: order.id,
                            reviewer_id: order.buyer_id,
                            rating: attempt.rating,
                            comment: attempt.comment,
                        };
                        const result = submitReview(submission, order, reviews);
                        if (result.success) {
                            successCount++;
                            reviews.push(result.review);
                        }
                    }

                    expect(successCount).toBeLessThanOrEqual(1);
                }
            ),
            { numRuns: 1000 }
        );
    });
});

// ---------------------------------------------------------------------------
// Reviewer must be the buyer (Requirement 12.2)
// ---------------------------------------------------------------------------

describe('Reviewer must be the buyer (Req 12.2)', () => {
    it('non-buyer cannot submit a review', () => {
        fc.assert(
            fc.property(
                deliveredOrderArb,
                fc.uuid(),
                validRatingArb,
                validCommentArb,
                (order, nonBuyerId, rating, comment) => {
                    fc.pre(nonBuyerId !== order.buyer_id);

                    const submission: ReviewSubmission = {
                        order_id: order.id,
                        reviewer_id: nonBuyerId,
                        rating,
                        comment,
                    };

                    const result = submitReview(submission, order, []);
                    expect(result.success).toBe(false);
                    if (!result.success) {
                        expect(result.status).toBe(403);
                    }
                }
            ),
            { numRuns: 1000 }
        );
    });

    it('buyer can always submit a review for a delivered order', () => {
        fc.assert(
            fc.property(
                deliveredOrderArb,
                validRatingArb,
                validCommentArb,
                (order, rating, comment) => {
                    const submission: ReviewSubmission = {
                        order_id: order.id,
                        reviewer_id: order.buyer_id,
                        rating,
                        comment,
                    };

                    const result = submitReview(submission, order, []);
                    expect(result.success).toBe(true);
                }
            ),
            { numRuns: 1000 }
        );
    });
});

// ---------------------------------------------------------------------------
// Order must be delivered (Requirement 12.1)
// ---------------------------------------------------------------------------

describe('Order must be delivered before review (Req 12.1)', () => {
    it('review submission fails for non-delivered orders', () => {
        fc.assert(
            fc.property(
                nonDeliveredOrderArb,
                validRatingArb,
                validCommentArb,
                (order, rating, comment) => {
                    const submission: ReviewSubmission = {
                        order_id: order.id,
                        reviewer_id: order.buyer_id,
                        rating,
                        comment,
                    };

                    const result = submitReview(submission, order, []);
                    expect(result.success).toBe(false);
                    if (!result.success) {
                        expect(result.status).toBe(422);
                    }
                }
            ),
            { numRuns: 1000 }
        );
    });

    it('review submission succeeds only for delivered orders', () => {
        fc.assert(
            fc.property(
                deliveredOrderArb,
                validRatingArb,
                validCommentArb,
                (order, rating, comment) => {
                    const submission: ReviewSubmission = {
                        order_id: order.id,
                        reviewer_id: order.buyer_id,
                        rating,
                        comment,
                    };

                    const result = submitReview(submission, order, []);
                    expect(result.success).toBe(true);
                    if (result.success) {
                        expect(result.review.reviewer_id).toBe(order.buyer_id);
                        expect(result.review.reviewee_id).toBe(order.seller_id);
                        expect(result.review.rating).toBe(rating);
                    }
                }
            ),
            { numRuns: 1000 }
        );
    });
});
