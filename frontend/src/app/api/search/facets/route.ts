/**
 * API Route: /api/search/facets
 * Requirements: Faceted search
 */

import { NextRequest, NextResponse } from 'next/server';
import { MeiliSearch } from 'meilisearch';

const meiliClient = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_API_KEY || '',
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const query = searchParams.get('q') || '';
    const index = meiliClient.index('listings');

    const result = await index.search(query, {
      filter: 'status = "active"',
      facets: ['category_id', 'condition_score', 'location.state'],
      limit: 0,
    });

    const dist = result.facetDistribution || {};

    const priceRangeDefs = [
      { label: 'Under ₹200', min: 0, max: 199 },
      { label: '₹200 – ₹500', min: 200, max: 500 },
      { label: '₹500 – ₹1000', min: 501, max: 1000 },
      { label: '₹1000 – ₹2000', min: 1001, max: 2000 },
      { label: 'Over ₹2000', min: 2001, max: 999999 },
    ];

    const priceRanges = await Promise.all(
      priceRangeDefs.map(async (range) => {
        const r = await index.search(query, {
          filter: `status = "active" AND final_price >= ${range.min} AND final_price <= ${range.max}`,
          limit: 0,
        });
        return { ...range, count: r.estimatedTotalHits ?? 0 };
      })
    );

    const facets = {
      categories: (dist['category_id'] as Record<string, number>) || {},
      conditionScores: (dist['condition_score'] as Record<string, number>) || {},
      states: (dist['location.state'] as Record<string, number>) || {},
      priceRanges,
    };

    return NextResponse.json({ success: true, facets, data: facets });
  } catch (error) {
    console.error('Error in GET /api/search/facets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
