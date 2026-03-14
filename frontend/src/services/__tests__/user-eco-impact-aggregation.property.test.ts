/**
 * Property-Based Tests: User Eco Impact Aggregation
 *
 * Property: User Eco Impact Aggregation
 * Validates: Requirements 10.4, 10.5
 *
 * Verifies that user eco impact is correctly aggregated when books are
 * sold or purchased, and that the formulas are applied to the combined total.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Pure domain logic (mirrors environmental-impact.service) ─────────────────

interface EcoImpact {
    trees_saved: number;
    water_saved_liters: number;
    co2_reduced_kg: number;
}

interface UserEcoImpact extends EcoImpact {
    books_sold: number;
    books_bought: number;
}

function calculateEnvironmentalImpact(booksReused: number): EcoImpact {
    return {
        trees_saved: Number((booksReused / 30).toFixed(2)),
        water_saved_liters: Number((booksReused * 50).toFixed(2)),
        co2_reduced_kg: Number((booksReused * 2.5).toFixed(2)),
    };
}

function aggregateUserEcoImpact(
    current: UserEcoImpact,
    booksSoldDelta: number,
    booksBoughtDelta: number
): UserEcoImpact {
    const newBooksSold = current.books_sold + booksSoldDelta;
    const newBooksBought = current.books_bought + booksBoughtDelta;
    const totalBooksReused = newBooksSold + newBooksBought;
    const impact = calculateEnvironmentalImpact(totalBooksReused);
    return {
        books_sold: newBooksSold,
        books_bought: newBooksBought,
        ...impact,
    };
}

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const nonNegativeInt = fc.integer({ min: 0, max: 10_000 });
const positiveInt = fc.integer({ min: 1, max: 10_000 });

const userEcoImpactArb = fc.record({
    books_sold: nonNegativeInt,
    books_bought: nonNegativeInt,
    trees_saved: fc.float({ min: 0, max: 1000 }),
    water_saved_liters: fc.float({ min: 0, max: 500_000 }),
    co2_reduced_kg: fc.float({ min: 0, max: 25_000 }),
});

// ─── Properties ───────────────────────────────────────────────────────────────

describe('User Eco Impact Aggregation (Property 50.4)', () => {
    /**
     * Validates: Requirement 10.4
     * When a book is sold, the seller's books_sold count increases by 1
     * and eco metrics are recalculated.
     */
    it('selling a book increments books_sold and recalculates eco metrics', () => {
        fc.assert(
            fc.property(userEcoImpactArb, (current) => {
                const updated = aggregateUserEcoImpact(current, 1, 0);
                expect(updated.books_sold).toBe(current.books_sold + 1);
                expect(updated.books_bought).toBe(current.books_bought);

                const totalReused = updated.books_sold + updated.books_bought;
                const expected = calculateEnvironmentalImpact(totalReused);
                expect(updated.trees_saved).toBe(expected.trees_saved);
                expect(updated.water_saved_liters).toBe(expected.water_saved_liters);
                expect(updated.co2_reduced_kg).toBe(expected.co2_reduced_kg);
            }),
            { numRuns: 1000 }
        );
    });

    /**
     * Validates: Requirement 10.5
     * When a book is purchased, the buyer's books_bought count increases by 1
     * and eco metrics are recalculated.
     */
    it('buying a book increments books_bought and recalculates eco metrics', () => {
        fc.assert(
            fc.property(userEcoImpactArb, (current) => {
                const updated = aggregateUserEcoImpact(current, 0, 1);
                expect(updated.books_bought).toBe(current.books_bought + 1);
                expect(updated.books_sold).toBe(current.books_sold);

                const totalReused = updated.books_sold + updated.books_bought;
                const expected = calculateEnvironmentalImpact(totalReused);
                expect(updated.trees_saved).toBe(expected.trees_saved);
                expect(updated.water_saved_liters).toBe(expected.water_saved_liters);
                expect(updated.co2_reduced_kg).toBe(expected.co2_reduced_kg);
            }),
            { numRuns: 1000 }
        );
    });

    /**
     * Eco metrics are always based on total books reused (sold + bought)
     */
    it('eco metrics always reflect total books reused (sold + bought)', () => {
        fc.assert(
            fc.property(userEcoImpactArb, nonNegativeInt, nonNegativeInt, (current, soldDelta, boughtDelta) => {
                const updated = aggregateUserEcoImpact(current, soldDelta, boughtDelta);
                const totalReused = updated.books_sold + updated.books_bought;
                const expected = calculateEnvironmentalImpact(totalReused);
                expect(updated.trees_saved).toBe(expected.trees_saved);
                expect(updated.water_saved_liters).toBe(expected.water_saved_liters);
                expect(updated.co2_reduced_kg).toBe(expected.co2_reduced_kg);
            }),
            { numRuns: 1000 }
        );
    });

    /**
     * Aggregation is additive: multiple updates accumulate correctly
     */
    it('multiple updates accumulate books_sold and books_bought correctly', () => {
        fc.assert(
            fc.property(
                userEcoImpactArb,
                positiveInt,
                positiveInt,
                (initial, n1, n2) => {
                    const after1 = aggregateUserEcoImpact(initial, n1, 0);
                    const after2 = aggregateUserEcoImpact(after1, n2, 0);
                    expect(after2.books_sold).toBe(initial.books_sold + n1 + n2);
                }
            ),
            { numRuns: 1000 }
        );
    });

    /**
     * Eco metrics are non-negative for any valid input
     */
    it('eco metrics are always non-negative', () => {
        fc.assert(
            fc.property(userEcoImpactArb, nonNegativeInt, nonNegativeInt, (current, soldDelta, boughtDelta) => {
                const updated = aggregateUserEcoImpact(current, soldDelta, boughtDelta);
                expect(updated.trees_saved).toBeGreaterThanOrEqual(0);
                expect(updated.water_saved_liters).toBeGreaterThanOrEqual(0);
                expect(updated.co2_reduced_kg).toBeGreaterThanOrEqual(0);
            }),
            { numRuns: 1000 }
        );
    });
});
