'use client';

/**
 * EcoImpactBadge Component
 *
 * Compact badge showing a user's eco contribution.
 * Designed for use on profile pages and dashboards.
 *
 * Requirement: 10.7
 */

import React, { useEffect, useState } from 'react';
import { EcoImpactDisplay } from './EcoImpactDisplay';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EcoImpactBadgeProps {
    userId: string;
    /** Pre-fetched impact data (skips API call if provided) */
    impact?: {
        books_sold: number;
        books_bought: number;
        trees_saved: number;
        water_saved_liters: number;
        co2_reduced_kg: number;
    };
    /** Show expanded view with all metrics */
    expanded?: boolean;
    className?: string;
}

// ─── Leaf icon ────────────────────────────────────────────────────────────────

function LeafBadgeIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4"
            aria-hidden="true"
        >
            <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 0-2 2-4 2-4-4 0-6 2-6 2 0-2 2-4 2-4-4 0-6 2-6 2 0-2 2-4 2-4z" />
        </svg>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * EcoImpactBadge
 *
 * Fetches (or uses pre-fetched) user eco impact and renders either:
 * - A compact inline badge showing total books reused + trees saved
 * - An expanded card with all three metrics via EcoImpactDisplay
 */
export function EcoImpactBadge({
    userId,
    impact: propImpact,
    expanded = false,
    className = '',
}: EcoImpactBadgeProps) {
    const [impact, setImpact] = useState(propImpact ?? null);
    const [loading, setLoading] = useState(!propImpact);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (propImpact) {
            setImpact(propImpact);
            setLoading(false);
            return;
        }

        let cancelled = false;

        async function fetchImpact() {
            try {
                const res = await fetch(`/api/impact/user/${userId}`);
                if (!res.ok) throw new Error('Failed to fetch eco impact');
                const json = await res.json();
                if (!cancelled) setImpact(json.data);
            } catch (err) {
                if (!cancelled) setError('Could not load eco impact');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchImpact();
        return () => { cancelled = true; };
    }, [userId, propImpact]);

    if (loading) {
        return (
            <div className={`inline-flex items-center gap-1 text-xs text-gray-400 ${className}`}>
                <span className="animate-pulse">Loading eco impact…</span>
            </div>
        );
    }

    if (error || !impact) {
        return null;
    }

    const totalReused = impact.books_sold + impact.books_bought;

    if (!expanded) {
        // Compact badge
        return (
            <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-medium ${className}`}
                title={`Trees saved: ${impact.trees_saved.toFixed(2)} | Water saved: ${impact.water_saved_liters.toFixed(2)} L | CO₂ reduced: ${impact.co2_reduced_kg.toFixed(2)} kg`}
            >
                <LeafBadgeIcon />
                <span>{totalReused} book{totalReused !== 1 ? 's' : ''} reused</span>
                <span className="text-green-500">·</span>
                <span>{impact.trees_saved.toFixed(2)} trees saved</span>
            </div>
        );
    }

    // Expanded card
    return (
        <div className={`rounded-xl border border-green-200 bg-green-50 p-4 ${className}`}>
            <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-full bg-green-100 text-green-600">
                    <LeafBadgeIcon />
                </div>
                <div>
                    <p className="text-sm font-semibold text-green-800">Your Eco Impact</p>
                    <p className="text-xs text-green-600">
                        {totalReused} book{totalReused !== 1 ? 's' : ''} reused
                        {impact.books_sold > 0 && ` (${impact.books_sold} sold`}
                        {impact.books_bought > 0 && impact.books_sold > 0 && `, ${impact.books_bought} bought)`}
                        {impact.books_bought > 0 && impact.books_sold === 0 && ` (${impact.books_bought} bought)`}
                    </p>
                </div>
            </div>
            <EcoImpactDisplay
                impact={{
                    trees_saved: impact.trees_saved,
                    water_saved_liters: impact.water_saved_liters,
                    co2_reduced_kg: impact.co2_reduced_kg,
                }}
                compact
            />
        </div>
    );
}

export default EcoImpactBadge;
