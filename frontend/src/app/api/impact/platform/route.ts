export const dynamic = 'force-dynamic';
/**
 * API Route: GET /api/impact/platform
 *
 * Returns platform-wide environmental impact metrics.
 * Requirement: 10.6
 */

import { NextResponse } from 'next/server';
import { getPlatformImpact } from '@/services/environmental-impact.service';

export async function GET() {
    try {
        const result = await getPlatformImpact();

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to fetch platform impact' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data: result.impact });
    } catch (error) {
        console.error('Error in GET /api/impact/platform:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
