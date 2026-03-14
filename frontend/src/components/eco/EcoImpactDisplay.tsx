'use client';

/**
 * EcoImpactDisplay Component
 *
 * Displays environmental impact metrics: trees saved, water saved, CO₂ reduced.
 * Shows visual indicators (icons, progress bars) and formats numbers to 2 dp.
 *
 * Requirement: 10.8
 */

import React from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EcoImpactData {
    trees_saved: number;
    water_saved_liters: number;
    co2_reduced_kg: number;
}

export interface EcoImpactDisplayProps {
    impact: EcoImpactData;
    /** Optional max values for progress bars (defaults to sensible values) */
    maxValues?: {
        trees?: number;
        water?: number;
        co2?: number;
    };
    /** Show compact layout (no progress bars) */
    compact?: boolean;
    className?: string;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function TreeIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-6 h-6"
            aria-hidden="true"
        >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17H9v2h6v-2h-1v-2.26C15.81 13.47 17 11.38 17 9c0-3.87-3.13-7-5-7zm0 2c2.76 0 5 2.24 5 5s-2.24 5-5 5-5-2.24-5-5 2.24-5 5-5z" />
            <rect x="11" y="17" width="2" height="5" />
        </svg>
    );
}

function WaterDropIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-6 h-6"
            aria-hidden="true"
        >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
            <path d="M12 2L6 10h12L12 2z" />
        </svg>
    );
}

function LeafIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-6 h-6"
            aria-hidden="true"
        >
            <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 0-2 2-4 2-4-4 0-6 2-6 2 0-2 2-4 2-4-4 0-6 2-6 2 0-2 2-4 2-4z" />
        </svg>
    );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
    return (
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
            <div
                className={`h-2 rounded-full transition-all duration-500 ${color}`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
    icon,
    iconBg,
    label,
    value,
    unit,
    barColor,
    barValue,
    barMax,
    compact,
}: {
    icon: React.ReactNode;
    iconBg: string;
    label: string;
    value: number;
    unit: string;
    barColor: string;
    barValue: number;
    barMax: number;
    compact?: boolean;
}) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${iconBg} flex-shrink-0`}>{icon}</div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
                    <p className="text-lg font-bold text-gray-900">
                        {value.toFixed(2)}{' '}
                        <span className="text-sm font-normal text-gray-500">{unit}</span>
                    </p>
                </div>
            </div>
            {!compact && (
                <ProgressBar value={barValue} max={barMax} color={barColor} />
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * EcoImpactDisplay
 *
 * Renders trees saved, water saved, and CO₂ reduced with icons and optional
 * progress bars. All numbers are formatted to 2 decimal places.
 */
export function EcoImpactDisplay({
    impact,
    maxValues,
    compact = false,
    className = '',
}: EcoImpactDisplayProps) {
    const maxTrees = maxValues?.trees ?? Math.max(impact.trees_saved * 2, 10);
    const maxWater = maxValues?.water ?? Math.max(impact.water_saved_liters * 2, 100);
    const maxCO2 = maxValues?.co2 ?? Math.max(impact.co2_reduced_kg * 2, 10);

    return (
        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 ${className}`}>
            <MetricCard
                icon={<TreeIcon />}
                iconBg="bg-green-100 text-green-600"
                label="Trees Saved"
                value={impact.trees_saved}
                unit="trees"
                barColor="bg-green-500"
                barValue={impact.trees_saved}
                barMax={maxTrees}
                compact={compact}
            />
            <MetricCard
                icon={<WaterDropIcon />}
                iconBg="bg-blue-100 text-blue-600"
                label="Water Saved"
                value={impact.water_saved_liters}
                unit="liters"
                barColor="bg-blue-500"
                barValue={impact.water_saved_liters}
                barMax={maxWater}
                compact={compact}
            />
            <MetricCard
                icon={<LeafIcon />}
                iconBg="bg-emerald-100 text-emerald-600"
                label="CO₂ Reduced"
                value={impact.co2_reduced_kg}
                unit="kg"
                barColor="bg-emerald-500"
                barValue={impact.co2_reduced_kg}
                barMax={maxCO2}
                compact={compact}
            />
        </div>
    );
}

export default EcoImpactDisplay;
