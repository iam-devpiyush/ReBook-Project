/**
 * Property-Based Tests: Environmental Impact Formula
 *
 * Property: Environmental Impact Formula
 * Validates: Requirements 10.1-10.3
 *
 * Verifies that the environmental impact formulas hold for arbitrary inputs:
 *   trees_saved = books_reused / 30
 *   water_saved_liters = books_reused × 50
 *   co2_reduced_kg = books_reused × 2.5
 *
 * All values must be rounded to 2 decimal places (Requirement 10.8).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
    calculateTreesSaved,
    calculateWaterSaved,
    calculateCO2Reduced,
    calculateEnvironmentalImpact,
} from '../../services/environmental-impact.service';

// ─── Arbitraries ──────────────────────────────────────────────────────────────

/** Non-negative integer representing books reused */
const booksReusedArb = fc.integer({ min: 0, max: 1_000_000 });

/** Positive integer (at least 1 book reused) */
const positiveBooksArb = fc.integer({ min: 1, max: 1_000_000 });

// ─── Helper ───────────────────────────────────────────────────────────────────

function roundTo2(n: number): number {
    return Number(n.toFixed(2));
}

// ─── Property: Environmental Impact Formula (10.1-10.3) ──────────────────────

describe('Environmental Impact Formula (Property 50.2)', () => {
    /**
     * Validates: Requirement 10.1
     * trees_saved = books_reused / 30
     */
    it('trees_saved equals books_reused divided by 30, rounded to 2 dp', () => {
        fc.assert(
            fc.property(booksReusedArb, (books) => {
                const result = calculateTreesSaved(books);
                const expected = roundTo2(books / 30);
                expect(result).toBe(expected);
            })
        );
    });

    /**
     * Validates: Requirement 10.2
     * water_saved_liters = books_reused × 50
     */
    it('water_saved_liters equals books_reused multiplied by 50, rounded to 2 dp', () => {
        fc.assert(
            fc.property(booksReusedArb, (books) => {
                const result = calculateWaterSaved(books);
                const expected = roundTo2(books * 50);
                expect(result).toBe(expected);
            })
        );
    });

    /**
     * Validates: Requirement 10.3
     * co2_reduced_kg = books_reused × 2.5
     */
    it('co2_reduced_kg equals books_reused multiplied by 2.5, rounded to 2 dp', () => {
        fc.assert(
            fc.property(booksReusedArb, (books) => {
                const result = calculateCO2Reduced(books);
                const expected = roundTo2(books * 2.5);
                expect(result).toBe(expected);
            })
        );
    });

    /**
     * Validates: Requirements 10.1-10.3, 10.8
     * calculateEnvironmentalImpact returns all three metrics correctly
     */
    it('calculateEnvironmentalImpact returns all three metrics with correct formulas', () => {
        fc.assert(
            fc.property(booksReusedArb, (books) => {
                const impact = calculateEnvironmentalImpact(books);
                expect(impact.trees_saved).toBe(roundTo2(books / 30));
                expect(impact.water_saved_liters).toBe(roundTo2(books * 50));
                expect(impact.co2_reduced_kg).toBe(roundTo2(books * 2.5));
            })
        );
    });

    /**
     * Validates: Requirement 10.8
     * All values are rounded to exactly 2 decimal places
     */
    it('all values have at most 2 decimal places', () => {
        fc.assert(
            fc.property(booksReusedArb, (books) => {
                const impact = calculateEnvironmentalImpact(books);
                const hasAtMost2Dp = (n: number) => {
                    const str = n.toString();
                    const dotIndex = str.indexOf('.');
                    return dotIndex === -1 || str.length - dotIndex - 1 <= 2;
                };
                expect(hasAtMost2Dp(impact.trees_saved)).toBe(true);
                expect(hasAtMost2Dp(impact.water_saved_liters)).toBe(true);
                expect(hasAtMost2Dp(impact.co2_reduced_kg)).toBe(true);
            })
        );
    });

    /**
     * Monotonicity: more books reused → more impact
     */
    it('impact is monotonically non-decreasing with more books reused', () => {
        fc.assert(
            fc.property(booksReusedArb, positiveBooksArb, (base, extra) => {
                const impactBase = calculateEnvironmentalImpact(base);
                const impactMore = calculateEnvironmentalImpact(base + extra);
                expect(impactMore.trees_saved).toBeGreaterThanOrEqual(impactBase.trees_saved);
                expect(impactMore.water_saved_liters).toBeGreaterThanOrEqual(impactBase.water_saved_liters);
                expect(impactMore.co2_reduced_kg).toBeGreaterThanOrEqual(impactBase.co2_reduced_kg);
            })
        );
    });

    /**
     * Zero books → zero impact
     */
    it('zero books reused results in zero impact', () => {
        const impact = calculateEnvironmentalImpact(0);
        expect(impact.trees_saved).toBe(0);
        expect(impact.water_saved_liters).toBe(0);
        expect(impact.co2_reduced_kg).toBe(0);
    });
});
