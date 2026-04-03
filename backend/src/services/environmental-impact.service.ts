/**
 * Environmental Impact Service
 *
 * Calculates and tracks environmental impact metrics for book reuse.
 *
 * Formulas (Requirements 10.1-10.3):
 *   trees_saved = books_reused / 30
 *   water_saved_liters = books_reused × 50
 *   co2_reduced_kg = books_reused × 2.5
 *
 * All values are rounded to 2 decimal places (Requirement 10.8).
 */

import { supabase } from '../lib/supabase';

// Use console for logging so this service can be imported by Next.js API routes
// without requiring the winston package in the frontend bundle
const logger = {
    info: (msg: string, ...args: unknown[]) => console.info('[eco-impact]', msg, ...args),
    error: (msg: string, ...args: unknown[]) => console.error('[eco-impact]', msg, ...args),
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EcoImpact {
    trees_saved: number;
    water_saved_liters: number;
    co2_reduced_kg: number;
}

export interface UserEcoImpact extends EcoImpact {
    books_sold: number;
    books_bought: number;
}

export interface PlatformEcoImpact extends EcoImpact {
    total_books_reused: number;
}

// ─── Core calculation functions ───────────────────────────────────────────────

/**
 * Calculate trees saved from books reused.
 * Formula: trees_saved = books_reused / 30
 * Requirement: 10.1, 10.8
 */
export function calculateTreesSaved(booksReused: number): number {
    return Number((booksReused / 30).toFixed(2));
}

/**
 * Calculate water saved (liters) from books reused.
 * Formula: water_saved_liters = books_reused × 50
 * Requirement: 10.2, 10.8
 */
export function calculateWaterSaved(booksReused: number): number {
    return Number((booksReused * 50).toFixed(2));
}

/**
 * Calculate CO₂ reduced (kg) from books reused.
 * Formula: co2_reduced_kg = books_reused × 2.5
 * Requirement: 10.3, 10.8
 */
export function calculateCO2Reduced(booksReused: number): number {
    return Number((booksReused * 2.5).toFixed(2));
}

/**
 * Calculate all environmental impact metrics for a given number of books reused.
 * Requirements: 10.1-10.3, 10.8
 */
export function calculateEnvironmentalImpact(booksReused: number): EcoImpact {
    return {
        trees_saved: calculateTreesSaved(booksReused),
        water_saved_liters: calculateWaterSaved(booksReused),
        co2_reduced_kg: calculateCO2Reduced(booksReused),
    };
}

// ─── User impact update functions ─────────────────────────────────────────────

/**
 * Update a user's eco_impact metrics in Supabase.
 *
 * Called when a book is sold (seller) or purchased (buyer).
 * Requirements: 10.4, 10.5
 */
export async function updateUserEcoImpact(
    userId: string,
    booksSoldDelta: number,
    booksBoughtDelta: number
): Promise<{ success: boolean; ecoImpact?: UserEcoImpact; error?: string }> {
    try {
        // Fetch current eco_impact
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('eco_impact')
            .eq('id', userId)
            .single();

        if (fetchError || !user) {
            logger.error('Failed to fetch user for eco impact update:', fetchError);
            return { success: false, error: 'User not found' };
        }

        const current = (user.eco_impact as any) || {
            books_sold: 0,
            books_bought: 0,
            trees_saved: 0,
            water_saved_liters: 0,
            co2_reduced_kg: 0,
        };

        const newBooksSold = (current.books_sold || 0) + booksSoldDelta;
        const newBooksBought = (current.books_bought || 0) + booksBoughtDelta;
        const totalBooksReused = newBooksSold + newBooksBought;

        const impact = calculateEnvironmentalImpact(totalBooksReused);

        const updatedEcoImpact: UserEcoImpact = {
            books_sold: newBooksSold,
            books_bought: newBooksBought,
            ...impact,
        };

        const { error: updateError } = await supabase
            .from('users')
            .update({ eco_impact: updatedEcoImpact as any, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (updateError) {
            logger.error('Failed to update user eco impact:', updateError);
            return { success: false, error: 'Failed to update eco impact' };
        }

        logger.info(`Updated eco impact for user ${userId}`);
        return { success: true, ecoImpact: updatedEcoImpact };
    } catch (error) {
        logger.error('Error updating user eco impact:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Update platform stats with environmental metrics after a book is sold.
 * Requirement: 10.6
 */
export async function updatePlatformEcoStats(): Promise<{ success: boolean; error?: string }> {
    try {
        // Count total books sold (reused)
        const { count: totalBooksSold, error: countError } = await supabase
            .from('listings')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'sold');

        if (countError) {
            logger.error('Failed to count sold books for eco stats:', countError);
            return { success: false, error: 'Failed to count sold books' };
        }

        const booksReused = totalBooksSold || 0;
        const impact = calculateEnvironmentalImpact(booksReused);
        const today = new Date().toISOString().split('T')[0];

        const { error: upsertError } = await supabase
            .from('platform_stats')
            .upsert(
                {
                    date: today,
                    trees_saved: impact.trees_saved,
                    water_saved_liters: impact.water_saved_liters,
                    co2_reduced_kg: impact.co2_reduced_kg,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'date' }
            );

        if (upsertError) {
            logger.error('Failed to update platform eco stats:', upsertError);
            return { success: false, error: 'Failed to update platform eco stats' };
        }

        logger.info('Updated platform eco stats');
        return { success: true };
    } catch (error) {
        logger.error('Error updating platform eco stats:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

// ─── Read functions ───────────────────────────────────────────────────────────

/**
 * Get platform-wide environmental impact.
 * Requirement: 10.6
 */
export async function getPlatformImpact(): Promise<{
    success: boolean;
    impact?: PlatformEcoImpact;
    error?: string;
}> {
    try {
        const { count: totalBooksSold, error: countError } = await supabase
            .from('listings')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'sold');

        if (countError) {
            logger.error('Failed to count sold books:', countError);
            return { success: false, error: 'Failed to fetch platform impact' };
        }

        const booksReused = totalBooksSold || 0;
        const impact = calculateEnvironmentalImpact(booksReused);

        return {
            success: true,
            impact: { total_books_reused: booksReused, ...impact },
        };
    } catch (error) {
        logger.error('Error fetching platform impact:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Get a user's personal environmental impact contribution.
 * Requirement: 10.7
 */
export async function getUserImpact(userId: string): Promise<{
    success: boolean;
    impact?: UserEcoImpact;
    error?: string;
}> {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('eco_impact')
            .eq('id', userId)
            .single();

        if (error || !user) {
            logger.error('Failed to fetch user eco impact:', error);
            return { success: false, error: 'User not found' };
        }

        const eco = (user.eco_impact as any) || {
            books_sold: 0,
            books_bought: 0,
            trees_saved: 0,
            water_saved_liters: 0,
            co2_reduced_kg: 0,
        };

        const impact: UserEcoImpact = {
            books_sold: eco.books_sold || 0,
            books_bought: eco.books_bought || 0,
            trees_saved: Number((eco.trees_saved || 0).toFixed(2)),
            water_saved_liters: Number((eco.water_saved_liters || 0).toFixed(2)),
            co2_reduced_kg: Number((eco.co2_reduced_kg || 0).toFixed(2)),
        };

        return { success: true, impact };
    } catch (error) {
        logger.error('Error fetching user eco impact:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
