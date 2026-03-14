/**
 * Property-Based Tests: Wishlist Uniqueness
 *
 * Property 49.2 — Wishlist Uniqueness
 * Validates: Requirement 13.2
 *
 * A user cannot add the same book to their wishlist more than once.
 * The (user_id, book_id) pair must be unique per wishlist.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure domain logic (mirrors API behaviour without DB calls)
// ---------------------------------------------------------------------------

interface WishlistEntry {
    id: string;
    user_id: string;
    book_id: string;
    created_at: string;
}

type AddResult =
    | { success: true; entry: WishlistEntry }
    | { success: false; reason: 'duplicate' | 'book_not_found' };

/**
 * Simulates the wishlist add operation with uniqueness enforcement.
 * Returns success only when (user_id, book_id) is not already present.
 */
function addToWishlist(
    wishlist: WishlistEntry[],
    userId: string,
    bookId: string,
    knownBookIds: string[]
): AddResult {
    // Book must exist
    if (!knownBookIds.includes(bookId)) {
        return { success: false, reason: 'book_not_found' };
    }

    // Requirement 13.2: Reject duplicate (user_id, book_id) pairs
    const isDuplicate = wishlist.some(
        (e) => e.user_id === userId && e.book_id === bookId
    );
    if (isDuplicate) {
        return { success: false, reason: 'duplicate' };
    }

    const entry: WishlistEntry = {
        id: `${userId}-${bookId}-${Date.now()}`,
        user_id: userId,
        book_id: bookId,
        created_at: new Date().toISOString(),
    };
    return { success: true, entry };
}

/**
 * Simulates removing a wishlist entry by ID.
 */
function removeFromWishlist(
    wishlist: WishlistEntry[],
    entryId: string,
    userId: string
): { success: boolean; reason?: string } {
    const entry = wishlist.find((e) => e.id === entryId);
    if (!entry) return { success: false, reason: 'not_found' };
    if (entry.user_id !== userId) return { success: false, reason: 'forbidden' };
    return { success: true };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const uuidArb = fc.uuid();

const wishlistEntryArb = fc.record({
    id: uuidArb,
    user_id: uuidArb,
    book_id: uuidArb,
    created_at: fc.constant(new Date().toISOString()),
});

// ---------------------------------------------------------------------------
// Property 49.2 — Wishlist Uniqueness (Requirement 13.2)
// ---------------------------------------------------------------------------

describe('Wishlist Uniqueness (Property 49.2)', () => {
    it('adding the same book twice for the same user returns duplicate error', () => {
        fc.assert(
            fc.property(uuidArb, uuidArb, (userId, bookId) => {
                const wishlist: WishlistEntry[] = [];
                const knownBooks = [bookId];

                // First add succeeds
                const first = addToWishlist(wishlist, userId, bookId, knownBooks);
                expect(first.success).toBe(true);
                if (first.success) wishlist.push(first.entry);

                // Second add with same (user_id, book_id) must fail
                const second = addToWishlist(wishlist, userId, bookId, knownBooks);
                expect(second.success).toBe(false);
                if (!second.success) {
                    expect(second.reason).toBe('duplicate');
                }
            }),
            { numRuns: 1000 }
        );
    });

    it('different users can each add the same book to their own wishlist', () => {
        fc.assert(
            fc.property(uuidArb, uuidArb, uuidArb, (user1, user2, bookId) => {
                fc.pre(user1 !== user2);
                const knownBooks = [bookId];

                const wishlist: WishlistEntry[] = [];

                const r1 = addToWishlist(wishlist, user1, bookId, knownBooks);
                expect(r1.success).toBe(true);
                if (r1.success) wishlist.push(r1.entry);

                const r2 = addToWishlist(wishlist, user2, bookId, knownBooks);
                expect(r2.success).toBe(true);
            }),
            { numRuns: 1000 }
        );
    });

    it('same user can add different books without conflict', () => {
        fc.assert(
            fc.property(uuidArb, uuidArb, uuidArb, (userId, book1, book2) => {
                fc.pre(book1 !== book2);
                const knownBooks = [book1, book2];
                const wishlist: WishlistEntry[] = [];

                const r1 = addToWishlist(wishlist, userId, book1, knownBooks);
                expect(r1.success).toBe(true);
                if (r1.success) wishlist.push(r1.entry);

                const r2 = addToWishlist(wishlist, userId, book2, knownBooks);
                expect(r2.success).toBe(true);
            }),
            { numRuns: 1000 }
        );
    });

    it('adding a non-existent book always fails', () => {
        fc.assert(
            fc.property(uuidArb, uuidArb, (userId, bookId) => {
                const result = addToWishlist([], userId, bookId, [] /* no known books */);
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.reason).toBe('book_not_found');
                }
            }),
            { numRuns: 1000 }
        );
    });

    it('after N unique books added, wishlist size equals N', () => {
        fc.assert(
            fc.property(
                uuidArb,
                fc.array(uuidArb, { minLength: 1, maxLength: 10 }),
                (userId, bookIds) => {
                    const uniqueBookIds = [...new Set(bookIds)];
                    const wishlist: WishlistEntry[] = [];

                    for (const bookId of uniqueBookIds) {
                        const result = addToWishlist(wishlist, userId, bookId, uniqueBookIds);
                        if (result.success) wishlist.push(result.entry);
                    }

                    expect(wishlist.length).toBe(uniqueBookIds.length);
                }
            ),
            { numRuns: 1000 }
        );
    });

    it('removing an entry allows re-adding the same book', () => {
        fc.assert(
            fc.property(uuidArb, uuidArb, (userId, bookId) => {
                const knownBooks = [bookId];
                const wishlist: WishlistEntry[] = [];

                // Add
                const add1 = addToWishlist(wishlist, userId, bookId, knownBooks);
                expect(add1.success).toBe(true);
                if (!add1.success) return;
                wishlist.push(add1.entry);

                // Remove
                const remove = removeFromWishlist(wishlist, add1.entry.id, userId);
                expect(remove.success).toBe(true);
                const idx = wishlist.findIndex((e) => e.id === add1.entry.id);
                if (idx !== -1) wishlist.splice(idx, 1);

                // Re-add should succeed now
                const add2 = addToWishlist(wishlist, userId, bookId, knownBooks);
                expect(add2.success).toBe(true);
            }),
            { numRuns: 1000 }
        );
    });

    it('only the owner can remove a wishlist entry', () => {
        fc.assert(
            fc.property(uuidArb, uuidArb, uuidArb, (owner, otherUser, bookId) => {
                fc.pre(owner !== otherUser);
                const knownBooks = [bookId];
                const wishlist: WishlistEntry[] = [];

                const add = addToWishlist(wishlist, owner, bookId, knownBooks);
                expect(add.success).toBe(true);
                if (!add.success) return;
                wishlist.push(add.entry);

                // Other user cannot remove
                const removeByOther = removeFromWishlist(wishlist, add.entry.id, otherUser);
                expect(removeByOther.success).toBe(false);
                expect(removeByOther.reason).toBe('forbidden');

                // Owner can remove
                const removeByOwner = removeFromWishlist(wishlist, add.entry.id, owner);
                expect(removeByOwner.success).toBe(true);
            }),
            { numRuns: 1000 }
        );
    });
});
