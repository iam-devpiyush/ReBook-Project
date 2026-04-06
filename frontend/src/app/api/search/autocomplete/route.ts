export const dynamic = 'force-dynamic';
/**
 * API Route: /api/search/autocomplete
 * Requirements: Search autocomplete
 */

import { NextRequest, NextResponse } from 'next/server';
import { MeiliSearch } from 'meilisearch';

const meiliClient = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_ADMIN_API_KEY || process.env.MEILISEARCH_API_KEY || '',
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const q = searchParams.get('q');
    if (!q || q.trim() === '') {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const index = meiliClient.index('listings');

    const result = await index.search(q.trim(), {
      filter: 'status = "active"',
      limit,
      attributesToRetrieve: ['title', 'author'],
    });

    const seen = new Set<string>();
    const suggestions: string[] = [];
    for (const hit of result.hits as any[]) {
      if (hit.title && !seen.has(hit.title)) { seen.add(hit.title); suggestions.push(hit.title); }
      if (hit.author && !seen.has(hit.author)) { seen.add(hit.author); suggestions.push(hit.author); }
      if (suggestions.length >= limit) break;
    }

    return NextResponse.json({ success: true, suggestions, data: suggestions });
  } catch (error) {
    console.error('Error in GET /api/search/autocomplete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
