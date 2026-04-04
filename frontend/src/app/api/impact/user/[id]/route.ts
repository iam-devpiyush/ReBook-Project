export const dynamic = 'force-dynamic';
/**
 * API Route: GET /api/impact/user/[id]
 *
 * Returns a user's personal environmental impact contribution.
 * Requirement: 10.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserImpact } from '@/services/environmental-impact.service';

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        if (!id) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const result = await getUserImpact(id);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to fetch user impact' },
                { status: result.error === 'User not found' ? 404 : 500 }
            );
        }

        return NextResponse.json({ success: true, data: result.impact });
    } catch (error) {
        console.error('Error in GET /api/impact/user/[id]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
