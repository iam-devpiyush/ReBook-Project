/**
 * API Route: /api/search/facets
 *
 * GET: Return facets (categories, condition scores, states, price ranges) for a query
 *
 * Requirements: Faceted search
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSearchFacets } from '@/services/search.service';

/**
 * GET /api/search/facets
 *
 * Query params:
 *   q - search query string (default "")
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const query = searchParams.get('q') || '';

    const facets = await getSearchFacets(query);

    return NextResponse.json({
      success: true,
      data: facets,
    });
  } catch (error) {
    console.error('Error in GET /api/search/facets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
