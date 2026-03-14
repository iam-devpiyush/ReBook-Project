/**
 * API Route: /api/search/autocomplete
 *
 * GET: Return autocomplete suggestions for a partial query
 *
 * Requirements: Search autocomplete
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAutocompleteSuggestions } from '@/services/search.service';

/**
 * GET /api/search/autocomplete
 *
 * Query params:
 *   q     - partial query string (required)
 *   limit - max suggestions to return (default 10, max 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const q = searchParams.get('q');
    if (!q || q.trim() === '') {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));

    const suggestions = await getAutocompleteSuggestions(q.trim(), limit);

    return NextResponse.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error('Error in GET /api/search/autocomplete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
